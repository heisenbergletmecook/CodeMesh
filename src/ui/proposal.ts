import { head, sidebar, topbar, ROLES_JS } from "./shell";

/**
 * Change Proposal — CodeMesh's replacement for the pull request.
 *
 * A proposal is not a branch waiting in a queue. It is an agent's forked
 * repository, the pipeline that produced it, and the decision the mesh reached.
 * Every value here is read back from that real repo and the run that made it.
 */
export const PROPOSAL_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Change Proposal — CodeMesh")}
<style>
  .crumb { font-size: 13px; color: var(--dim); margin-bottom: 9px; }
  .crumb a:hover { color: var(--orange); }
  h1.cp { margin: 0 0 10px; font-size: 24px; letter-spacing: -.5px; font-weight: 650; }
  .metaline { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
  .state {
    display: inline-flex; align-items: center; gap: 7px; border-radius: 20px;
    padding: 6px 14px; font-size: 13px; font-weight: 600; color: #fff; background: var(--ok);
  }
  .state.blocked { background: var(--warn); }
  .state.failed { background: var(--bad); }
  .state.running { background: var(--blue); }
  .refpill {
    display: inline-flex; align-items: center; gap: 6px; background: var(--bg);
    border: 1px solid var(--line); border-radius: 8px; padding: 4px 10px;
    font-family: var(--mono); font-size: 12px; color: var(--dim);
  }
  .muted { color: var(--dim); font-size: 13px; }
  .tags { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 16px; }
  .tag {
    background: var(--blue-bg); color: var(--blue); border-radius: 20px;
    padding: 4px 12px; font-size: 12.5px; font-weight: 500;
  }
  .tag.ai { background: var(--orange-soft); color: var(--orange); }
  .tag.risk { background: var(--bad-bg); color: var(--bad); }

  /* pipeline */
  .pipe {
    background: linear-gradient(110deg, #FFF8F4, #FFEFE6);
    border: 1px solid var(--orange-line); border-radius: 12px;
    padding: 20px 18px; margin-bottom: 16px; display: flex; gap: 6px;
    overflow-x: auto;
  }
  .step { flex: 1; min-width: 108px; text-align: center; position: relative; }
  .step:not(:last-child)::after {
    content: ""; position: absolute; top: 23px; left: calc(50% + 24px); right: calc(-50% + 24px);
    height: 2px; background: var(--orange-line);
  }
  .step.done:not(:last-child)::after { background: var(--orange); }
  .step .circle {
    width: 46px; height: 46px; border-radius: 50%; margin: 0 auto 8px; position: relative;
    display: grid; place-items: center; background: #fff; border: 2px solid var(--orange-line);
    font-family: var(--mono); font-weight: 700; font-size: 15px; color: var(--faint); z-index: 1;
  }
  .step.done .circle { border-color: var(--orange); color: var(--orange); }
  .step.active .circle {
    border-color: var(--orange); color: #fff; background: var(--orange);
    box-shadow: 0 0 0 5px rgba(241,90,36,.16);
  }
  .step .tick {
    position: absolute; right: -3px; bottom: -3px; width: 17px; height: 17px;
    border-radius: 50%; background: var(--ok); color: #fff; font-size: 10px;
    display: grid; place-items: center; border: 2px solid #FFF8F4;
  }
  .step .nm { font-size: 13px; font-weight: 600; }
  .step .st { font-size: 11.5px; color: var(--dim); margin-top: 1px; }

  .tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); margin-bottom: 16px; overflow-x: auto; }
  .tabs button {
    background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
    padding: 10px 14px; font-size: 13.5px; color: var(--dim); font-weight: 500; white-space: nowrap;
  }
  .tabs button.on { color: var(--orange); border-bottom-color: var(--orange); font-weight: 600; }
  .tabs .n {
    background: var(--bg); border-radius: 20px; padding: 1px 7px;
    font-size: 11.5px; margin-left: 5px; color: var(--dim);
  }
  .tabs button.on .n { background: var(--orange-soft); color: var(--orange); }

  .row { display: grid; grid-template-columns: 1fr 324px; gap: 16px; align-items: start; }
  @media (max-width: 1180px) { .row { grid-template-columns: 1fr; } }

  .ai-card { border: 1px solid var(--orange-line); border-radius: 11px; overflow: hidden; }
  .ai-head {
    display: flex; align-items: center; gap: 9px; padding: 11px 14px;
    background: var(--orange-soft); font-size: 13.5px; font-weight: 600;
  }
  .ai-head .badge-ai {
    background: var(--orange); color: #fff; border-radius: 20px;
    padding: 2px 9px; font-size: 11px; font-weight: 600;
  }
  .ai-body { display: grid; grid-template-columns: 1fr 210px; }
  @media (max-width: 860px) { .ai-body { grid-template-columns: 1fr; } }
  .ai-main { padding: 14px 16px; }
  .ai-main h4 { margin: 0 0 7px; font-size: 13.5px; }
  .ai-main ul { margin: 0; padding-left: 18px; font-size: 13.5px; color: var(--dim); }
  .ai-main li { margin: 4px 0; }
  .ai-side { border-left: 1px solid var(--line-2); padding: 14px; background: #FDFDFE; }
  .ai-side div { display: flex; gap: 8px; font-size: 12.5px; padding: 5px 0; align-items: flex-start; }
  .ai-side .ic { width: 15px; flex: none; }

  .list .item { padding: 12px 16px; border-bottom: 1px solid var(--line-2); display: flex; gap: 11px; }
  .list .item:last-child { border-bottom: 0; }
  .av {
    width: 30px; height: 30px; border-radius: 8px; flex: none; display: grid; place-items: center;
    background: var(--orange-soft); color: var(--orange); font-family: var(--mono);
    font-weight: 700; font-size: 12px;
  }
  .ttl { font-size: 13.5px; font-weight: 550; }
  .sub { font-size: 12px; color: var(--faint); margin-top: 2px; }
  .sha {
    margin-left: auto; font-family: var(--mono); font-size: 12px; color: var(--dim);
    border: 1px solid var(--line); border-radius: 6px; padding: 2px 7px; height: fit-content;
  }
  .filerow { cursor: pointer; }
  .filerow:hover { background: var(--bg); }
  .filerow.on { background: var(--orange-soft); }
  pre {
    margin: 0; padding: 13px 16px; overflow-x: auto; font-family: var(--mono);
    font-size: 12.5px; line-height: 1.6; background: #FCFCFD; max-height: 520px;
    border-top: 1px solid var(--line-2);
  }
  .check { display: flex; gap: 10px; padding: 11px 16px; border-bottom: 1px solid var(--line-2); font-size: 13.5px; }
  .check:last-child { border-bottom: 0; }
  .ci { width: 18px; flex: none; text-align: center; }
  .c-ok { color: var(--ok); } .c-warn { color: var(--warn); } .c-bad { color: var(--bad); }

  .decide { position: sticky; top: 76px; }
  .decide .btn {
    width: 100%; border: 0; border-radius: 9px; padding: 11px; font-size: 14px;
    font-weight: 600; cursor: default; margin-top: 10px;
  }
  .btn-merged { background: var(--ok); color: #fff; }
  .btn-wait { background: var(--bg); color: var(--faint); border: 1px solid var(--line); }
  .sum { display: flex; gap: 9px; font-size: 13px; padding: 7px 0; align-items: flex-start; }
</style>
</head>
<body>
<div class="app">
  ${sidebar("proposals")}
  <div>
    ${topbar("Search this proposal…")}
    <main id="main">
      <div class="crumb"><a href="/">Overview</a> / <a href="/proposals">Change Proposals</a> / <span id="cId">…</span></div>
      <h1 class="cp" id="cTitle">Loading…</h1>
      <div class="metaline" id="cMeta"></div>
      <div class="tags" id="cTags"></div>
      <div class="pipe" id="pipe"></div>

      <div class="tabs" id="tabs"></div>

      <div class="row">
        <div id="panes"></div>
        <div>
          <div class="panel decide">
            <h2>Decision</h2>
            <div class="pb" id="decision"></div>
          </div>
          <div class="panel">
            <h2>Agent journey</h2>
            <div class="pb"><div class="team" id="team"></div></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);

// /proposal/<forkRepoName>  e.g. trunk-mmv8x4bh9-create-authentication-service
const REPO = decodeURIComponent(location.pathname.replace(/^\\/proposal\\//, ""));
const MESH_ID = (REPO.match(/^trunk-([a-z0-9]+)-/) || [])[1];

let agent = null, mesh = null, commits = [], entries = [], repoMeta = null, tab = "discussion";

async function j(u) { const r = await fetch(u); if (!r.ok) throw new Error(await r.text()); return r.json(); }

const STEPS = [
  { key: "orchestrator", icon: "O", name: "Orchestrator", done: () => true,
    st: () => "Task planned" },
  { key: "developer", icon: "D", name: "Developer",
    done: (a) => !!a.summary, st: (a) => a.summary ? "Code written" : "Pending" },
  { key: "testing", icon: "T", name: "Testing",
    done: (a) => !!a.commit || (a.failures || []).length > 0,
    st: (a) => (a.failures || []).length + " expected failure(s)" },
  { key: "security", icon: "S", name: "Security",
    done: (a) => !!a.commit,
    st: (a) => {
      const f = a.findings || [];
      const high = f.filter(x => x.severity === "high").length;
      return f.length ? (high ? high + " high" : f.length + " finding(s)") : "No issues";
    } },
  { key: "reviewer", icon: "R", name: "Reviewer",
    done: (a) => !!a.verdict,
    st: (a) => a.verdict === "request-changes" ? "Changes requested" : a.verdict ? "Approved" : "Pending" },
  { key: "merge", icon: "M", name: "Merge",
    done: (a) => a.status === "merged",
    st: (a) => a.status === "merged" ? "Integrated" : "Pending" },
];

async function load() {
  $("cId").textContent = REPO;
  if (!MESH_ID) { $("cTitle").textContent = "Not a proposal repository"; return; }

  try {
    mesh = await j("/api/mesh/" + MESH_ID);
    agent = (mesh.agents || []).find(a => a.repo === REPO);
  } catch (e) { /* run state may have rolled off */ }

  try {
    const d = await j("/api/repos");
    repoMeta = (d.repos || []).find(x => x.name === REPO) || null;
  } catch (e) {}
  try { commits = await j("/api/repos/" + encodeURIComponent(REPO) + "/log"); } catch (e) { commits = []; }
  try { entries = (await j("/api/repos/" + encodeURIComponent(REPO) + "/tree")).entries || []; } catch (e) {}

  if (!agent) {
    agent = {
      task: { id: REPO.replace(/^trunk-[a-z0-9]+-/, ""), title: REPO.replace(/^trunk-[a-z0-9]+-/, "").replace(/-/g, " "), claims: [] },
      repo: REPO, status: commits.length > 1 ? "merged" : "ready",
      files: [], findings: [], comments: [], failures: [], blockedBy: [],
      commit: commits[0] && commits[0].hash,
    };
  }

  paintHeader();
  paintPipeline();
  paintTabs();
  paintPane();
  paintDecision();
  paintTeam();
}

function paintHeader() {
  const a = agent;
  document.title = a.task.title + " — CodeMesh";
  $("cTitle").textContent = a.task.title;
  const st = a.status === "merged" ? "" : a.status === "failed" ? "failed"
    : a.blockedBy && a.blockedBy.length ? "blocked" : "running";
  const label = a.status === "merged" ? "Integrated" : a.status === "failed" ? "Failed"
    : a.blockedBy && a.blockedBy.length ? "Sequenced" : a.status;
  $("cMeta").innerHTML =
    '<span class="state ' + st + '">' + esc(label) + "</span>" +
    '<span class="refpill">⑂ ' + esc(a.repo) + "</span>" +
    '<span class="muted">→</span>' +
    '<span class="refpill">⇶ ' + esc(mesh ? mesh.trunk : "trunk") + "</span>" +
    '<span class="muted">' + commits.length + " commit(s) · " +
      (a.files || []).length + " file(s) changed · " +
      ((a.findings || []).length + (a.comments || []).length) + " agent note(s)</span>";

  const tags = [];
  (a.task.claims || []).slice(0, 4).forEach(c => tags.push(['<span class="tag">' + esc(c) + "</span>"]));
  tags.push('<span class="tag ai">✦ agent-authored</span>');
  const high = (a.findings || []).filter(f => f.severity === "high").length;
  if (high) tags.push('<span class="tag risk">◆ ' + high + " high-severity</span>");
  if (a.blockedBy && a.blockedBy.length)
    tags.push('<span class="tag" style="background:var(--warn-bg);color:var(--warn)">⏸ sequenced</span>');
  $("cTags").innerHTML = tags.join("");
}

function paintPipeline() {
  const a = agent;
  $("pipe").innerHTML = STEPS.map((s, i) => {
    const done = s.done(a);
    const prevDone = i === 0 || STEPS[i - 1].done(a);
    const active = !done && prevDone && a.status !== "merged" && a.status !== "failed";
    return '<div class="step ' + (done ? "done" : "") + (active ? " active" : "") + '">' +
      '<div class="circle">' + s.icon + (done ? '<span class="tick">✓</span>' : "") + "</div>" +
      '<div class="nm">' + s.name + "</div>" +
      '<div class="st">' + esc(s.st(a)) + "</div></div>";
  }).join("");
}

function paintTabs() {
  const a = agent;
  const checks = (a.findings || []).length + (a.failures || []).length + (a.verdict ? 1 : 0);
  const defs = [
    ["discussion", "Discussion", (a.comments || []).length],
    ["commits", "Commits", commits.length],
    ["changes", "Changes", entries.length],
    ["checks", "Checks", checks],
    ["agents", "Agents", 6],
    ["impact", "Impact", (a.task.claims || []).length],
    ["docs", "Docs", docFiles().length],
    ["deploy", "Deploy", ""],
    ["settings", "Settings", ""],
  ];
  $("tabs").innerHTML = defs.map(([k, label, n]) =>
    '<button data-t="' + k + '"' + (k === tab ? ' class="on"' : "") + ">" + label +
    '<span class="n">' + n + "</span></button>").join("");
  document.querySelectorAll("#tabs button").forEach(b => {
    b.onclick = () => { tab = b.dataset.t; paintTabs(); paintPane(); };
  });
}

function panel(title, hint, body) {
  return '<div class="panel"><h2>' + title +
    (hint ? ' <span class="hint">' + hint + "</span>" : "") + "</h2>" + body + "</div>";
}

function paintPane() {
  const a = agent;
  if (tab === "discussion") {
    const bullets = [
      a.summary && "Developer: " + a.summary,
      (a.files || []).length && "Touched " + a.files.length + " file(s): " + a.files.slice(0, 5).join(", "),
      (a.failures || []).length && "Testing flagged " + a.failures.length + " assertion(s) expected to fail",
      (a.findings || []).length && "Security raised " + a.findings.length + " finding(s)",
      a.verdict && "Reviewer verdict: " + (a.verdict === "approve" ? "approved" : "changes requested"),
      a.status === "merged" && "Auto-Fix applied corrections, then the merge train integrated this into trunk",
    ].filter(Boolean);
    const side = [
      ["📄", (a.files || []).length + " file(s) changed"],
      ["✦", commits.length + " agent commit(s)"],
      [(a.findings || []).some(f => f.severity === "high") ? "⛊" : "✓",
        (a.findings || []).length + " security finding(s)"],
      [a.verdict === "approve" ? "✓" : "●", "Review: " + esc(a.verdict || "pending")],
      ["⇶", a.status === "merged" ? "Integrated into trunk" : "Awaiting merge train"],
    ];
    $("panes").innerHTML = panel("Discussion", "decisions the mesh reached, no humans in the loop",
      '<div class="pb"><div class="ai-card"><div class="ai-head">' +
      '<span class="badge-ai">✦ CodeMesh AI</span> What this change proposal does</div>' +
      '<div class="ai-body"><div class="ai-main"><h4>' + esc(a.task.title) + "</h4><ul>" +
      bullets.map(b => "<li>" + esc(b) + "</li>").join("") + "</ul></div>" +
      '<div class="ai-side">' + side.map(([i, t]) =>
        '<div><span class="ic">' + i + "</span><span>" + t + "</span></div>").join("") +
      "</div></div></div></div>") +
      ((a.comments || []).length ? panel("Reviewer comments", "",
        '<div class="list">' + a.comments.map(c =>
          '<div class="item"><div class="av">R</div><div><div class="ttl">' + esc(c.comment) + "</div>" +
          '<div class="sub">' + esc(c.path) + (c.line ? ":" + c.line : "") + "</div></div></div>").join("") +
        "</div>") : "");
  }

  if (tab === "commits") {
    $("panes").innerHTML = panel("Commits", "each authored by the agent that made it",
      '<div class="list">' + (commits.length ? commits.map(c =>
        '<div class="item"><div class="av">' + esc(c.author.name.replace(/^codemesh-/, "").charAt(0).toUpperCase()) + "</div>" +
        '<div style="flex:1"><div class="ttl">' + esc(c.message.split("\\n")[0]) + "</div>" +
        '<div class="sub">' + esc(c.author.name) + " · " + new Date(c.committedAt * 1000).toLocaleString() + "</div></div>" +
        '<span class="sha">' + esc(c.hash.slice(0, 7)) + "</span></div>").join("")
        : '<div class="empty" style="padding:14px 16px">No commits.</div>') + "</div>");
  }

  if (tab === "changes") {
    const changed = new Set(a.files || []);
    $("panes").innerHTML = panel("Changes", "files in this proposal's repository",
      '<div class="list" id="flist">' + (entries.length ? entries.map(p =>
        '<div class="item filerow" data-path="' + esc(p) + '">' +
        '<div class="av">' + (changed.has(p) ? "±" : "·") + "</div>" +
        '<div style="flex:1"><div class="ttl mono">' + esc(p) + "</div>" +
        '<div class="sub">' + (changed.has(p) ? "changed by this proposal" : "inherited from trunk") + "</div></div></div>").join("")
        : '<div class="empty" style="padding:14px 16px">Empty.</div>') +
      '</div><pre id="fv" style="display:none"></pre>');
    wireFileRows();
  }

  if (tab === "checks") {
    const rows = [];
    (a.findings || []).forEach(f => rows.push([
      f.severity === "high" ? "c-bad" : f.severity === "medium" ? "c-warn" : "c-ok",
      f.severity === "high" ? "✖" : f.severity === "medium" ? "▲" : "●",
      "Security · " + f.path, f.message]));
    (a.failures || []).forEach(f => rows.push(["c-warn", "▲", "Testing · expected failure", f]));
    if (a.verdict) rows.push([
      a.verdict === "approve" ? "c-ok" : "c-warn",
      a.verdict === "approve" ? "✓" : "▲",
      "Reviewer", a.verdict === "approve" ? "Approved — nothing blocking" : "Changes requested"]);
    $("panes").innerHTML = panel("Checks", "security scan, test expectations and review verdict",
      rows.length ? rows.map(([cls, ic, t, d]) =>
        '<div class="check"><span class="ci ' + cls + '">' + ic + "</span>" +
        "<div><b>" + esc(t) + "</b><div class='sub'>" + esc(d) + "</div></div></div>").join("")
        : '<div class="empty" style="padding:14px 16px">No checks recorded.</div>') +
      panel("Not yet wired", "stated plainly rather than faked",
        '<div class="pb muted">Test <i>execution</i> is not run: the Testing agent writes real test ' +
        'files and predicts which assertions fail, but nothing executes them yet. That needs ' +
        'Cloudflare Sandboxes and Containers.</div>');
  }

  if (tab === "agents") {
    const log = (mesh && mesh.log || []).filter(l => l.agent === a.task.id);
    $("panes").innerHTML = panel("Agent journey", "what each agent did on this proposal",
      '<div class="list">' + (log.length ? log.map(l =>
        '<div class="item"><div class="av">✦</div><div><div class="ttl">' + esc(l.msg) + "</div>" +
        '<div class="sub">' + new Date(l.t).toLocaleTimeString() + "</div></div></div>").join("")
        : '<div class="empty" style="padding:14px 16px">Run state has rolled off; see Commits.</div>') + "</div>");
  }

  if (tab === "impact") {
    // Real impact: which other proposals in this run touched the same paths,
    // taken from the merge train's own supersede decisions.
    const mine = new Set(a.files || []);
    const siblings = (mesh && mesh.agents || []).filter(x => x.repo !== a.repo);
    const collisions = siblings.map(s => {
      const shared = (s.files || []).filter(f => mine.has(f));
      return shared.length ? { id: s.task.id, shared } : null;
    }).filter(Boolean);
    const supersedes = (mesh && mesh.log || [])
      .filter(l => l.agent === "merge-train" && l.msg.includes(a.task.id));
    const high = (a.findings || []).filter(f => f.severity === "high").length;
    const risk = high ? "High" : (a.findings || []).length ? "Medium" : "Low";

    $("panes").innerHTML =
      panel("Risk", "derived from this proposal's own security findings",
        '<div class="pb"><div class="sum"><span class="' +
        (high ? "c-bad" : (a.findings || []).length ? "c-warn" : "c-ok") + '">◆</span>' +
        "<span><b>" + risk + " risk</b> — " + (a.findings || []).length +
        " finding(s), " + high + " high-severity</span></div></div>") +
      panel("Affected paths", "declared as claims before any work started",
        '<div class="pb">' + ((a.task.claims || []).length
          ? '<div class="claims" style="display:flex;flex-wrap:wrap;gap:6px">' +
            a.task.claims.map(c =>
              '<code style="font-family:var(--mono);font-size:12px;background:var(--bg);border:1px solid var(--line);padding:3px 8px;border-radius:5px">' +
              esc(c) + "</code>").join("") + "</div>"
          : '<span class="muted">No claims declared.</span>') + "</div>") +
      panel("Overlap with other proposals", "the collisions the mesh had to resolve",
        collisions.length
          ? '<div class="list">' + collisions.map(c =>
              '<div class="item"><div class="av">⚠</div><div><div class="ttl">' + esc(c.id) + "</div>" +
              '<div class="sub">shares ' + c.shared.map(esc).join(", ") + "</div></div></div>").join("") + "</div>"
          : '<div class="empty" style="padding:14px 16px">No other proposal touched these files.</div>') +
      panel("Merge train decisions", "recorded verbatim at integration time",
        supersedes.length
          ? '<div class="list">' + supersedes.map(l =>
              '<div class="item"><div class="av">⇶</div><div class="ttl">' + esc(l.msg) + "</div></div>").join("") + "</div>"
          : '<div class="empty" style="padding:14px 16px">Integrated without superseding anything.</div>');
  }

  if (tab === "docs") {
    const docs = docFiles();
    $("panes").innerHTML = panel("Documentation", "markdown in this proposal's repository",
      docs.length
        ? '<div class="list" id="dlist">' + docs.map(p =>
            '<div class="item filerow" data-path="' + esc(p) + '">' +
            '<div class="av">▤</div><div class="ttl mono">' + esc(p) + "</div></div>").join("") +
          '</div><pre id="fv" style="display:none"></pre>'
        : '<div class="empty" style="padding:14px 16px">No markdown files in this proposal.</div>');
    wireFileRows();
  }

  if (tab === "deploy") {
    const remote = (repoMeta && repoMeta.remote) || a.remote || "";
    $("panes").innerHTML =
      panel("Clone this proposal", "it is an ordinary Git remote",
        '<div class="pb"><pre style="border:0;border-radius:8px;background:var(--bg);max-height:none">' +
        esc("git clone " + remote) + "</pre>" +
        '<div class="sub" style="margin-top:8px">Requires a repo-scoped Artifacts token. ' +
        "Reads also work through the REST API and the Workers binding.</div></div>") +
      panel("Deployment", "stated plainly rather than faked",
        '<div class="pb muted">CodeMesh does not run a deployment pipeline. There are no preview ' +
        "environments, release notes or rollout plans behind this tab. Cloudflare Workers Builds " +
        "can deploy an Artifacts repo on push, and wiring that in is the natural next step — but " +
        "nothing here would be real today, so nothing is shown.</div>");
  }

  if (tab === "settings") {
    const r = repoMeta || {};
    const rows = [
      ["Proposal repo", a.repo, "mono"],
      ["Integrates into", (mesh && mesh.trunk) || "—", "mono"],
      ["Default branch", r.defaultBranch || "main", ""],
      ["Status", r.status || a.status, ""],
      ["Created", r.createdAt ? new Date(r.createdAt).toLocaleString() : "—", ""],
      ["Forked from", r.source || "—", "mono"],
      ["Repo ID", r.id || "—", "mono"],
      ["Git remote", r.remote || "—", "mono"],
    ];
    $("panes").innerHTML =
      panel("Merge policy", "fixed by the architecture, not configurable per proposal",
        '<div class="pb">' +
        '<div class="sum"><span class="c-ok">✓</span><span>Integration is a serialized merge train ' +
        "— the trunk has exactly one writer</span></div>" +
        '<div class="sum"><span class="c-ok">✓</span><span>Conflicts are prevented by claim ' +
        "arbitration at dispatch, not resolved at merge</span></div>" +
        '<div class="sum"><span class="c-ok">✓</span><span>No human approval gate: Security, ' +
        "Reviewer and Auto-Fix run as functions</span></div></div>") +
      panel("Repository metadata", "live from the Artifacts control plane",
        '<div class="pb"><div class="kv">' + rows.map(([k, v, c]) =>
          '<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid var(--line-2);font-size:13px">' +
          '<span style="color:var(--faint);min-width:116px">' + k + "</span>" +
          '<span class="' + c + '" style="word-break:break-all">' + esc(v) + "</span></div>").join("") +
        "</div></div>");
  }
}

/** Markdown files in this proposal, for the Docs tab. */
function docFiles() {
  return entries.filter(p => /\\.(md|mdx|txt)$/i.test(p));
}

function wireFileRows() {
  document.querySelectorAll(".filerow").forEach(el => {
    el.onclick = async () => {
      document.querySelectorAll(".filerow").forEach(n => n.classList.remove("on"));
      el.classList.add("on");
      const pre = $("fv"); pre.style.display = ""; pre.textContent = "Loading…";
      try {
        const r = await fetch("/api/repos/" + encodeURIComponent(REPO) +
          "/file?path=" + encodeURIComponent(el.dataset.path));
        pre.textContent = r.ok ? await r.text() : "Could not read file.";
      } catch (e) { pre.textContent = String(e); }
    };
  });
}

function paintDecision() {
  const a = agent;
  const high = (a.findings || []).filter(f => f.severity === "high").length;
  const rows = [
    [a.verdict === "approve" ? "c-ok" : "c-warn", a.verdict === "approve" ? "✓" : "▲",
     a.verdict === "approve" ? "Reviewer approved" : "Reviewer requested changes"],
    [high ? "c-bad" : "c-ok", high ? "✖" : "✓",
     high ? high + " high-severity finding(s)" : "No critical security issues"],
    [(a.failures || []).length ? "c-warn" : "c-ok", (a.failures || []).length ? "▲" : "✓",
     (a.failures || []).length ? a.failures.length + " expected test failure(s)" : "No failing expectations"],
    ["c-ok", "✓", "Auto-Fix ran before the merge train"],
  ];
  $("decision").innerHTML = rows.map(([c, i, t]) =>
    '<div class="sum"><span class="' + c + '">' + i + "</span><span>" + esc(t) + "</span></div>").join("") +
    (a.status === "merged"
      ? '<button class="btn btn-merged">⇶ Integrated into trunk</button>'
      : '<button class="btn btn-wait">Awaiting merge train</button>') +
    '<div class="sub" style="margin-top:9px">No human approval gate: the mesh decides, and every ' +
    'decision above is recorded in the commit history.</div>';
}

function paintTeam() {
  const a = agent;
  const state = {
    orchestrator: "planned the task",
    developer: a.summary || "—",
    testing: (a.failures || []).length + " expected failure(s)",
    security: (a.findings || []).length + " finding(s)",
    reviewer: a.verdict || "—",
    autofix: a.status === "merged" ? "corrections applied" : "—",
  };
  $("team").innerHTML = ROLES.map(r =>
    '<div class="tm"><div class="tm-ic">' + r.icon + "</div>" +
    '<div class="tm-body"><div class="tm-name"><span>' +
    r.key.charAt(0).toUpperCase() + r.key.slice(1) + "</span></div>" +
    '<div class="tm-role">' + esc(String(state[r.key]).slice(0, 60)) + "</div></div></div>").join("");
}

load();
</script>
</body>
</html>`;

/** Index of every change proposal, derived from the agent fork repositories. */
export const PROPOSALS_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Change Proposals — CodeMesh")}
<style>
  h1.page { margin: 0 0 4px; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  p.page { margin: 0 0 18px; color: var(--dim); font-size: 13.5px; max-width: 760px; }
  .rl a { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--line-2); }
  .rl a:last-child { border-bottom: 0; }
  .rl a:hover { background: var(--bg); }
  .rl .ico {
    width: 34px; height: 34px; border-radius: 9px; flex: none; display: grid; place-items: center;
    background: var(--orange-soft); color: var(--orange); font-size: 15px;
  }
  .rl .nm { font-size: 13.5px; font-weight: 600; }
  .rl a:hover .nm { color: var(--orange); }
  .rl .sub { font-size: 12.5px; color: var(--faint); margin-top: 2px; font-family: var(--mono); }
  .rl .when { margin-left: auto; font-size: 12.5px; color: var(--faint); }
</style>
</head>
<body>
<div class="app">
  ${sidebar("proposals")}
  <div>
    ${topbar("Filter change proposals…")}
    <main>
      <h1 class="page">Change Proposals</h1>
      <p class="page">CodeMesh has no pull requests. A change proposal is an agent's own forked
        repository — the work, the checks and the decision that produced it. Integration happens
        through a serialized merge train, not a review queue.</p>
      <div class="panel"><div class="rl" id="list"><div class="empty" style="padding:14px 16px">Loading…</div></div></div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
let rows = [];
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return Math.floor(s) + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
function paint() {
  const q = $("filter").value.toLowerCase();
  const f = rows.filter(r => r.name.toLowerCase().includes(q));
  $("list").innerHTML = f.length ? f.map(r => {
    const task = r.name.replace(/^trunk-[a-z0-9]+-/, "").replace(/-/g, " ");
    return '<a href="/proposal/' + encodeURIComponent(r.name) + '">' +
      '<div class="ico">⑂</div><div><div class="nm">' +
      esc(task.charAt(0).toUpperCase() + task.slice(1)) + "</div>" +
      '<div class="sub">' + esc(r.name) + "</div></div>" +
      '<div class="when">' + ago(r.updatedAt || r.createdAt) + "</div></a>";
  }).join("") : '<div class="empty" style="padding:14px 16px">No change proposals yet. Run a mesh from Overview.</div>';
}
(async () => {
  try {
    const d = await (await fetch("/api/repos")).json();
    // A proposal is a fork: trunk-<meshid>-<taskid>. A bare trunk is not one.
    rows = (d.repos || []).filter(r => /^trunk-[a-z0-9]+-.+/.test(r.name));
    paint();
  } catch (e) {
    $("list").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }
})();
$("filter").addEventListener("input", paint);
</script>
</body>
</html>`;
