/**
 * End-to-end audit against the deployed Worker.
 *
 * Exercises every page route, every API endpoint, the negative cases, and a
 * full mesh run — then asserts on the real responses.
 *
 *   node test/e2e.mjs [baseUrl]
 */

const BASE = process.argv[2] || "https://codemesh.heisenberg145.workers.dev";
const results = [];
let failures = 0;

function record(group, name, ok, detail = "") {
  results.push({ group, name, ok, detail });
  if (!ok) failures++;
  const mark = ok ? "\x1b[32m ok \x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${mark} ${name}${detail ? "  \x1b[90m" + detail + "\x1b[0m" : ""}`);
}

async function get(path) {
  const res = await fetch(BASE + path);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json, type: res.headers.get("content-type") || "" };
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const group = (n) => console.log(`\n\x1b[1m${n}\x1b[0m`);

// Every page must render the shell: logo, nav, and no unrendered template holes.
function checkPage(name, r, markers) {
  const ok = r.status === 200 && r.type.includes("text/html");
  record("pages", `${name} responds`, ok, `HTTP ${r.status}`);
  if (!ok) return;
  for (const m of markers) {
    record("pages", `${name} contains "${m}"`, r.text.includes(m));
  }
  record("pages", `${name} has no unrendered \${}`, !/\$\{[a-zA-Z]/.test(r.text));
  record("pages", `${name} has the logo`, r.text.includes("data:image/png;base64,"));
}

async function main() {
  console.log(`\nCodeMesh end-to-end audit\n${BASE}\n${"=".repeat(60)}`);

  // ---------------------------------------------------------------- pages
  group("Page routes");
  checkPage("/", await get("/"), ["Run mesh", "Overview", "Change Proposals", "Agent Studio"]);
  checkPage("/repos", await get("/repos"), ["Codebases", "New codebase"]);
  checkPage("/proposals", await get("/proposals"), ["Change Proposals", "no pull requests"]);
  checkPage("/agents", await get("/agents"), ["Agent Studio", "Contribution activity", "@codemesh"]);
  checkPage("/profile", await get("/profile"), ["Agent Studio"]);
  checkPage("/items", await get("/items"), ["Work Items", "New work item"]);
  checkPage("/security", await get("/security"), ["Trust Center", "Platform posture"]);

  group("Trailing slash + unknown routes");
  record("routing", "/repos/ normalizes", (await get("/repos/")).status === 200);
  record("routing", "unknown path 404s", (await get("/definitely-not-a-route")).status === 404);
  record("routing", "unknown api 404s", (await get("/api/nope")).status === 404);

  // ------------------------------------------------------------- repo API
  group("Repository API");
  const list = await get("/api/repos");
  record("api", "GET /api/repos", list.status === 200 && Array.isArray(list.json?.repos),
    `${list.json?.total ?? "?"} repos`);
  const repos = list.json?.repos || [];
  record("api", "repos carry a git remote",
    repos.every((r) => typeof r.remote === "string" && r.remote.startsWith("https://")));
  record("api", "no tokens in repo listing", !/"token"/.test(list.text));

  group("Create codebase (negative cases first)");
  record("api", "rejects empty name", (await post("/api/repos", { name: "" })).status === 400);
  record("api", "rejects leading hyphen", (await post("/api/repos", { name: "-bad" })).status === 400);
  record("api", "rejects spaces", (await post("/api/repos", { name: "has space" })).status === 400);
  record("api", "rejects slashes", (await post("/api/repos", { name: "a/b" })).status === 400);

  const fresh = `e2e_${Date.now().toString(36)}`;
  const created = await post("/api/repos", { name: fresh, description: "e2e audit" });
  record("api", "POST /api/repos creates", created.status === 200 && created.json?.commit,
    `${fresh} @ ${(created.json?.commit || "").slice(0, 7)}`);
  record("api", "duplicate name is rejected",
    (await post("/api/repos", { name: fresh })).status >= 400);

  group("Read endpoints on the new codebase");
  const tree = await get(`/api/repos/${fresh}/tree`);
  record("api", "GET /tree", tree.status === 200 && Array.isArray(tree.json?.entries),
    (tree.json?.entries || []).join(", "));
  record("api", "seed files present",
    ["README.md", "package.json", "src/index.ts"].every((f) => tree.json?.entries?.includes(f)));

  const log = await get(`/api/repos/${fresh}/log`);
  record("api", "GET /log", log.status === 200 && log.json?.length === 1);
  record("api", "commit authored by an agent",
    (log.json?.[0]?.author?.name || "").startsWith("codemesh-"), log.json?.[0]?.author?.name);

  const file = await get(`/api/repos/${fresh}/file?path=README.md`);
  record("api", "GET /file", file.status === 200 && file.text.includes(fresh));
  record("api", "GET /file 404s for missing path",
    (await get(`/api/repos/${fresh}/file?path=nope.txt`)).status === 404);
  record("api", "GET /file 400s without path",
    (await get(`/api/repos/${fresh}/file`)).status === 400);

  const branches = await get(`/api/repos/${fresh}/branches`);
  record("api", "GET /branches", branches.status === 200 && branches.json?.branches?.length === 1,
    (branches.json?.branches || []).map((b) => b.name).join(", "));

  // ----------------------------------------------------------------- edit
  group("Browser editing + generated messages");
  const newBody = 'export function handler(): Response {\n  return Response.json({ ok: true, audited: true });\n}\n';
  const edit1 = await post(`/api/repos/${fresh}/edit`, {
    path: "src/index.ts", content: newBody, mode: "branch",
  });
  record("edit", "edit onto a new branch", edit1.status === 200 && edit1.json?.created === true,
    edit1.json?.branch);
  record("edit", "commit message was generated",
    !!edit1.json?.message && edit1.json.message.length > 3, edit1.json?.message);
  record("edit", "description was generated",
    !!edit1.json?.description && edit1.json.description.length > 10);
  record("edit", "message is not the raw fallback",
    edit1.json?.message !== "Update src/index.ts", edit1.json?.message);

  const afterBranch = await get(`/api/repos/${fresh}/branches`);
  record("edit", "new branch is on the remote",
    (afterBranch.json?.branches || []).some((b) => b.name === edit1.json?.branch),
    (afterBranch.json?.branches || []).map((b) => b.name).join(", "));
  record("edit", "main is untouched by the branch edit",
    (afterBranch.json?.branches || []).find((b) => b.name === "main")?.oid ===
      (branches.json?.branches || []).find((b) => b.name === "main")?.oid);

  record("edit", "identical content is rejected", (await post(`/api/repos/${fresh}/edit`, {
    path: "src/index.ts", content: newBody, baseRef: edit1.json?.branch, mode: "direct",
  })).status === 400);
  record("edit", "missing path is rejected",
    (await post(`/api/repos/${fresh}/edit`, { content: "x" })).status === 400);

  const edit2 = await post(`/api/repos/${fresh}/edit`, {
    path: "README.md", content: `# ${fresh}\n\nEdited directly by the audit.\n`, mode: "direct",
  });
  record("edit", "direct commit to main", edit2.status === 200 && edit2.json?.created === false);
  const mainLog = await get(`/api/repos/${fresh}/log`);
  record("edit", "main advanced", mainLog.json?.length === 2, `${mainLog.json?.length} commits`);
  record("edit", "human edit is attributed",
    (mainLog.json?.[0]?.author?.name || "").includes("editor"), mainLog.json?.[0]?.author?.name);

  // ---------------------------------------------------------- work items
  group("Work items (persistent)");
  record("items", "rejects an empty title",
    (await post("/api/items", { title: "" })).status === 400);
  const made = await post("/api/items", {
    title: "e2e audit item", body: "created by the audit", labels: ["audit"],
  });
  record("items", "POST /api/items creates", made.status === 200 && made.json?.id > 0,
    `#${made.json?.id}`);
  record("items", "new item is open", made.json?.state === "open");

  const listed = await get("/api/items");
  record("items", "GET /api/items lists", listed.status === 200 &&
    listed.json.items.some((i) => i.id === made.json.id), `${listed.json?.items?.length} items`);
  record("items", "counts are reported",
    typeof listed.json?.open === "number" && typeof listed.json?.closed === "number",
    `${listed.json?.open} open / ${listed.json?.closed} closed`);

  const commented = await post("/api/items/update", {
    id: made.json.id, comment: "audit comment",
  });
  record("items", "comment persists", commented.json?.comments?.length === 1);
  const closed = await post("/api/items/update", { id: made.json.id, state: "closed" });
  record("items", "close persists", closed.json?.state === "closed");
  const reread = await get("/api/items");
  record("items", "state survives a re-read",
    reread.json.items.find((i) => i.id === made.json.id)?.state === "closed");
  record("items", "unknown id 404s",
    (await post("/api/items/update", { id: 999999, state: "closed" })).status === 404);

  // ----------------------------------------------------------------- diff
  group("Compare / diff");
  const selfCmp = await get(`/api/repos/${fresh}/compare?base=main&head=${encodeURIComponent(edit1.json.branch)}`);
  record("diff", "GET /compare across branches", selfCmp.status === 200 && Array.isArray(selfCmp.json?.files),
    `+${selfCmp.json?.additions} -${selfCmp.json?.deletions} across ${selfCmp.json?.files?.length} file(s)`);
  record("diff", "diff found the edited file",
    (selfCmp.json?.files || []).some((f) => f.path === "src/index.ts"));
  const idx = (selfCmp.json?.files || []).find((f) => f.path === "src/index.ts");
  record("diff", "diff has hunks", (idx?.hunks || []).length > 0);
  record("diff", "hunk header looks unified", /^@@ -\d+,\d+ \+\d+,\d+ @@/.test(idx?.hunks?.[0]?.header || ""),
    idx?.hunks?.[0]?.header);
  record("diff", "lines are typed add/del/ctx",
    (idx?.hunks?.[0]?.lines || []).every((l) => ["add", "del", "ctx"].includes(l.type)));
  record("diff", "additions carry a head line number",
    (idx?.hunks?.[0]?.lines || []).filter((l) => l.type === "add").every((l) => l.b !== null && l.a === null));
  record("diff", "deletions carry a base line number",
    (idx?.hunks?.[0]?.lines || []).filter((l) => l.type === "del").every((l) => l.a !== null && l.b === null));
  record("diff", "identical refs produce no files",
    ((await get(`/api/repos/${fresh}/compare?base=main&head=main`)).json?.files || []).length === 0);
  const scoped = await get(`/api/repos/${fresh}/compare?base=main&head=${encodeURIComponent(edit1.json.branch)}&path=src/index.ts`);
  record("diff", "path filter narrows the diff", (scoped.json?.files || []).length === 1);

  // ----------------------------------------------------------------- mesh
  group("Full mesh run");
  record("mesh", "rejects an empty request", (await post("/api/mesh", { request: "" })).status === 400);

  const started = await post("/api/mesh", {
    request: "Add input validation and a health check endpoint",
  });
  const meshId = started.json?.meshId;
  record("mesh", "POST /api/mesh starts a run", started.status === 200 && !!meshId, meshId);

  let state = null;
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const r = await get(`/api/mesh/${meshId}`);
    state = r.json;
    if (state?.phase === "done" || state?.phase === "error") break;
    process.stdout.write(`\r       …${state?.phase} ${(state?.agents || []).length} agent(s)   `);
  }
  process.stdout.write("\r" + " ".repeat(50) + "\r");

  record("mesh", "run completed", state?.phase === "done", `phase=${state?.phase} ${state?.error || ""}`);
  const agents = state?.agents || [];
  record("mesh", "orchestrator planned tasks", agents.length >= 2, `${agents.length} tasks`);
  record("mesh", "every task declared claims", agents.every((a) => (a.task.claims || []).length > 0));
  record("mesh", "no agent failed", agents.every((a) => a.status !== "failed"),
    agents.filter((a) => a.status === "failed").map((a) => a.error).join("; "));
  record("mesh", "all agents merged", agents.every((a) => a.status === "merged"),
    agents.map((a) => a.status).join(", "));
  record("mesh", "every agent pushed a commit", agents.every((a) => !!a.commit));
  record("mesh", "agents produced findings or review",
    agents.some((a) => (a.findings || []).length || (a.comments || []).length || a.verdict));

  const stateText = JSON.stringify(state);
  record("security", "no write tokens in mesh state", !/"token"/.test(stateText));
  record("security", "no bearer secrets in mesh state", !/Bearer /.test(stateText));

  const trainLines = (state?.log || []).filter((l) => l.agent === "merge-train");
  record("mesh", "merge train ran", trainLines.length > 0, `${trainLines.length} entries`);
  record("mesh", "trunk was updated", trainLines.some((l) => l.msg.includes("trunk")));

  group("Mesh artifacts are real repositories");
  const trunkLog = await get(`/api/repos/${state?.trunk}/log`);
  record("artifacts", "trunk has integrated history",
    trunkLog.status === 200 && trunkLog.json?.length >= agents.length + 1,
    `${trunkLog.json?.length} commits`);
  record("artifacts", "each merge commit is agent-authored",
    (trunkLog.json || []).every((c) => (c.author?.name || "").startsWith("codemesh-")));

  for (const a of agents.slice(0, 2)) {
    const forkTree = await get(`/api/repos/${a.repo}/tree`);
    record("artifacts", `fork ${a.task.id} has files`,
      forkTree.status === 200 && (forkTree.json?.entries || []).length > 0,
      `${(forkTree.json?.entries || []).length} files`);
    const firstFile = (a.files || [])[0];
    if (firstFile) {
      const content = await get(`/api/repos/${a.repo}/file?path=${encodeURIComponent(firstFile)}`);
      record("artifacts", `fork ${a.task.id} file is non-empty`,
        content.status === 200 && content.text.trim().length > 0,
        `${firstFile} (${content.text.length}B)`);
    }
  }

  group("Agent-raised work items");
  const highFindings = agents.flatMap((a) => (a.findings || []).filter((f) => f.severity === "high"));
  const afterRun = await get("/api/items");
  const raised = (afterRun.json?.items || []).filter((i) => (i.labels || []).includes("agent-raised"));
  if (highFindings.length) {
    record("items", "security agent filed work items", raised.length > 0,
      `${highFindings.length} high finding(s) -> ${raised.length} item(s)`);
    record("items", "raised items are labelled security",
      raised.every((i) => i.labels.includes("security")));
    record("items", "raised items cite a proposal repo", raised.every((i) => !!i.repo));
  } else {
    record("items", "no high findings this run (nothing to file)", true, "skipped");
  }

  group("Proposal + repo pages for live data");
  if (agents[0]) {
    checkPage(`/proposal/${agents[0].repo}`, await get(`/proposal/${agents[0].repo}`),
      ["Discussion", "Commits", "Changes", "Checks", "Impact", "Docs", "Deploy", "Settings"]);
  }
  checkPage(`/repo/${state?.trunk}`, await get(`/repo/${state?.trunk}`),
    ["Files", "Commits", "Branches", "Settings"]);

  group("Cross-repo compare (proposal vs trunk)");
  if (agents[0]) {
    const pc = await get(`/api/repos/${agents[0].repo}/compare?baseRepo=${state.trunk}&base=main&head=main`);
    record("diff", "proposal diffs against its trunk", pc.status === 200 && Array.isArray(pc.json?.files),
      `+${pc.json?.additions} -${pc.json?.deletions} across ${pc.json?.files?.length} file(s)`);
    record("diff", "no disposed-stub error", !/disposed/.test(pc.text));
  }

  group("Mesh against an existing codebase");
  record("mesh", "unknown repo is rejected",
    (await post("/api/mesh", { request: "x", repo: "nope_not_here" })).status === 404);

  const beforeLog = await get(`/api/repos/${fresh}/log`);
  const started2 = await post("/api/mesh", {
    request: "Add a structured logger module",
    repo: fresh,
  });
  record("mesh", "accepts an existing codebase as trunk",
    started2.status === 200 && started2.json?.trunk === fresh, started2.json?.trunk);

  let s2 = null;
  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    s2 = (await get(`/api/mesh/${started2.json.meshId}`)).json;
    if (s2?.phase === "done" || s2?.phase === "error") break;
    process.stdout.write(`\r       …${s2?.phase} ${(s2?.agents || []).length} agent(s)   `);
  }
  process.stdout.write("\r" + " ".repeat(50) + "\r");
  record("mesh", "run on existing codebase completed", s2?.phase === "done",
    `phase=${s2?.phase} ${s2?.error || ""}`);
  record("mesh", "it read the existing files",
    (s2?.log || []).some((l) => /existing file/.test(l.msg)),
    (s2?.log || []).find((l) => /existing file/.test(l.msg))?.msg);
  record("mesh", "forks are namespaced by run",
    (s2?.agents || []).every((a) => a.repo.startsWith(`${fresh}-${started2.json.meshId}-`)),
    (s2?.agents || [])[0]?.repo);

  const afterLog = await get(`/api/repos/${fresh}/log`);
  record("mesh", "existing history is preserved",
    afterLog.json.at(-1)?.hash === beforeLog.json.at(-1)?.hash,
    `base ${(beforeLog.json.at(-1)?.hash || "").slice(0, 7)}`);
  record("mesh", "merges landed on top",
    afterLog.json.length > beforeLog.json.length,
    `${beforeLog.json.length} -> ${afterLog.json.length} commits`);

  group("Run registry");
  const runs = await get("/api/runs");
  record("api", "GET /api/runs", runs.status === 200 && Array.isArray(runs.json?.runs),
    `${runs.json?.runs?.length} run(s)`);
  record("api", "the run we just made is registered",
    (runs.json?.runs || []).some((r) => r.meshId === started2.json.meshId));
  record("api", "runs carry trunk and request",
    (runs.json?.runs || []).every((r) => r.trunk && r.request && r.at));

  // --------------------------------------------------------------- report
  console.log("\n" + "=".repeat(60));
  const byGroup = {};
  for (const r of results) {
    byGroup[r.group] ??= { pass: 0, fail: 0 };
    r.ok ? byGroup[r.group].pass++ : byGroup[r.group].fail++;
  }
  for (const [g, { pass, fail }] of Object.entries(byGroup)) {
    console.log(`  ${g.padEnd(12)} ${String(pass).padStart(3)} passed  ${fail ? `\x1b[31m${fail} failed\x1b[0m` : "0 failed"}`);
  }
  console.log("=".repeat(60));
  if (failures) {
    console.log(`\n\x1b[31m${failures} check(s) failed:\x1b[0m`);
    results.filter((r) => !r.ok).forEach((r) => console.log(`  · ${r.name} ${r.detail}`));
  } else {
    console.log(`\n\x1b[32mAll ${results.length} checks passed.\x1b[0m`);
  }
  console.log(`\nScratch codebase left behind: ${fresh}\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error("\naudit threw:", e); process.exit(1); });
