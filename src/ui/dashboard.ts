import { head, sidebar, topbar, ROLES_JS } from "./shell";

export const DASHBOARD = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("CodeMesh — agent-native source control")}
<style>
  .hero {
    background: linear-gradient(110deg, #FFF6F1 0%, #FFEDE3 55%, #FFE3D2 100%);
    border: 1px solid var(--orange-line); border-radius: 12px;
    padding: 22px 24px; margin-bottom: 16px;
  }
  .kicker {
    font-size: 11px; font-weight: 700; letter-spacing: 1px;
    text-transform: uppercase; color: var(--orange); margin-bottom: 7px;
  }
  .hero h1 { margin: 0 0 6px; font-size: 25px; letter-spacing: -.5px; font-weight: 650; }
  .hero p { margin: 0 0 16px; color: #7A5443; font-size: 14px; max-width: 700px; }
  .prompt { display: flex; gap: 9px; flex-wrap: wrap; }
  .prompt input {
    flex: 1; min-width: 280px; background: #fff; border: 1px solid var(--orange-line);
    border-radius: 9px; padding: 11px 14px; font-size: 14px; color: var(--text);
  }
  .prompt input:focus { outline: none; border-color: var(--orange); }
  button.go {
    background: var(--orange); color: #fff; border: 0; font-weight: 600;
    padding: 11px 22px; border-radius: 9px; cursor: pointer; font-size: 14px;
  }
  button.go:disabled { opacity: .55; cursor: default; }
  .examples { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 11px; }
  .examples button {
    background: rgba(255,255,255,.75); border: 1px solid var(--orange-line);
    color: #8A5A44; font-size: 12.5px; padding: 5px 11px; border-radius: 20px; cursor: pointer;
  }
  .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 760px) { .stats { grid-template-columns: repeat(2, 1fr); } }
  .stat { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 15px; }
  .stat .lbl { font-size: 12.5px; color: var(--dim); }
  .stat .val { font-size: 26px; font-weight: 650; letter-spacing: -.5px; margin-top: 2px; }
  .stat .sub { font-size: 11.5px; color: var(--faint); }
  .row { display: grid; grid-template-columns: 1fr 330px; gap: 16px; align-items: start; }
  @media (max-width: 1180px) { .row { grid-template-columns: 1fr; } }
  .agents { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .agent { border: 1px solid var(--line); border-radius: 11px; padding: 13px 14px; }
  .agent.merged { border-color: #BFE7CD; background: #FBFEFC; }
  .agent.blocked { border-color: #F3DDB4; background: #FFFCF6; }
  .agent.failed { border-color: #F3C4C4; background: #FFFAFA; }
  .agent-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
  .agent h3 { margin: 0; font-size: 14px; font-weight: 620; line-height: 1.35; }
  .repo-line { font-family: var(--mono); font-size: 11.5px; color: var(--faint); margin-top: 5px; word-break: break-all; }
  .repo-line a:hover { color: var(--orange); text-decoration: underline; }
  .claims { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
  .claims code {
    font-family: var(--mono); font-size: 11px; background: var(--bg);
    border: 1px solid var(--line); padding: 2px 7px; border-radius: 5px; color: var(--dim);
  }
  .summary { margin-top: 8px; font-size: 13px; color: var(--dim); }
  .note { margin-top: 9px; font-size: 12.5px; }
  .note.warn { color: var(--warn); }
  .findings { margin-top: 10px; border-top: 1px solid var(--line-2); padding-top: 9px; font-size: 12.5px; }
  .findings div { margin-top: 4px; display: flex; gap: 6px; }
  .dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex: none; }
  .d-high { background: var(--bad); } .d-medium { background: var(--warn); } .d-low { background: var(--faint); }
  .log { font-family: var(--mono); font-size: 12px; max-height: 300px; overflow-y: auto; }
  .log div { padding: 3px 0; color: var(--dim); border-bottom: 1px solid var(--line-2); }
  .log div:last-child { border-bottom: 0; }
  .log b { color: var(--orange); font-weight: 600; }
  .phase-line { font-size: 13px; color: var(--dim); margin-bottom: 14px; }
  .phase-line b { color: var(--orange); }
  .replist a { display: flex; align-items: center; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 13.5px; }
  .replist a:last-child { border-bottom: 0; }
  .replist a:hover .nm { color: var(--orange); }
  .replist .nm { font-family: var(--mono); font-size: 12.5px; }
  .replist .when { margin-left: auto; font-size: 12px; color: var(--faint); }
</style>
</head>
<body>
<div class="app">
  ${sidebar("mesh")}
  <div>
    ${topbar("Filter agents, repos, claims…")}
    <main>
      <div class="hero">
        <div class="kicker">Agent-native source control</div>
        <h1>A fork per agent. Claims before work.</h1>
        <p>
          Branches exist because repositories used to be expensive. On Artifacts they are not —
          so every agent task gets its own forked repository, declares the paths it will touch
          before writing a line, and integrates through a serialized merge train instead of a pull request.
        </p>
        <div class="prompt">
          <input type="text" id="req" placeholder="Describe what the swarm should build…"
                 value="Add rate limiting and structured request logging to the service">
          <button class="go" id="go">Run mesh</button>
        </div>
        <div class="examples">
          <button data-ex="Add Google OAuth authentication with session handling">Google auth</button>
          <button data-ex="Add rate limiting and structured request logging to the service">Rate limit + logging</button>
          <button data-ex="Add input validation and a health check endpoint">Validation + health</button>
          <button data-ex="Refactor the request handler and add error handling middleware">Refactor handler</button>
        </div>
      </div>

      <div class="stats" id="stats"></div>

      <div class="row">
        <div>
          <div class="panel">
            <h2>Agent workspaces <span class="hint">one forked Artifacts repo per task</span></h2>
            <div class="pb">
              <div class="phase-line" id="phase">Idle — start a mesh to watch agents fork, commit and merge.</div>
              <div class="agents" id="agents"></div>
            </div>
          </div>
          <div class="panel">
            <h2>Coordinator activity <span class="hint">every repo operation, in order</span></h2>
            <div class="pb"><div class="log" id="logbox"><div class="empty">No activity yet.</div></div></div>
          </div>
        </div>

        <div>
          <div class="panel">
            <h2>Agent team</h2>
            <div class="pb"><div class="team" id="team"></div></div>
          </div>
          <div class="panel">
            <h2>Merge train <span class="hint">serialized into trunk</span></h2>
            <div class="pb"><div id="trainbox"><div class="empty">Empty.</div></div></div>
          </div>
          <div class="panel">
            <h2>Repositories <a class="right" href="/repos">View all →</a></h2>
            <div class="pb"><div class="replist" id="replist"><div class="empty">Loading…</div></div></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
let meshId = null, timer = null, last = null;

function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return Math.floor(s) + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

async function loadRepos() {
  try {
    const d = await (await fetch("/api/repos")).json();
    const rows = (d.repos || []).slice(0, 8);
    $("replist").innerHTML = rows.length ? rows.map(r =>
      '<a href="/repo/' + encodeURIComponent(r.name) + '">' +
      '<span class="nm">' + esc(r.name) + "</span>" +
      '<span class="when">' + ago(r.updatedAt || r.createdAt) + "</span></a>").join("")
      : '<div class="empty">No repositories yet.</div>';
  } catch (_) {}
}

async function start() {
  const request = $("req").value.trim();
  if (!request) return;
  $("go").disabled = true;
  $("agents").innerHTML = "";
  $("logbox").innerHTML = "<div>starting mesh…</div>";
  try {
    const res = await fetch("/api/mesh", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ request })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    meshId = data.meshId;
    clearInterval(timer);
    timer = setInterval(poll, 900);
    poll();
  } catch (err) {
    $("logbox").innerHTML = '<div class="err">' + esc(err.message || err) + "</div>";
    $("go").disabled = false;
  }
}

async function poll() {
  if (!meshId) return;
  try {
    const m = await (await fetch("/api/mesh/" + meshId)).json();
    last = m; render(m);
    if (m.phase === "done" || m.phase === "error") {
      clearInterval(timer); $("go").disabled = false; loadRepos();
    }
  } catch (_) {}
}

function render(m) {
  const agents = m.agents || [];
  const q = $("filter").value.trim().toLowerCase();
  const match = (a) => !q ||
    (a.task.title + " " + a.repo + " " + (a.task.claims || []).join(" ")).toLowerCase().includes(q);

  const merged = agents.filter(a => a.status === "merged").length;
  const working = agents.filter(a => ["developing","testing","reviewing","fixing"].includes(a.status)).length;
  const blocked = agents.filter(a => a.blockedBy && a.blockedBy.length).length;
  const commits = agents.filter(a => a.commit).length;
  const findings = agents.reduce((n, a) => n + (a.findings || []).length, 0);
  $("stats").innerHTML = [
    ["Forked repos", agents.length, "one per task"],
    ["Agents working", working, working ? "concurrent" : merged + " merged"],
    ["Commits pushed", commits, "real Artifacts commits"],
    ["Conflicts prevented", blocked, findings + " security finding(s)"],
  ].map(([l, v, s]) =>
    '<div class="stat"><div class="lbl">' + l + '</div><div class="val">' + v +
    '</div><div class="sub">' + esc(s) + "</div></div>").join("");

  const phases = {
    planning: "Orchestrator is decomposing the request into independent tasks",
    running: "Agents working concurrently, each in its own forked repository",
    merging: "Draining the merge train into trunk",
    done: "Mesh complete",
    error: "Run failed",
  };
  $("phase").innerHTML = "<b>" + esc(m.phase || "idle") + "</b> — " + esc(phases[m.phase] || "") +
    (m.trunk ? ' · trunk <a class="mono" href="/repo/' + encodeURIComponent(m.trunk) + '">' + esc(m.trunk) + "</a>" : "") +
    (m.error ? ' · <span class="err">' + esc(m.error) + "</span>" : "");

  $("agents").innerHTML = agents.filter(match).map(a => {
    const fin = (a.findings || []).map(f =>
      '<div><span class="dot d-' + esc(f.severity) + '"></span><span>' +
      esc(f.path) + " — " + esc(f.message) + "</span></div>").join("");
    const com = (a.comments || []).slice(0, 2).map(c =>
      '<div><span class="dot d-low"></span><span>' + esc(c.path) +
      (c.line ? ":" + c.line : "") + " — " + esc(c.comment) + "</span></div>").join("");
    return '<div class="agent ' + esc(a.status) + '">' +
      '<div class="agent-top"><h3>' + esc(a.task.title) + "</h3>" +
      '<span class="pill p-' + esc(a.status) + '">' + esc(a.status) + "</span></div>" +
      '<div class="repo-line"><a href="/repo/' + encodeURIComponent(a.repo) + '">' + esc(a.repo) + "</a>" +
      (a.commit ? " @ " + esc(a.commit.slice(0,7)) : "") + "</div>" +
      (a.summary ? '<div class="summary">' + esc(a.summary) + "</div>" : "") +
      '<div class="claims">' + (a.task.claims || []).map(c => "<code>" + esc(c) + "</code>").join("") + "</div>" +
      (a.blockedBy && a.blockedBy.length
        ? '<div class="note warn">⏸ sequenced behind ' + esc(a.blockedBy.join(", ")) +
          " — overlapping claims caught before dispatch</div>" : "") +
      (a.files && a.files.length ? '<div class="note">' + a.files.length + " file(s) changed" +
        (a.verdict ? " · review: " + esc(a.verdict) : "") + "</div>" : "") +
      (fin || com ? '<div class="findings">' + fin + com + "</div>" : "") +
      (a.error ? '<div class="note err">' + esc(a.error) + "</div>" : "") +
      "</div>";
  }).join("") || '<div class="empty">No agents yet.</div>';

  const activeKeys = new Set();
  agents.forEach(a => (ACTIVE_FOR[a.status] || []).forEach(k => activeKeys.add(k)));
  if (m.phase === "planning") activeKeys.add("orchestrator");
  const done = agents.length ? merged / agents.length : 0;
  $("team").innerHTML = ROLES.map(r => {
    const on = activeKeys.has(r.key);
    const pct = r.key === "orchestrator"
      ? (m.phase === "planning" ? 45 : agents.length ? 100 : 0)
      : Math.round(done * 100);
    return '<div class="tm"><div class="tm-ic">' + r.icon + "</div>" +
      '<div class="tm-body"><div class="tm-name"><span>' +
      r.key.charAt(0).toUpperCase() + r.key.slice(1) + "</span>" +
      '<span class="' + (on ? "live" : "idle") + '">' + (on ? "● active" : "idle") + "</span></div>" +
      '<div class="tm-role">' + r.role + "</div>" +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></div></div>';
  }).join("");

  const train = agents.filter(a => ["ready","merged"].includes(a.status));
  $("trainbox").innerHTML = train.length ? train.map((a, i) =>
    '<div class="tm"><div class="tm-ic">' + (i + 1) + "</div>" +
    '<div class="tm-body"><div class="tm-name"><span>' + esc(a.task.id) + "</span>" +
    '<span class="pill p-' + esc(a.status) + '">' + esc(a.status) + "</span></div>" +
    '<div class="tm-role">' + (a.files || []).length + " file(s)" +
    (a.commit ? " · " + esc(a.commit.slice(0,7)) : "") + "</div></div></div>").join("")
    : '<div class="empty">Empty.</div>';

  const box = $("logbox");
  const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
  box.innerHTML = (m.log || []).map(l =>
    "<div><b>" + esc(l.agent) + "</b> " + esc(l.msg) + "</div>").join("") ||
    '<div class="empty">No activity yet.</div>';
  if (atBottom) box.scrollTop = box.scrollHeight;
}

$("go").onclick = start;
$("req").addEventListener("keydown", e => { if (e.key === "Enter") start(); });
$("filter").addEventListener("input", () => { if (last) render(last); });
document.querySelectorAll(".examples button").forEach(b => {
  b.onclick = () => { $("req").value = b.dataset.ex; };
});
render({ phase: "idle", agents: [], log: [] });
loadRepos();
</script>
</body>
</html>`;
