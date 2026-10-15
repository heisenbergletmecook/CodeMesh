/**
 * The write path.
 *
 * Artifacts exposes rich reads through the Workers binding (readFile, readTree,
 * log) but has no write API at all — the only way to mutate a repo is a Git
 * push. Workers have no disk and no git binary, so CodeMesh drives
 * isomorphic-git over an in-memory filesystem and pushes over smart HTTP.
 *
 * This is what lets an agent commit from the edge with no runner, no container
 * and no checkout.
 */

import git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import { MemFS } from "./memfs";

const DIR = "/ws";

export type RepoHandle = {
  name: string;
  remote: string;
  token: string;
};

/** Artifacts tokens arrive as `<secret>?expires=<ts>`; git wants only the secret. */
export function cleanToken(token: string): string {
  return token.split("?")[0];
}

function authFor(token: string) {
  const password = cleanToken(token);
  return () => ({ username: "x", password });
}

export type Workspace = {
  fs: MemFS;
  dir: string;
};

/** Clone an Artifacts repo into memory so an agent can work on it. */
export async function checkout(repo: RepoHandle, ref = "main"): Promise<Workspace> {
  const fs = new MemFS();
  await git.clone({
    fs,
    http,
    dir: DIR,
    url: repo.remote,
    ref,
    singleBranch: true,
    depth: 1,
    onAuth: authFor(repo.token),
  });
  return { fs, dir: DIR };
}

/** Start an empty repo in memory (used for the very first trunk commit). */
export async function initWorkspace(): Promise<Workspace> {
  const fs = new MemFS();
  await git.init({ fs, dir: DIR, defaultBranch: "main" });
  return { fs, dir: DIR };
}

export async function readWorkspaceFile(ws: Workspace, path: string): Promise<string | null> {
  try {
    return (await ws.fs.readFile(`${ws.dir}/${path}`, "utf8")) as string;
  } catch {
    return null;
  }
}

export async function writeWorkspaceFile(ws: Workspace, path: string, content: string) {
  await ws.fs.writeFile(`${ws.dir}/${path}`, content);
  await git.add({ fs: ws.fs, dir: ws.dir, filepath: path });
}

export async function removeWorkspaceFile(ws: Workspace, path: string) {
  await ws.fs.unlink(`${ws.dir}/${path}`).catch(() => {});
  await git.remove({ fs: ws.fs, dir: ws.dir, filepath: path }).catch(() => {});
}

/**
 * Commit as a named agent. Every commit in CodeMesh carries the agent identity
 * in the author field, so `git log` alone tells you which agent touched what.
 */
export async function commitAs(
  ws: Workspace,
  agent: string,
  message: string,
): Promise<string> {
  return git.commit({
    fs: ws.fs,
    dir: ws.dir,
    message,
    author: {
      name: `codemesh-${agent}`,
      email: `${agent}@agents.codemesh.dev`,
    },
  });
}

export async function push(repo: RepoHandle, ws: Workspace, ref = "main") {
  return git.push({
    fs: ws.fs,
    dir: ws.dir,
    http,
    url: repo.remote,
    ref,
    remoteRef: ref,
    force: true,
    onAuth: authFor(repo.token),
  });
}

/**
 * Edit one file and push the result.
 *
 * `branch` may be the branch the file was read from (commit in place) or a new
 * name (branch off it first). Either way the push is an ordinary Git push over
 * smart HTTP — the same path agents use, so a human edit and an agent edit are
 * indistinguishable downstream.
 */
export async function commitFile(
  repo: RepoHandle,
  opts: {
    path: string;
    content: string;
    message: string;
    baseRef: string;
    branch: string;
    author: string;
  },
): Promise<{ commit: string; branch: string; created: boolean }> {
  const ws = await checkout(repo, opts.baseRef);
  const created = opts.branch !== opts.baseRef;
  if (created) {
    await git.branch({ fs: ws.fs, dir: ws.dir, ref: opts.branch, checkout: true });
  }
  await writeWorkspaceFile(ws, opts.path, opts.content);
  const commit = await commitAs(ws, opts.author, opts.message);
  await push(repo, ws, opts.branch);
  return { commit, branch: opts.branch, created };
}

/**
 * Real branch list, read straight off the Git remote.
 *
 * Artifacts has no refs endpoint in the binding or the REST API, so the only
 * authoritative source is the Git protocol itself.
 */
export async function listBranches(repo: RepoHandle): Promise<{ name: string; oid: string }[]> {
  const refs = await git.listServerRefs({
    http,
    url: repo.remote,
    prefix: "refs/heads/",
    onAuth: authFor(repo.token),
  });
  return refs.map((r: any) => ({
    name: r.ref.replace(/^refs\/heads\//, ""),
    oid: r.oid,
  }));
}

/** Files changed between HEAD and its parent, as a flat path list. */
export async function changedPaths(ws: Workspace): Promise<string[]> {
  const status = await git.statusMatrix({ fs: ws.fs, dir: ws.dir });
  return status
    .filter(([, head, workdir]) => head !== workdir)
    .map(([filepath]) => filepath as string);
}

/** Every tracked file in the workspace, as path -> contents. */
export async function snapshot(ws: Workspace): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const prefix = `${ws.dir}/`;
  for (const abs of ws.fs.files()) {
    if (!abs.startsWith(prefix)) continue;
    const rel = abs.slice(prefix.length);
    if (rel.startsWith(".git/")) continue;
    out[rel] = (await ws.fs.readFile(abs, "utf8")) as string;
  }
  return out;
}
