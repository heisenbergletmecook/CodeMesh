/**
 * Offline proof that the in-memory filesystem is a good enough `fs` for
 * isomorphic-git: init, add, commit, log, and a second commit on top.
 *
 * This is the component with no safety net — if MemFS is subtly wrong, every
 * agent commit fails at runtime. Runs with no network and no Cloudflare account:
 *
 *   node --experimental-strip-types test/memfs.test.ts
 */

import git from "isomorphic-git";
import { MemFS } from "../src/memfs.ts";

const dir = "/ws";
let failures = 0;

function check(label: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ok   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? " — " + detail : ""}`);
  }
}

async function main() {
  const fs = new MemFS();

  console.log("\nfilesystem primitives");
  await fs.writeFile("/a/b/c.txt", "hello");
  check("mkdir -p on deep write", (await fs.readFile("/a/b/c.txt", "utf8")) === "hello");
  check("readdir lists children", (await fs.readdir("/a")).join(",") === "b");
  const st = await fs.stat("/a/b/c.txt");
  check("stat reports file + size", st.isFile() && st.size === 5, `size=${st.size}`);
  check("stat reports dir", (await fs.stat("/a")).isDirectory());
  await fs.unlink("/a/b/c.txt");
  let gone = false;
  try { await fs.readFile("/a/b/c.txt"); } catch (e: any) { gone = e.code === "ENOENT"; }
  check("unlink then ENOENT", gone);

  console.log("\ngit init + commit");
  await git.init({ fs, dir, defaultBranch: "main" });
  check("init created .git", (await fs.readdir(dir)).includes(".git"));

  await fs.writeFile(`${dir}/README.md`, "# demo\n");
  await fs.writeFile(`${dir}/src/index.ts`, "export const x = 1;\n");
  await git.add({ fs, dir, filepath: "README.md" });
  await git.add({ fs, dir, filepath: "src/index.ts" });

  const sha1 = await git.commit({
    fs, dir,
    message: "feat: first commit",
    author: { name: "codemesh-developer", email: "developer@agents.codemesh.dev" },
  });
  check("commit returned a sha", /^[0-9a-f]{40}$/.test(sha1), sha1);

  console.log("\ngit log + tree");
  const log1 = await git.log({ fs, dir, depth: 10 });
  check("log has 1 commit", log1.length === 1, `got ${log1.length}`);
  check("author is the agent", log1[0].commit.author.name === "codemesh-developer");

  const files = await git.listFiles({ fs, dir, ref: "HEAD" });
  check("tree has both files", files.length === 2 && files.includes("src/index.ts"), files.join(","));

  console.log("\nsecond commit on top");
  await fs.writeFile(`${dir}/src/index.ts`, "export const x = 2;\n");
  await git.add({ fs, dir, filepath: "src/index.ts" });
  const sha2 = await git.commit({
    fs, dir,
    message: "fix: bump",
    author: { name: "codemesh-autofix", email: "autofix@agents.codemesh.dev" },
  });
  const log2 = await git.log({ fs, dir, depth: 10 });
  check("log has 2 commits", log2.length === 2, `got ${log2.length}`);
  check("parent chain is linked", log2[0].commit.parent[0] === sha1);
  check("shas differ", sha1 !== sha2);

  console.log("\nstatusMatrix (used to compute changed paths)");
  await fs.writeFile(`${dir}/new.txt`, "untracked\n");
  const matrix = await git.statusMatrix({ fs, dir });
  const row = matrix.find((r) => r[0] === "new.txt");
  check("sees an untracked file", !!row, JSON.stringify(matrix.map((r) => r[0])));

  console.log(
    failures === 0
      ? "\n✅ MemFS is a valid isomorphic-git backend — the write path holds.\n"
      : `\n❌ ${failures} check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 threw:", err);
  process.exit(1);
});
