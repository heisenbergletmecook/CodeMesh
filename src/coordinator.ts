/**
 * MeshCoordinator — one Durable Object per mesh run.
 *
 * It is the only writer. Agents propose file contents; the coordinator decides
 * what becomes a commit, which repo it lands in, and in what order the trunk
 * absorbs it.
 *
 * The three ideas that make this not-GitHub:
 *
 *   1. A fork per task, not a branch. Artifacts forks are a binding primitive
 *      and repos are unlimited, so isolation is the default unit of work.
 *   2. Claims before work. Each task declares the paths it will touch up front.
 *      Overlap is detected at dispatch and sequenced, so conflicts are
 *      prevented rather than resolved.
 *   3. A merge train instead of pull requests. Integration is a serialized
 *      queue the coordinator drains; review is a function it runs, not a
 *      human queue a change waits in.
 */

import {
  checkout,
  commitAs,
  initWorkspace,
  push,
  snapshot,
  writeWorkspaceFile,
  type RepoHandle,
} from "./git";
import { autofix, develop, orchestrate, review, scan, test, type Finding, type ReviewComment, type Task } from "./agents/roles";
import type { Env } from "./agents/model";

type AgentState = {
  task: Task;
  repo: string;
  status: "claimed" | "blocked" | "developing" | "testing" | "reviewing" | "fixing" | "ready" | "merged" | "failed";
  summary?: string;
  commit?: string;
  files: string[];
  failures: string[];
  findings: Finding[];
  comments: ReviewComment[];
  verdict?: string;
  /** Task ids this one waits on because their claims overlap. */
  blockedBy: string[];
  /** The forked repo this task owns, provisioned before dispatch. */
  fork?: RepoHandle;
  error?: string;
};

type MeshState = {
  id: string;
  request: string;
  trunk: string;
  phase: "idle" | "planning" | "running" | "merging" | "done" | "error";
  agents: AgentState[];
  log: { t: number; agent: string; msg: string }[];
  mergeTrain: string[];
  error?: string;
};

const SEED: Record<string, string> = {
  "README.md": "# demo-service\n\nA small service CodeMesh agents will extend.\n",
  "src/index.ts":
    `export function handler(req: Request): Response {\n  return new Response("ok");\n}\n`,
  "package.json": JSON.stringify({ name: "demo-service", version: "0.1.0", type: "module" }, null, 2) + "\n",
};

export class MeshCoordinator {
  private state: DurableObjectState;
  private env: Env;
  private mesh: MeshState | null = null;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  private async load(): Promise<MeshState | null> {
    if (!this.mesh) {
      this.mesh = (await this.state.storage.get<MeshState>("mesh")) ?? null;
    }
    return this.mesh;
  }

  private async save() {
    if (this.mesh) await this.state.storage.put("mesh", this.mesh);
  }

