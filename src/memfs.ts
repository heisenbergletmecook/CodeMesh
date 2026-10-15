/**
 * Minimal in-memory filesystem for isomorphic-git inside a Worker.
 *
 * Workers have no disk, so every git operation (init, add, commit, push)
 * runs against this Map. One instance per agent workspace, discarded after
 * the push lands in Artifacts.
 */

type Node =
  | { type: "file"; content: Uint8Array; mode: number; mtimeMs: number }
  | { type: "dir"; mtimeMs: number }
  | { type: "symlink"; target: string; mtimeMs: number };

const enc = new TextEncoder();
const dec = new TextDecoder();

function normalize(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
}

function dirname(p: string): string {
  const n = normalize(p);
  const i = n.lastIndexOf("/");
  return i <= 0 ? "/" : n.slice(0, i);
}

class FSError extends Error {
  code: string;
  constructor(code: string, path: string) {
    super(`${code}: ${path}`);
    this.code = code;
    this.name = code;
  }
}

function statLike(node: Node, size: number) {
  const isFile = node.type === "file";
  const isDir = node.type === "dir";
  const isLink = node.type === "symlink";
  return {
    type: isFile ? "file" : isDir ? "dir" : "symlink",
    mode: isFile ? (node as any).mode ?? 0o100644 : isDir ? 0o040755 : 0o120000,
    size,
    ino: 0,
    mtimeMs: node.mtimeMs,
    ctimeMs: node.mtimeMs,
    uid: 1,
    gid: 1,
    dev: 1,
    isFile: () => isFile,
    isDirectory: () => isDir,
    isSymbolicLink: () => isLink,
  };
}

export class MemFS {
  private nodes = new Map<string, Node>();

  constructor() {
    this.nodes.set("/", { type: "dir", mtimeMs: Date.now() });
  }

  /** isomorphic-git expects `fs.promises`-shaped methods. */
  get promises() {
    return this;
  }

  private ensureParent(p: string) {
    const parent = dirname(p);
    if (parent !== "/" && !this.nodes.has(parent)) {
      // mkdir -p semantics: git writes deep paths without creating dirs first.
      const segs = parent.slice(1).split("/");
      let cur = "";
      for (const s of segs) {
        cur += "/" + s;
        if (!this.nodes.has(cur)) {
          this.nodes.set(cur, { type: "dir", mtimeMs: Date.now() });
        }
      }
    }
  }

  async readFile(p: string, opts?: any): Promise<Uint8Array | string> {
    const path = normalize(p);
    const node = this.nodes.get(path);
    if (!node) throw new FSError("ENOENT", path);
    if (node.type !== "file") throw new FSError("EISDIR", path);
    const encoding = typeof opts === "string" ? opts : opts?.encoding;
    return encoding === "utf8" ? dec.decode(node.content) : node.content;
  }

  async writeFile(p: string, data: Uint8Array | string, opts?: any): Promise<void> {
    const path = normalize(p);
    this.ensureParent(path);
    const content = typeof data === "string" ? enc.encode(data) : new Uint8Array(data);
    const mode = (typeof opts === "object" && opts?.mode) || 0o100644;
    this.nodes.set(path, { type: "file", content, mode, mtimeMs: Date.now() });
  }

  async unlink(p: string): Promise<void> {
    const path = normalize(p);
    if (!this.nodes.has(path)) throw new FSError("ENOENT", path);
    this.nodes.delete(path);
  }

  async readdir(p: string): Promise<string[]> {
    const path = normalize(p);
    const node = this.nodes.get(path);
    if (!node) throw new FSError("ENOENT", path);
    if (node.type !== "dir") throw new FSError("ENOTDIR", path);
    const prefix = path === "/" ? "/" : path + "/";
    const out = new Set<string>();
    for (const key of this.nodes.keys()) {
      if (key === path || !key.startsWith(prefix)) continue;
      const rest = key.slice(prefix.length);
      const head = rest.split("/")[0];
      if (head) out.add(head);
    }
    return [...out].sort();
  }

  async mkdir(p: string, opts?: any): Promise<void> {
    const path = normalize(p);
    if (this.nodes.has(path)) {
      if (opts?.recursive) return;
      throw new FSError("EEXIST", path);
    }
    this.ensureParent(path);
    this.nodes.set(path, { type: "dir", mtimeMs: Date.now() });
  }

  async rmdir(p: string): Promise<void> {
    const path = normalize(p);
    const node = this.nodes.get(path);
    if (!node) throw new FSError("ENOENT", path);
    if (node.type !== "dir") throw new FSError("ENOTDIR", path);
    this.nodes.delete(path);
  }

  async stat(p: string) {
    const path = normalize(p);
    let node = this.nodes.get(path);
    if (node?.type === "symlink") {
      node = this.nodes.get(normalize(node.target));
    }
    if (!node) throw new FSError("ENOENT", path);
    const size = node.type === "file" ? node.content.byteLength : 0;
    return statLike(node, size);
  }

  async lstat(p: string) {
    const path = normalize(p);
    const node = this.nodes.get(path);
    if (!node) throw new FSError("ENOENT", path);
    const size =
      node.type === "file"
        ? node.content.byteLength
        : node.type === "symlink"
          ? node.target.length
          : 0;
    return statLike(node, size);
  }

  async readlink(p: string): Promise<string> {
    const path = normalize(p);
    const node = this.nodes.get(path);
    if (!node || node.type !== "symlink") throw new FSError("ENOENT", path);
    return node.target;
  }

  async symlink(target: string, p: string): Promise<void> {
    const path = normalize(p);
    this.ensureParent(path);
    this.nodes.set(path, { type: "symlink", target, mtimeMs: Date.now() });
  }

  /** Not used by git's core paths, but isomorphic-git probes for it. */
  async chmod(p: string, mode: number): Promise<void> {
    const node = this.nodes.get(normalize(p));
    if (node?.type === "file") node.mode = mode;
  }

  /** Debug helper: list every file path currently in the workspace. */
  files(): string[] {
    return [...this.nodes.entries()]
      .filter(([, n]) => n.type === "file")
      .map(([k]) => k)
      .sort();
  }
}
