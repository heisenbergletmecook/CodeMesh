/**
 * CodeMesh — agent-native source control on Cloudflare Artifacts.
 *
 * Routes:
 *   GET  /                      dashboard
 *   POST /api/mesh              start a run      { request: string }
 *   GET  /api/mesh/:id          mesh state (polled by the dashboard)
 *   GET  /repos                 repository index
 *   GET  /repo/:name            repository browser
 *   GET  /api/repos             every repo in the namespace
 *   GET  /api/repos/:name/log   commit history
 *   GET  /api/repos/:name/tree  flat file listing at a ref
 *   GET  /api/repos/:name/file  one file's contents (?path=&ref=)
 */

import { MeshCoordinator } from "./coordinator";
import { WorkItemStore } from "./issues";
import { commitAs, commitFile, initWorkspace, listBranches, push, writeWorkspaceFile } from "./git";
import { describeChange } from "./agents/roles";
import { diffFile, type FileDiff } from "./diff";
import { DASHBOARD } from "./ui/dashboard";
import { REPO_PAGE, REPOS_PAGE } from "./ui/repo";
import { PROPOSAL_PAGE, PROPOSALS_PAGE } from "./ui/proposal";
import { PROFILE_PAGE } from "./ui/profile";
import { ITEMS_PAGE, SECURITY_PAGE } from "./ui/items";
import type { Env } from "./agents/model";

export { MeshCoordinator, WorkItemStore };

/** Starter contents for a freshly created repository. */
const SEED_FILES = (name: string): Record<string, string> => ({
  "README.md": `# ${name}\n\nCreated in CodeMesh. Run a mesh against it to have agents\nfork, implement, review and integrate changes concurrently.\n`,
  "src/index.ts": `export function handler(req: Request): Response {\n  return new Response("ok");\n}\n`,
  "package.json": JSON.stringify({ name, version: "0.1.0", type: "module" }, null, 2) + "\n",
});

function meshStub(env: Env, id: string) {
  return env.MESH.get(env.MESH.idFromName(id));
}

