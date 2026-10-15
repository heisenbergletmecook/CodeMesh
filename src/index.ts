/**
 * CodeMesh — agent-native source control on Cloudflare Artifacts.
 *
 * Routes:
 *   GET  /                      dashboard
 *   POST /api/mesh              start a run      { request: string }
 *   GET  /api/mesh/:id          mesh state (polled by the dashboard)
 *   GET  /api/repos             every repo in the namespace
 *   GET  /api/repos/:name/log   commit history for one repo
 */

import { MeshCoordinator } from "./coordinator";
import { DASHBOARD } from "./ui";
import type { Env } from "./agents/model";

export { MeshCoordinator };

function meshStub(env: Env, id: string) {
  return env.MESH.get(env.MESH.idFromName(id));
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === "/" || path === "/index.html") {
        return new Response(DASHBOARD, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }

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
