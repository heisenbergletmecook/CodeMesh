/**
 * Line diff.
 *
 * Small enough to keep in-tree rather than pulling a dependency into the
 * Worker bundle, and the inputs are source files, so an O(n·m) LCS on lines is
 * fine. Files past LIMIT lines fall back to a whole-file replacement so a
 * pathological input cannot stall a request.
 */

export type DiffLine = {
  type: "add" | "del" | "ctx";
  text: string;
  /** 1-based line number in the base file, null for additions. */
  a: number | null;
  /** 1-based line number in the head file, null for deletions. */
  b: number | null;
};

export type DiffHunk = {
  header: string;
  lines: DiffLine[];
};

export type FileDiff = {
  path: string;
  status: "added" | "removed" | "modified" | "unchanged";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
};

const LIMIT = 4000;

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const table: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

function walk(a: string[], b: string[]): DiffLine[] {
  const table = lcs(a, b);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: "ctx", text: a[i], a: i + 1, b: j + 1 });
      i++; j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ type: "del", text: a[i], a: i + 1, b: null });
      i++;
    } else {
      out.push({ type: "add", text: b[j], a: null, b: j + 1 });
      j++;
    }
  }
  while (i < a.length) out.push({ type: "del", text: a[i], a: ++i, b: null });
  while (j < b.length) out.push({ type: "add", text: b[j], a: null, b: ++j });
  return out;
}

/** Collapse unchanged runs, keeping `context` lines either side of a change. */
function hunkify(lines: DiffLine[], context = 3): DiffHunk[] {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((l, i) => {
    if (l.type === "ctx") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) {
      keep[k] = true;
    }
  });

  const hunks: DiffHunk[] = [];
  let current: DiffLine[] = [];
  const flush = () => {
    if (!current.length) return;
    const first = current[0];
    const aStart = first.a ?? current.find((l) => l.a)?.a ?? 0;
    const bStart = first.b ?? current.find((l) => l.b)?.b ?? 0;
    const aCount = current.filter((l) => l.a !== null).length;
    const bCount = current.filter((l) => l.b !== null).length;
    hunks.push({
      header: `@@ -${aStart},${aCount} +${bStart},${bCount} @@`,
      lines: current,
    });
    current = [];
  };

  keep.forEach((k, i) => {
    if (k) current.push(lines[i]);
    else flush();
  });
  flush();
  return hunks;
}

export function diffFile(path: string, before: string | null, after: string | null): FileDiff {
  if (before === after) {
    return { path, status: "unchanged", additions: 0, deletions: 0, hunks: [] };
  }

  const a = before === null ? [] : before.split("\n");
  const b = after === null ? [] : after.split("\n");

  if (a.length > LIMIT || b.length > LIMIT) {
    return {
      path,
      status: before === null ? "added" : after === null ? "removed" : "modified",
      additions: b.length,
      deletions: a.length,
      hunks: [{
        header: `@@ file too large to diff (${a.length} -> ${b.length} lines) @@`,
        lines: [],
      }],
    };
  }

  const lines = walk(a, b);
  return {
    path,
    status: before === null ? "added" : after === null ? "removed" : "modified",
    additions: lines.filter((l) => l.type === "add").length,
    deletions: lines.filter((l) => l.type === "del").length,
    hunks: hunkify(lines),
  };
}
