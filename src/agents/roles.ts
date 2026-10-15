/**
 * The five agents active in this prototype.
 *
 * Each one is a pure function of (context) -> structured result. None of them
 * touch git: the coordinator owns every repo operation, so an agent can never
 * corrupt the trunk or push behind the merge train's back.
 */

import { askJSON, type Env } from "./model";

export type Task = {
  id: string;
  title: string;
  /** Path globs this task intends to touch, declared before any work starts. */
  claims: string[];
};

export type Finding = {
  severity: "high" | "medium" | "low";
  path: string;
  message: string;
};

export type ReviewComment = {
  path: string;
  line?: number;
  comment: string;
};

const fileList = (files: Record<string, string>) =>
  Object.entries(files)
    .map(([p, c]) => `--- ${p} ---\n${c.slice(0, 2000)}`)
    .join("\n\n");

/**
 * Agent 1 — Orchestrator.
 *
 * Splits a request into tasks AND makes each task declare the paths it will
 * touch. Those claims are the whole conflict story: the coordinator compares
 * them before dispatch, so overlapping work is sequenced instead of colliding
 * at merge time.
 */
export async function orchestrate(
  env: Env,
  request: string,
  files: Record<string, string>,
): Promise<Task[]> {
  const paths = Object.keys(files);
  const result = await askJSON<{ tasks: Task[] }>(
    env,
    "orchestrator",
    `You plan concurrent work for a swarm of coding agents.
Split the request into 2-4 INDEPENDENT tasks that can run in parallel.
For each task, list the file paths it will create or modify in "claims".
Prefer tasks whose claims do NOT overlap. Existing files: ${paths.join(", ") || "(empty repo)"}.
Schema: {"tasks":[{"id":"kebab-id","title":"...","claims":["src/foo.ts"]}]}`,
    request,
    { tasks: [] },
  );
  const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
  return tasks
    .filter((t) => t && t.id && t.title)
    .map((t, i) => ({
      id: String(t.id || `task-${i + 1}`).replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
      title: String(t.title),
      claims: Array.isArray(t.claims) ? t.claims.map(String) : [],
    }))
    .slice(0, 4);
}

/**
 * Agent 2 — Developer. Produces real file contents, which the coordinator
 * commits and pushes to that agent's own forked repo.
 */
export async function develop(
  env: Env,
  task: Task,
  files: Record<string, string>,
): Promise<{ files: Record<string, string>; summary: string }> {
  const result = await askJSON<{ files: Record<string, string>; summary: string }>(
    env,
    "developer",
    `You are a senior engineer implementing ONE task.
Return the FULL new contents of each file you create or modify.
Only touch these paths: ${task.claims.join(", ") || "any reasonable path"}.
Schema: {"summary":"one sentence","files":{"path/to/file.ts":"full file contents"}}`,
    `Task: ${task.title}\n\nCurrent repository:\n${fileList(files) || "(empty)"}`,
    { files: {}, summary: task.title },
  );
  return {
    files: result?.files && typeof result.files === "object" ? result.files : {},
    summary: String(result?.summary ?? task.title),
  };
}

/**
 * Agent 3 — Testing. Writes tests and reports which ones it expects to fail,
 * so Auto-Fix has something concrete to act on.
 */
export async function test(
  env: Env,
  task: Task,
  files: Record<string, string>,
): Promise<{ files: Record<string, string>; failures: string[] }> {
  const result = await askJSON<{ files: Record<string, string>; failures: string[] }>(
    env,
    "testing",
    `You write tests for the code you are shown.
Produce runnable test files. List any assertions you believe will FAIL against the current code.
Schema: {"files":{"tests/foo.test.ts":"..."},"failures":["describes the failing case"]}`,
    `Task: ${task.title}\n\nCode:\n${fileList(files)}`,
    { files: {}, failures: [] },
  );
  return {
    files: result?.files && typeof result.files === "object" ? result.files : {},
    failures: Array.isArray(result?.failures) ? result.failures.map(String) : [],
  };
}