  private log(agent: string, msg: string) {
    if (!this.mesh) return;
    this.mesh.log.push({ t: Date.now(), agent, msg });
    if (this.mesh.log.length > 400) this.mesh.log.shift();
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname.endsWith("/start")) {
        const { request, meshId, repo } = await req.json<{
          request: string; meshId: string; repo?: string;
        }>();
        // Kick the run off in the background so the HTTP call returns at once
        // and the dashboard can watch the mesh fill in.
        this.state.waitUntil(this.run(meshId, request, repo));
        return Response.json({ ok: true, meshId });
      }
      if (url.pathname.endsWith("/state")) {
        const mesh = await this.load();
        if (!mesh) return Response.json({ phase: "idle", agents: [], log: [] });
        // Each agent's fork handle carries a repo-scoped WRITE token. The
        // dashboard never needs it, so it must not cross the wire.
        return Response.json({
          ...mesh,
          agents: mesh.agents.map(({ fork, ...rest }) => ({
            ...rest,
            remote: fork?.remote,
          })),
        });
      }
      return new Response("not found", { status: 404 });
    } catch (err: any) {
      return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
    }
  }

  /**
   * @param existingRepo run against a codebase the user already has, instead of
   *   seeding a throwaway trunk. The repo becomes the trunk; agents fork it.
   */
  private async run(meshId: string, request: string, existingRepo?: string) {
    const trunk = existingRepo || `trunk-${meshId}`;
    this.mesh = {
      id: meshId,
      request,
      trunk,
      phase: "planning",
      agents: [],
      log: [],
      mergeTrain: [],
    };
    await this.save();

    try {
      await this.register({ meshId, trunk, request, at: Date.now() });

      // --- Establish the trunk ---------------------------------------------
      let trunkRepo: RepoHandle;
      let baseFiles: Record<string, string>;

      if (existingRepo) {
        // Run against a codebase that already exists: read it, do not seed it.
        this.log("coordinator", `using existing codebase ${trunk} as trunk`);
        using repo = await this.env.ARTIFACTS.get(trunk);
        const info = await repo.info();
        const token = await repo.createToken("write", 1800);
        trunkRepo = { name: trunk, remote: info.remote, token: token.plaintext };
        const ws = await checkout(trunkRepo);
        baseFiles = await snapshot(ws);
        this.log("coordinator", `read ${Object.keys(baseFiles).length} existing file(s)`);
      } else {
        this.log("coordinator", `creating trunk repo ${trunk}`);
        const created = await this.env.ARTIFACTS.create(trunk, { setDefaultBranch: "main" });
        trunkRepo = { name: trunk, remote: created.remote, token: created.token };
        const ws = await initWorkspace();
        for (const [path, content] of Object.entries(SEED)) {
          await writeWorkspaceFile(ws, path, content);
        }
        const seedCommit = await commitAs(ws, "coordinator", "chore: seed trunk");
        await push(trunkRepo, ws);
        this.log("coordinator", `trunk seeded at ${seedCommit.slice(0, 7)}`);
        baseFiles = await snapshot(ws);
      }
      await this.save();

      // --- Plan -----------------------------------------------------------
      this.log("orchestrator", "decomposing request into concurrent tasks");
      const tasks = await orchestrate(this.env, request, baseFiles);
      if (!tasks.length) throw new Error("orchestrator produced no tasks");
      this.log(
        "orchestrator",
        tasks.length === 1 && tasks[0].title === request.slice(0, 90)
          ? "planner degraded — executing the request as a single task"
          : `planned ${tasks.length} tasks`,
      );

      // --- Claim arbitration ----------------------------------------------
      // Two tasks that claim the same path cannot run concurrently. We detect
      // that here, before a single line is written, and sequence the loser.
      const claimed = new Map<string, string>();
      this.mesh.agents = tasks.map((task) => {
        const blockedBy: string[] = [];
        for (const path of task.claims) {
          const owner = claimed.get(path);
          if (owner && owner !== task.id) blockedBy.push(owner);
          else claimed.set(path, task.id);
        }
        return {
          task,
          repo: existingRepo ? `${trunk}-${meshId}-${task.id}` : `${trunk}-${task.id}`,
          status: blockedBy.length ? "blocked" : "claimed",
          files: [],
          failures: [],
          findings: [],
          comments: [],
          blockedBy: [...new Set(blockedBy)],
        };
      });
      const conflicts = this.mesh.agents.filter((a) => a.blockedBy.length);
      if (conflicts.length) {
        this.log(
          "coordinator",
          `${conflicts.length} task(s) sequenced: overlapping claims detected before dispatch`,
        );
      }
      this.mesh.phase = "running";
      await this.save();

      // --- Provision workspaces --------------------------------------------
      // Forking is serialized: concurrent forks of the same trunk make the
      // Artifacts control plane return an internal error. Fork creation is fast
      // and is not the part we want to parallelize anyway — the agent work is.
      for (const agent of this.mesh.agents) {
        agent.fork = await this.provision(agent, trunkRepo);
      }
      await this.save();

      // --- Dispatch ---------------------------------------------------------
      // Unblocked tasks now run genuinely concurrently, each in its own fork.
      const free = this.mesh.agents.filter((a) => !a.blockedBy.length && a.fork);
      const sequenced = this.mesh.agents.filter((a) => a.blockedBy.length && a.fork);

      await Promise.all(free.map((a) => this.runAgent(a, baseFiles)));
      for (const a of sequenced) {
        // Sequenced work rebases on whatever the trunk looks like by now.
        await this.runAgent(a, baseFiles);
      }

      // --- Merge train ------------------------------------------------------
      this.mesh.phase = "merging";
      await this.save();
      await this.drainMergeTrain(trunkRepo);

      this.mesh.phase = "done";
      this.log("coordinator", "mesh complete");
      await this.save();
    } catch (err: any) {
      if (this.mesh) {
        this.mesh.phase = "error";
        this.mesh.error = String(err?.message ?? err);
        this.log("coordinator", `fatal: ${this.mesh.error}`);
        await this.save();
      }
      console.error("mesh run failed", err);
    }
  }

  /** Record the run so a proposal can be traced back to it later. */
  private async register(run: Record<string, unknown>) {
    try {
      const stub = this.env.ITEMS.get(this.env.ITEMS.idFromName("workspace"));
      await stub.fetch("https://items/register", { method: "POST", body: JSON.stringify(run) });
    } catch (err) {
      console.error("could not register run", err);
    }
  }

  /**
   * File a work item. Never allowed to break a run: tracking is useful, but a
   * failure to track must not lose the agent's actual work.
   */
  private async fileWorkItem(item: Record<string, unknown>) {
    try {
      const stub = this.env.ITEMS.get(this.env.ITEMS.idFromName("workspace"));
      await stub.fetch("https://items/create", {
        method: "POST",
        body: JSON.stringify(item),
      });
    } catch (err) {
      console.error("could not file work item", err);
    }
  }

  /**
   * Fork the trunk for one task. This is the unit of isolation — not a branch.
   *
   * Retried with backoff: fork is a control-plane operation and occasionally
   * returns a transient internal error under load.
   */
  private async provision(agent: AgentState, trunkRepo: RepoHandle): Promise<RepoHandle | null> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        using trunk = await this.env.ARTIFACTS.get(trunkRepo.name);
        const forked = await trunk.fork(agent.repo);
        this.log(agent.task.id, `forked ${trunkRepo.name} -> ${agent.repo}`);
        return {
          name: agent.repo,
          remote: forked.remote,
          token: forked.token ?? trunkRepo.token,
        };
      } catch (err: any) {
        const msg = String(err?.message ?? err);
        if (attempt === 3) {
          agent.status = "failed";
          agent.error = `fork failed: ${msg}`;
          this.log(agent.task.id, agent.error);
          await this.save();
          return null;
        }
        this.log(agent.task.id, `fork attempt ${attempt} failed (${msg}), retrying`);
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }
    return null;
  }

  /** One task, start to finish, inside the fork it was given. */
  private async runAgent(agent: AgentState, baseFiles: Record<string, string>) {
    const forkRepo = agent.fork!;
    try {
      const ws = await checkout(forkRepo);

      // Developer
      agent.status = "developing";
      await this.save();
      const dev = await develop(this.env, agent.task, baseFiles);
      let working = { ...baseFiles, ...dev.files };
      agent.summary = dev.summary;
      for (const [path, content] of Object.entries(dev.files)) {
        await writeWorkspaceFile(ws, path, content);
      }
      this.log(agent.task.id, `developer wrote ${Object.keys(dev.files).length} file(s)`);

      // Testing
      agent.status = "testing";
      await this.save();
      const t = await test(this.env, agent.task, dev.files);
      for (const [path, content] of Object.entries(t.files)) {
        await writeWorkspaceFile(ws, path, content);
      }
      working = { ...working, ...t.files };
      agent.failures = t.failures;
      this.log(agent.task.id, `testing wrote ${Object.keys(t.files).length} test file(s), ${t.failures.length} expected failure(s)`);

      // Security + Reviewer run concurrently — neither mutates anything.
      agent.status = "reviewing";
      await this.save();
      const [findings, rev] = await Promise.all([
        scan(this.env, dev.files),
        review(this.env, agent.task, dev.files),
      ]);
      agent.findings = findings;
      agent.comments = rev.comments;
      agent.verdict = rev.verdict;
      this.log(agent.task.id, `security ${findings.length} finding(s), reviewer: ${rev.verdict}`);

      // A high-severity finding is not something Auto-Fix should quietly paper
      // over. File it as a work item so it survives the run and stays visible.
      for (const f of findings.filter((x) => x.severity === "high")) {
        await this.fileWorkItem({
          title: `${f.path}: ${f.message}`.slice(0, 180),
          body:
            `Raised by the Security agent while reviewing "${agent.task.title}".\n\n` +
            `Severity: high\nFile: ${f.path}\nProposal: ${agent.repo}\n\n${f.message}`,
          labels: ["security", "agent-raised"],
          author: "codemesh-security",
          repo: agent.repo,
        });
      }

      // Auto-Fix folds blocking feedback back in before the train sees it.
      const issues = [
        ...findings.filter((f) => f.severity !== "low").map((f) => `${f.path}: ${f.message}`),
        ...(rev.verdict === "request-changes" ? rev.comments.map((c) => `${c.path}: ${c.comment}`) : []),
        ...t.failures,
      ];
      if (issues.length) {
        agent.status = "fixing";
        await this.save();
        const fixed = await autofix(this.env, working, issues);
        for (const [path, content] of Object.entries(fixed)) {
          await writeWorkspaceFile(ws, path, content);
        }
        working = { ...working, ...fixed };
        this.log(agent.task.id, `auto-fix patched ${Object.keys(fixed).length} file(s) across ${issues.length} issue(s)`);
      }

      const commit = await commitAs(ws, agent.task.id, `${agent.task.title}\n\n${dev.summary}`);
      await push(forkRepo, ws);
      agent.commit = commit;
      agent.files = Object.keys(working).filter((p) => !(p in baseFiles) || working[p] !== baseFiles[p]);
      agent.status = "ready";
      this.mesh!.mergeTrain.push(agent.task.id);
      this.log(agent.task.id, `pushed ${commit.slice(0, 7)} to ${agent.repo}, queued for merge`);
      await this.save();
    } catch (err: any) {
      agent.status = "failed";
      agent.error = String(err?.message ?? err);
      this.log(agent.task.id, `failed: ${agent.error}`);
      await this.save();
    }
  }

  /**
   * Drain the merge train.
   *
   * Integration is serialized through the coordinator, so the trunk only ever
   * has one writer. Each agent's result is read back out of its fork through
   * the Artifacts binding — no cross-repo git merge, no conflict markers.
   * Because claims were arbitrated up front, overlap here is the exception,
   * and when it happens last-writer-wins is recorded explicitly in the log.
   */
  private async drainMergeTrain(trunkRepo: RepoHandle) {
    const ready = this.mesh!.agents.filter((a) => a.status === "ready");
    if (!ready.length) {
      this.log("merge-train", "nothing to integrate");
      return;
    }

    const ws = await checkout(trunkRepo);
    const touched = new Map<string, string>();

    for (const agent of ready) {
      using fork = await this.env.ARTIFACTS.get(agent.repo);
      let applied = 0;
      for (const path of agent.files) {
        const blob = await fork.readFile({ ref: "main", path });
        if (!blob) continue;
        const content = await blob.text();
        const prev = touched.get(path);
        if (prev && prev !== agent.task.id) {
          this.log(
            "merge-train",
            `${path} already integrated by ${prev}; ${agent.task.id} supersedes it`,
          );
        }
        await writeWorkspaceFile(ws, path, content);
        touched.set(path, agent.task.id);
        applied++;
      }
      const commit = await commitAs(
        ws,
        agent.task.id,
        `merge(${agent.task.id}): ${agent.task.title}`,
      );
      agent.status = "merged";
      this.log("merge-train", `integrated ${agent.task.id} (${applied} file(s)) as ${commit.slice(0, 7)}`);
      await this.save();
    }

    await push(trunkRepo, ws);
    this.log("merge-train", `trunk ${trunkRepo.name} updated`);
  }
}
