import { head, sidebar, topbar, ROLES_JS } from "./shell";

/** Work Items — real, persistent, Durable-Object backed. */
export const ITEMS_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Work Items — CodeMesh")}
<style>
  h1.page { margin: 0 0 4px; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  p.page { margin: 0 0 16px; color: var(--dim); font-size: 13.5px; max-width: 760px; }
  .bar { display: flex; gap: 9px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .newbtn {
    background: var(--orange); color: #fff; border: 0; font-weight: 600;
    padding: 10px 18px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .newbtn:disabled { opacity: .55; cursor: default; }
  .ghostbtn {
    background: var(--panel); color: var(--dim); border: 1px solid var(--line);
    padding: 10px 16px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .ghostbtn.on { border-color: var(--orange); color: var(--orange); background: var(--orange-soft); }
  .createbox {
    background: var(--panel); border: 1px solid var(--orange-line); border-radius: 12px;
    padding: 14px 16px; margin-bottom: 16px; display: none; flex-direction: column; gap: 9px;
  }
  .createbox input, .createbox textarea {
    background: var(--bg); border: 1px solid var(--line); border-radius: 9px;
    padding: 10px 13px; font-size: 13.5px; font-family: inherit; color: var(--text); width: 100%;
  }
  .createbox textarea { min-height: 86px; resize: vertical; }
  .createbox input:focus, .createbox textarea:focus { outline: none; border-color: var(--orange); background: #fff; }
  .il { }
  .il .item { display: flex; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--line-2); }
  .il .item:last-child { border-bottom: 0; }
  .il .ic { font-size: 15px; flex: none; margin-top: 1px; }
  .il .ic.open { color: var(--ok); } .il .ic.closed { color: var(--faint); }
  .il .t { font-size: 14px; font-weight: 600; cursor: pointer; }
  .il .t:hover { color: var(--orange); }
  .il .s { font-size: 12.5px; color: var(--faint); margin-top: 3px; }
  .il .body { font-size: 13px; color: var(--dim); margin-top: 7px; white-space: pre-wrap; display: none; }
  .il .item.expanded .body { display: block; }
  .labels { display: inline-flex; gap: 5px; margin-left: 7px; }
  .lb { font-size: 10.5px; border-radius: 20px; padding: 1px 8px; background: var(--blue-bg); color: var(--blue); font-weight: 600; }
  .lb.sec { background: var(--bad-bg); color: var(--bad); }
  .lb.agent { background: var(--orange-soft); color: var(--orange); }
  .acts { margin-left: auto; display: flex; gap: 7px; align-items: flex-start; }
  .mini { background: none; border: 1px solid var(--line); border-radius: 7px; padding: 4px 10px;
          font-size: 12px; color: var(--dim); cursor: pointer; }
  .mini:hover { border-color: var(--orange); color: var(--orange); }
  .cmts { margin-top: 9px; display: none; }
  .item.expanded .cmts { display: block; }
  .cmt { display: flex; gap: 8px; font-size: 12.5px; padding: 6px 0; border-top: 1px solid var(--line-2); }
  .cmt b { color: var(--text); }
  .cmtbox { display: flex; gap: 7px; margin-top: 8px; }
  .cmtbox input { flex: 1; background: var(--bg); border: 1px solid var(--line);
                  border-radius: 8px; padding: 7px 11px; font-size: 12.5px; }
  .hintline { font-size: 12.5px; color: var(--faint); }
  .hintline.err { color: var(--bad); } .hintline.ok { color: var(--ok); }
</style>
</head>
<body>
<div class="app">
  ${sidebar("items")}
  <div>
    ${topbar("Filter work items…")}
    <main>
      <h1 class="page">Work Items</h1>
      <p class="page">Persistent work tracking for the workspace. Items can be opened by you or
         raised automatically by the Security agent when a finding is too severe for Auto-Fix
         to quietly patch over.</p>
      <div class="bar">
        <button class="newbtn" id="newBtn">+ New work item</button>
        <button class="ghostbtn on" data-f="open" id="fOpen">Open <b id="nOpen">0</b></button>
        <button class="ghostbtn" data-f="closed" id="fClosed">Closed <b id="nClosed">0</b></button>
        <button class="ghostbtn" data-f="all">All</button>
      </div>
      <div class="createbox" id="box">
        <input type="text" id="nTitle" placeholder="Title">
        <textarea id="nBody" placeholder="What needs doing, and why?"></textarea>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="newbtn" id="createGo">Create</button>
          <button class="ghostbtn" id="createCancel">Cancel</button>
          <span class="hintline" id="cMsg"></span>
        </div>
      </div>
      <div class="panel"><div class="il" id="list"><div class="empty" style="padding:14px 16px">Loading…</div></div></div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
let items = [], filter = "open";

function when(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

async function load() {
  try {
    const d = await (await fetch("/api/items")).json();
    items = d.items || [];
    $("nOpen").textContent = d.open || 0;
    $("nClosed").textContent = d.closed || 0;
    paint();
  } catch (e) {
    $("list").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }
}

function paint() {
  const q = $("filter").value.toLowerCase();
  const rows = items
    .filter(i => filter === "all" || i.state === filter)
    .filter(i => (i.title + " " + i.body).toLowerCase().includes(q));
  $("list").innerHTML = rows.length ? rows.map(i =>
    '<div class="item" data-id="' + i.id + '">' +
    '<span class="ic ' + i.state + '">' + (i.state === "open" ? "◉" : "✓") + "</span>" +
    '<div style="flex:1"><div class="t">#' + i.id + " " + esc(i.title) +
      '<span class="labels">' + (i.labels || []).map(l =>
        '<span class="lb ' + (l === "security" ? "sec" : l === "agent-raised" ? "agent" : "") + '">' +
        esc(l) + "</span>").join("") + "</span></div>" +
    '<div class="s">' + esc(i.author) + " opened this " + when(i.createdAt) +
      (i.repo ? " · " + esc(i.repo) : "") +
      (i.comments.length ? " · " + i.comments.length + " comment(s)" : "") + "</div>" +
    '<div class="body">' + esc(i.body || "No description.") + "</div>" +
    '<div class="cmts">' + i.comments.map(c =>
      '<div class="cmt"><b>' + esc(c.author) + "</b><span>" + esc(c.body) + "</span>" +
      '<span style="margin-left:auto;color:var(--faint)">' + when(c.at) + "</span></div>").join("") +
      '<div class="cmtbox"><input type="text" placeholder="Add a comment…" data-c="' + i.id + '">' +
      '<button class="mini" data-cs="' + i.id + '">Comment</button></div></div>' +
    "</div>" +
    '<div class="acts"><button class="mini" data-toggle="' + i.id + '">' +
      (i.state === "open" ? "Close" : "Reopen") + "</button></div></div>").join("")
    : '<div class="empty" style="padding:14px 16px">No work items here.</div>';

  document.querySelectorAll(".il .t").forEach(el => {
    el.onclick = () => el.closest(".item").classList.toggle("expanded");
  });
  document.querySelectorAll("[data-toggle]").forEach(b => {
    b.onclick = async () => {
      const i = items.find(x => x.id === Number(b.dataset.toggle));
      await fetch("/api/items/update", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: i.id, state: i.state === "open" ? "closed" : "open" }) });
      load();
    };
  });
  document.querySelectorAll("[data-cs]").forEach(b => {
    b.onclick = async () => {
      const id = Number(b.dataset.cs);
      const input = document.querySelector('[data-c="' + id + '"]');
      if (!input.value.trim()) return;
      await fetch("/api/items/update", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, comment: input.value }) });
      load();
    };
  });
}