/** Agent 4 — Security. Flags vulnerabilities, secrets and unsafe dependencies. */
export async function scan(
  env: Env,
  files: Record<string, string>,
): Promise<Finding[]> {
  const result = await askJSON<{ findings: Finding[] }>(
    env,
    "security",
    `You are a security reviewer. Report only real, concrete issues you can point at.
Schema: {"findings":[{"severity":"high|medium|low","path":"src/x.ts","message":"..."}]}`,
    fileList(files),
    { findings: [] },
  );
  const findings = Array.isArray(result?.findings) ? result.findings : [];
  return findings
    .filter((f) => f && f.message)
    .map((f) => ({
      severity: (["high", "medium", "low"].includes(f.severity) ? f.severity : "low") as Finding["severity"],
      path: String(f.path ?? "unknown"),
      message: String(f.message),
    }));
}

/** Agent 5 — Code Reviewer. Inline comments on the proposed change. */
export async function review(
  env: Env,
  task: Task,
  files: Record<string, string>,
): Promise<{ comments: ReviewComment[]; verdict: "approve" | "request-changes" }> {
  const result = await askJSON<{ comments: ReviewComment[]; verdict: string }>(
    env,
    "reviewer",
    `You review a proposed change for correctness, maintainability and regressions.
Be specific and brief. Approve only if you found nothing that should block.
Schema: {"verdict":"approve|request-changes","comments":[{"path":"src/x.ts","line":12,"comment":"..."}]}`,
    `Task: ${task.title}\n\nProposed files:\n${fileList(files)}`,
    { comments: [], verdict: "approve" },
  );
  const comments = Array.isArray(result?.comments) ? result.comments : [];
  return {
    comments: comments
      .filter((c) => c && c.comment)
      .map((c) => ({
        path: String(c.path ?? "unknown"),
        line: typeof c.line === "number" ? c.line : undefined,
        comment: String(c.comment),
      })),
    verdict: result?.verdict === "request-changes" ? "request-changes" : "approve",
  };
}

/**
 * Change Intelligence — writes the commit message and proposal description
 * from the actual diff.
 *
 * Nobody hand-writes a commit message in CodeMesh. The change itself is the
 * input; the prose is derived from it, so the history stays honest about what
 * was done rather than what someone meant to do.
 */
export async function describeChange(
  env: Env,
  path: string,
  before: string | null,
  after: string,
): Promise<{ message: string; title: string; description: string }> {
  const verb = before === null ? "created" : "modified";
  const fallbackTitle = `${before === null ? "Add" : "Update"} ${path}`;
  const result = await askJSON<{ message: string; title: string; description: string }>(
    env,
    "reviewer",
    `You write commit messages and change descriptions from a diff.
"message": a conventional-commit subject line, max 72 chars, imperative mood, no trailing period.
"title": a short human title for the change proposal.
"description": 1-3 sentences on what changed and why it matters.
Schema: {"message":"...","title":"...","description":"..."}`,
    `File ${verb}: ${path}\n\n` +
      (before !== null ? `BEFORE:\n${before.slice(0, 3000)}\n\n` : "") +
      `AFTER:\n${after.slice(0, 3000)}`,
    { message: fallbackTitle, title: fallbackTitle, description: `${verb} ${path}.` },
  );
  const clamp = (s: unknown, max: number, fb: string) => {
    const v = String(s ?? "").trim();
    return v ? v.slice(0, max) : fb;
  };
  return {
    message: clamp(result?.message, 72, fallbackTitle),
    title: clamp(result?.title, 90, fallbackTitle),
    description: clamp(result?.description, 500, `${verb} ${path}.`),
  };
}

/** Auto-Fix — folds review comments and security findings back into the code. */
export async function autofix(
  env: Env,
  files: Record<string, string>,
  issues: string[],
): Promise<Record<string, string>> {
  if (!issues.length) return {};
  const result = await askJSON<{ files: Record<string, string> }>(
    env,
    "autofix",
    `You apply corrections to code. Return FULL new contents only for files you changed.
Schema: {"files":{"path":"full contents"}}`,
    `Issues to fix:\n${issues.map((i) => `- ${i}`).join("\n")}\n\nCode:\n${fileList(files)}`,
    { files: {} },
  );
  return result?.files && typeof result.files === "object" ? result.files : {};
}
