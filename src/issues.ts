/**
 * WorkItemStore — one Durable Object holding the work items for the workspace.
 *
 * Real persistence, not a stub: items survive restarts, carry comments, and can
 * be opened by a human or raised by an agent. Agents file them when a security
 * finding is severe enough that Auto-Fix should not silently paper over it.
 */

export type WorkItem = {
  id: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  author: string;
  repo?: string;
  createdAt: number;
  updatedAt: number;
  comments: { author: string; body: string; at: number }[];
};

export class WorkItemStore {
  private state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  private async all(): Promise<WorkItem[]> {
    return (await this.state.storage.get<WorkItem[]>("items")) ?? [];
  }

  private async save(items: WorkItem[]) {
    await this.state.storage.put("items", items);
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const op = url.pathname.split("/").pop();

    try {
      if (op === "list") {
        const items = await this.all();
        const repo = url.searchParams.get("repo");
        const filtered = repo ? items.filter((i) => i.repo === repo) : items;
        return Response.json({
          items: filtered.sort((a, b) => b.updatedAt - a.updatedAt),
          open: filtered.filter((i) => i.state === "open").length,
          closed: filtered.filter((i) => i.state === "closed").length,
        });
      }

      if (op === "create") {
        const body = await req.json<Partial<WorkItem>>();
        const title = String(body.title ?? "").trim();
        if (!title) return Response.json({ error: "title is required" }, { status: 400 });
        const items = await this.all();
        const now = Date.now();
        const item: WorkItem = {
          id: items.reduce((n, i) => Math.max(n, i.id), 0) + 1,
          title: title.slice(0, 200),
          body: String(body.body ?? "").slice(0, 4000),
          state: "open",
          labels: Array.isArray(body.labels) ? body.labels.map(String).slice(0, 6) : [],
          author: String(body.author ?? "you"),
          repo: body.repo ? String(body.repo) : undefined,
          createdAt: now,
          updatedAt: now,
          comments: [],
        };
        items.push(item);
        await this.save(items);
        return Response.json(item);
      }

      if (op === "update") {
        const body = await req.json<{ id: number; state?: "open" | "closed"; comment?: string; author?: string }>();
        const items = await this.all();
        const item = items.find((i) => i.id === Number(body.id));
        if (!item) return Response.json({ error: "not found" }, { status: 404 });
        if (body.state) item.state = body.state;
        if (body.comment?.trim()) {
          item.comments.push({
            author: String(body.author ?? "you"),
            body: body.comment.trim().slice(0, 2000),
            at: Date.now(),
          });
        }
        item.updatedAt = Date.now();
        await this.save(items);
        return Response.json(item);
      }

      return new Response("not found", { status: 404 });
    } catch (err: any) {
      return Response.json({ error: String(err?.message ?? err) }, { status: 500 });
    }
  }
}