/** One store for the whole workspace. */
function itemStub(env: Env) {
  return env.ITEMS.get(env.ITEMS.idFromName("workspace"));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // Treat /repos and /repos/ as the same route.
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

    try {
      const html = (body: string) =>
        new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

      if (path === "/" || path === "/index.html") return html(DASHBOARD);
      if (path === "/repos") return html(REPOS_PAGE);
      if (path.startsWith("/repo/")) return html(REPO_PAGE);
      if (path === "/agents" || path === "/profile") return html(PROFILE_PAGE);
      if (path === "/items") return html(ITEMS_PAGE);
      if (path === "/security") return html(SECURITY_PAGE);
      if (path === "/proposals") return html(PROPOSALS_PAGE);
      if (path.startsWith("/proposal/")) return html(PROPOSAL_PAGE);

      if (path === "/api/mesh" && req.method === "POST") {
        const body = await req.json<{ request?: string; repo?: string }>();
        const request = (body?.request ?? "").trim();
        if (!request) {
          return Response.json({ error: "request is required" }, { status: 400 });
        }
        const repo = (body?.repo ?? "").trim() || undefined;
        if (repo) {
          // Fail fast with a clear message rather than deep inside the run.
          try {
            using check = await env.ARTIFACTS.get(repo);
            await check.info();
          } catch {
            return Response.json({ error: `codebase "${repo}" not found` }, { status: 404 });
          }
        }
        const meshId = `m${Date.now().toString(36)}`;
        const stub = meshStub(env, meshId);
        await stub.fetch("https://mesh/start", {
          method: "POST",
          body: JSON.stringify({ request, meshId, repo }),
        });
        return Response.json({ meshId, trunk: repo ?? `trunk-${meshId}` });
      }

      const meshMatch = path.match(/^\/api\/mesh\/([a-z0-9]+)$/i);
      if (meshMatch) {
        const stub = meshStub(env, meshMatch[1]);
        return stub.fetch("https://mesh/state");
      }

      // --- work items -------------------------------------------------
      if (path === "/api/items") {
        const stub = itemStub(env);
        if (req.method === "POST") {
          return stub.fetch("https://items/create", { method: "POST", body: await req.text() });
        }
        return stub.fetch("https://items/list" + url.search);
      }
      if (path === "/api/runs") {
        return itemStub(env).fetch("https://items/runs");
      }
      if (path === "/api/items/update" && req.method === "POST") {
        return itemStub(env).fetch("https://items/update", { method: "POST", body: await req.text() });
      }

      if (path === "/api/repos" && req.method === "POST") {
        const body = await req.json<{ name?: string; description?: string }>();
        const name = (body?.name ?? "").trim();
        // Artifacts naming rules: start alphanumeric, then letters, digits,
        // dot, underscore or hyphen.
        if (!/^[A-Za-z0-9][A-Za-z0-9._-]{1,62}$/.test(name)) {
          return Response.json(
            { error: "name must start alphanumeric and use only letters, digits, . _ -" },
            { status: 400 },
          );
        }
        const created = await env.ARTIFACTS.create(name, {
          setDefaultBranch: "main",
          description: body?.description ?? "Created in CodeMesh.",
        });
        // A repo with no commits has no default branch to clone, so seed it.
        const ws = await initWorkspace();
        for (const [p, content] of Object.entries(SEED_FILES(name))) {
          await writeWorkspaceFile(ws, p, content);
        }
        const commit = await commitAs(ws, "coordinator", "chore: initial commit");
        await push({ name, remote: created.remote, token: created.token }, ws);
        return Response.json({ name, remote: created.remote, commit });
      }

      if (path === "/api/repos") {
        const list = await env.ARTIFACTS.list({ limit: 100 });
        return Response.json(list);
      }

      // Read one file straight out of a repo, so the code an agent wrote can be
      // inspected from outside the app.
      const fileMatch = path.match(/^\/api\/repos\/([^/]+)\/file$/);
      if (fileMatch) {
        const ref = url.searchParams.get("ref") ?? "main";
        const filePath = url.searchParams.get("path");
        if (!filePath) return Response.json({ error: "path is required" }, { status: 400 });
        using repo = await env.ARTIFACTS.get(decodeURIComponent(fileMatch[1]));
        const blob = await repo.readFile({ ref, path: filePath });
        if (!blob) return Response.json({ error: "not found" }, { status: 404 });
        return new Response(await blob.text(), {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      // Flat listing of the files at a ref.
      const treeMatch = path.match(/^\/api\/repos\/([^/]+)\/tree$/);
      if (treeMatch) {
        using repo = await env.ARTIFACTS.get(decodeURIComponent(treeMatch[1]));
        const ref = url.searchParams.get("ref") ?? "main";
        const commits = await repo.log({ ref, limit: 1 });
        if (!commits.length) return Response.json({ entries: [] });
        const walk = async (hash: string, prefix: string): Promise<string[]> => {
          const entries = await repo.readTree(hash);
          if (!entries) return [];
          const out: string[] = [];
          for (const e of entries) {
            const full = prefix ? `${prefix}/${e.name}` : e.name;
            if (e.type === "tree") out.push(...(await walk(e.hash, full)));
            else out.push(full);
          }
          return out;
        };
        return Response.json({ entries: await walk(commits[0].treeHash, "") });
      }

      // Branches, read off the Git remote — the only authoritative source,
      // since neither the binding nor the REST API exposes refs.
      // Edit a file from the browser. The commit message and the proposal
      // description are generated from the diff, never typed by hand.
      const editMatch = path.match(/^\/api\/repos\/([^/]+)\/edit$/);
      if (editMatch && req.method === "POST") {
        const name = decodeURIComponent(editMatch[1]);
        const body = await req.json<{
          path?: string; content?: string; baseRef?: string;
          mode?: "direct" | "branch"; branch?: string; message?: string;
        }>();
        const filePath = (body?.path ?? "").trim();
        const content = body?.content ?? "";
        if (!filePath) return Response.json({ error: "path is required" }, { status: 400 });

        using repo = await env.ARTIFACTS.get(name);
        const info = await repo.info();
        const baseRef = body?.baseRef || info.defaultBranch || "main";

        // Previous contents, so the description is written from a real diff.
        let before: string | null = null;
        const prev = await repo.readFile({ ref: baseRef, path: filePath });
        if (prev) before = await prev.text();
        if (before === content) {
          return Response.json({ error: "no change — file content is identical" }, { status: 400 });
        }

        const described = await describeChange(env, filePath, before, content);

        let branch = baseRef;
        if (body?.mode === "branch") {
          branch = (body?.branch || "").trim() ||
            `edit/${filePath.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}-${Date.now().toString(36)}`;
        }

        const token = await repo.createToken("write", 600);
        const res = await commitFile(
          { name, remote: info.remote, token: token.plaintext },
          {
            path: filePath,
            content,
            message: body?.message?.trim() || described.message,
            baseRef,
            branch,
            author: "editor",
          },
        );
        return Response.json({ ...res, ...described });
      }

      // Compare two refs, or a proposal against the trunk it forked from.
      // Returns real line diffs, not a file list.
      const cmpMatch = path.match(/^\/api\/repos\/([^/]+)\/compare$/);
      if (cmpMatch) {
        const headRepo = decodeURIComponent(cmpMatch[1]);
        const baseRepo = url.searchParams.get("baseRepo") || headRepo;
        const head = url.searchParams.get("head") || "main";
        const base = url.searchParams.get("base") || "main";
        const only = url.searchParams.get("path");

        const read = async (repoName: string, ref: string, p: string) => {
          using r = await env.ARTIFACTS.get(repoName);
          const blob = await r.readFile({ ref, path: p });
          return blob ? await blob.text() : null;
        };

        // Union of both trees so additions and removals both show up.
        const treeOf = async (repoName: string, ref: string): Promise<string[]> => {
          using r = await env.ARTIFACTS.get(repoName);
          const commits = await r.log({ ref, limit: 1 });
          if (!commits.length) return [];
          const walkTree = async (hash: string, prefix: string): Promise<string[]> => {
            const entries = await r.readTree(hash);
            if (!entries) return [];
            const out: string[] = [];
            for (const e of entries) {
              const full = prefix ? `${prefix}/${e.name}` : e.name;
              if (e.type === "tree") out.push(...(await walkTree(e.hash, full)));
              else out.push(full);
            }
            return out;
          };
          // Must await: returning the promise would let `using` dispose the
          // stub before the recursive walk finishes with it.
          return await walkTree(commits[0].treeHash, "");
        };

        let paths: string[];
        if (only) {
          paths = [only];
        } else {
          const [ht, bt] = await Promise.all([
            treeOf(headRepo, head),
            treeOf(baseRepo, base).catch(() => [] as string[]),
          ]);
          paths = [...new Set([...bt, ...ht])].sort();
        }

        const files: FileDiff[] = [];
        for (const p of paths.slice(0, 60)) {
          const [before, after] = await Promise.all([
            read(baseRepo, base, p).catch(() => null),
            read(headRepo, head, p).catch(() => null),
          ]);
          if (before === null && after === null) continue;
          const d = diffFile(p, before, after);
          if (d.status !== "unchanged") files.push(d);
        }

        return Response.json({
          base: { repo: baseRepo, ref: base },
          head: { repo: headRepo, ref: head },
          files,
          additions: files.reduce((n, f) => n + f.additions, 0),
          deletions: files.reduce((n, f) => n + f.deletions, 0),
        });
      }

      const brMatch = path.match(/^\/api\/repos\/([^/]+)\/branches$/);
      if (brMatch) {
        const name = decodeURIComponent(brMatch[1]);
        using repo = await env.ARTIFACTS.get(name);
        const info = await repo.info();
        const token = await repo.createToken("read", 300);
        const branches = await listBranches({
          name,
          remote: info.remote,
          token: token.plaintext,
        });
        return Response.json({ branches, defaultBranch: info.defaultBranch });
      }

      const logMatch = path.match(/^\/api\/repos\/([^/]+)\/log$/);
      if (logMatch) {
        using repo = await env.ARTIFACTS.get(decodeURIComponent(logMatch[1]));
        const log = await repo.log({ limit: 50 });
        return Response.json(log);
      }

      return new Response("not found", { status: 404 });
    } catch (err: any) {
      console.error(err);
      return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
    }
  },
};