$("newBtn").onclick = () => {
  const b = $("box");
  b.style.display = b.style.display === "flex" ? "none" : "flex";
  if (b.style.display === "flex") $("nTitle").focus();
};
$("createCancel").onclick = () => { $("box").style.display = "none"; };
$("createGo").onclick = async () => {
  const title = $("nTitle").value.trim();
  if (!title) return;
  $("createGo").disabled = true;
  $("cMsg").className = "hintline";
  $("cMsg").textContent = "Creating…";
  try {
    const r = await fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body: $("nBody").value }) });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    $("cMsg").className = "hintline ok";
    $("cMsg").textContent = "Created #" + d.id;
    $("nTitle").value = ""; $("nBody").value = "";
    $("box").style.display = "none";
    load();
  } catch (e) {
    $("cMsg").className = "hintline err";
    $("cMsg").textContent = String(e.message || e);
  } finally { $("createGo").disabled = false; }
};
document.querySelectorAll("[data-f]").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll("[data-f]").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    filter = b.dataset.f;
    paint();
  };
});
$("filter").addEventListener("input", paint);
load();
</script>
</body>
</html>`;

/** Trust Center — every security finding the mesh has ever produced. */
export const SECURITY_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Trust Center — CodeMesh")}
<style>
  h1.page { margin: 0 0 4px; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  p.page { margin: 0 0 16px; color: var(--dim); font-size: 13.5px; max-width: 780px; }
  .sev { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
  @media (max-width: 760px) { .sev { grid-template-columns: repeat(2, 1fr); } }
  .sc { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px 15px; }
  .sc .l { font-size: 12.5px; color: var(--dim); }
  .sc .v { font-size: 26px; font-weight: 650; letter-spacing: -.5px; margin-top: 2px; }
  .sc.high .v { color: var(--bad); } .sc.medium .v { color: var(--warn); } .sc.low .v { color: var(--dim); }
  .f { display: flex; gap: 11px; padding: 12px 16px; border-bottom: 1px solid var(--line-2); }
  .f:last-child { border-bottom: 0; }
  .dot { width: 9px; height: 9px; border-radius: 50%; margin-top: 6px; flex: none; }
  .d-high { background: var(--bad); } .d-medium { background: var(--warn); } .d-low { background: var(--faint); }
  .f .m { font-size: 13.5px; }
  .f .s { font-size: 12px; color: var(--faint); margin-top: 3px; font-family: var(--mono); }
  .note { font-size: 13px; color: var(--dim); line-height: 1.6; }
  .posture div { display: flex; gap: 9px; font-size: 13px; padding: 6px 0; }
  .ok { color: var(--ok); }
</style>
</head>
<body>
<div class="app">
  ${sidebar("security")}
  <div>
    ${topbar("Filter findings…")}
    <main>
      <h1 class="page">Trust Center</h1>
      <p class="page">Every finding the Security agent has produced across all mesh runs, read
         back from the runs themselves. Findings above low severity are fed to Auto-Fix before
         a change proposal is allowed onto the merge train.</p>
      <div class="sev" id="sev"></div>
      <div class="panel">
        <h2>Findings <span class="hint" id="fh"></span></h2>
        <div id="list"><div class="empty" style="padding:14px 16px">Loading…</div></div>
      </div>
      <div class="panel">
        <h2>Platform posture <span class="hint">how CodeMesh itself is secured</span></h2>
        <div class="pb posture">
          <div><span class="ok">✓</span><span>Tokens are repo-scoped — a leaked fork token reaches exactly one repository</span></div>
          <div><span class="ok">✓</span><span>Write tokens are minted per operation with a short TTL and never leave the Worker</span></div>
          <div><span class="ok">✓</span><span>Agents never touch git: the coordinator is the only writer, so a prompt-injected agent cannot corrupt trunk</span></div>
          <div><span class="ok">✓</span><span>Agent output is treated as data — it becomes file contents, never executed</span></div>
          <div><span class="ok">✓</span><span>Repository names are validated against an allowlist pattern before creation</span></div>
        </div>
      </div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
let all = [];

(async () => {
  let repos = [];
  try { repos = (await (await fetch("/api/repos")).json()).repos || []; } catch (e) {}
  const meshIds = [...new Set(repos
    .map(r => (r.name.match(/^trunk-([a-z0-9]+)/) || [])[1]).filter(Boolean))];

  await Promise.all(meshIds.map(async id => {
    try {
      const m = await (await fetch("/api/mesh/" + id)).json();
      (m.agents || []).forEach(a => (a.findings || []).forEach(f =>
        all.push({ ...f, repo: a.repo, task: a.task.id })));
    } catch (e) {}
  }));

  const n = s => all.filter(f => f.severity === s).length;
  $("sev").innerHTML = [
    ["", "Total findings", all.length],
    ["high", "High", n("high")],
    ["medium", "Medium", n("medium")],
    ["low", "Low", n("low")],
  ].map(([c, l, v]) =>
    '<div class="sc ' + c + '"><div class="l">' + l + '</div><div class="v">' + v + "</div></div>").join("");

  paint();
  $("filter").addEventListener("input", paint);
})();

function paint() {
  const q = ($("filter").value || "").toLowerCase();
  const order = { high: 0, medium: 1, low: 2 };
  const rows = all
    .filter(f => (f.message + " " + f.path + " " + f.repo).toLowerCase().includes(q))
    .sort((a, b) => order[a.severity] - order[b.severity]);
  $("fh").textContent = rows.length + " shown";
  $("list").innerHTML = rows.length ? rows.map(f =>
    '<div class="f"><span class="dot d-' + esc(f.severity) + '"></span>' +
    '<div><div class="m">' + esc(f.message) + "</div>" +
    '<div class="s">' + esc(f.severity) + " · " + esc(f.path) +
    ' · <a href="/proposal/' + encodeURIComponent(f.repo) + '">' + esc(f.task) + "</a></div></div></div>").join("")
    : '<div class="empty" style="padding:14px 16px">No findings recorded yet. Run a mesh.</div>';
}
</script>
</body>
</html>`;
