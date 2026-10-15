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
import { DASHBOARD } from "./ui/dashboard";
import { REPO_PAGE, REPOS_PAGE } from "./ui/repo";
import { PROPOSAL_PAGE, PROPOSALS_PAGE } from "./ui/proposal";
import type { Env } from "./agents/model";

export { MeshCoordinator };

function meshStub(env: Env, id: string) {
  return env.MESH.get(env.MESH.idFromName(id));
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
      if (path === "/proposals") return html(PROPOSALS_PAGE);
      if (path.startsWith("/proposal/")) return html(PROPOSAL_PAGE);

      if (path === "/api/mesh" && req.method === "POST") {
        const body = await req.json<{ request?: string }>();
        const request = (body?.request ?? "").trim();
        if (!request) {
          return Response.json({ error: "request is required" }, { status: 400 });
        }
        const meshId = `m${Date.now().toString(36)}`;
        const stub = meshStub(env, meshId);
        await stub.fetch("https://mesh/start", {
          method: "POST",
          body: JSON.stringify({ request, meshId }),
        });
        return Response.json({ meshId });
      }

      const meshMatch = path.match(/^\/api\/mesh\/([a-z0-9]+)$/i);
      if (meshMatch) {
        const stub = meshStub(env, meshMatch[1]);
        return stub.fetch("https://mesh/state");
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
