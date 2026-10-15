import { head, sidebar, topbar, ROLES_JS } from "./shell";

/** Repository browser. Every value on this page comes from the Artifacts binding. */
export const REPO_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Repository — CodeMesh")}
<style>
  .crumb { font-size: 13px; color: var(--dim); margin-bottom: 10px; }
  .crumb a:hover { color: var(--orange); }
  .rhead { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
  .rhead .ico {
    width: 46px; height: 46px; border-radius: 11px; flex: none; display: grid; place-items: center;
    background: linear-gradient(135deg, var(--orange-2), var(--orange)); color: #fff; font-size: 20px;
  }
  .rhead h1 { margin: 0; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  .rhead h1 .ns { color: var(--dim); font-weight: 500; }
  .rhead .desc { color: var(--dim); font-size: 13.5px; margin-top: 3px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 9px; align-items: center; }
  .badge {
    display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line);
    border-radius: 8px; padding: 4px 10px; font-size: 12.5px; color: var(--dim); background: var(--panel);
  }
  .badge b { color: var(--text); font-weight: 600; }
  .tabs { display: flex; gap: 3px; border-bottom: 1px solid var(--line); margin-bottom: 16px; }
  .tabs button {
    background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
    padding: 9px 14px; font-size: 13.5px; color: var(--dim); font-weight: 500;
  }
  .tabs button.on { color: var(--orange); border-bottom-color: var(--orange); font-weight: 600; }
  .row { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
  @media (max-width: 1180px) { .row { grid-template-columns: 1fr; } }
  .files a, .files div.f {
    display: flex; align-items: center; gap: 9px; padding: 9px 16px;
    border-bottom: 1px solid var(--line-2); font-size: 13.5px; cursor: pointer;
  }
  .files .f:last-child { border-bottom: 0; }
  .files .f:hover { background: var(--bg); }
  .files .f.on { background: var(--orange-soft); }
  .files .nm { font-family: var(--mono); font-size: 12.5px; }
  .files .f:hover .nm { color: var(--orange); }
  .files .sz { margin-left: auto; font-size: 12px; color: var(--faint); }
  .fileview { border-top: 1px solid var(--line-2); }
  .fileview-head {
    display: flex; align-items: center; gap: 10px; padding: 10px 16px;
    background: var(--bg); border-bottom: 1px solid var(--line-2); font-size: 13px;
  }
  .fileview-head .nm { font-family: var(--mono); font-weight: 600; }
  pre {
    margin: 0; padding: 14px 16px; overflow-x: auto; font-family: var(--mono);
    font-size: 12.5px; line-height: 1.6; background: #FCFCFD; max-height: 560px;
  }
  .commits .c { display: flex; gap: 11px; padding: 11px 16px; border-bottom: 1px solid var(--line-2); }
  .commits .c:last-child { border-bottom: 0; }
  .commits .av {
    width: 30px; height: 30px; border-radius: 8px; flex: none; display: grid; place-items: center;
    background: var(--orange-soft); color: var(--orange); font-family: var(--mono);
    font-weight: 700; font-size: 12px;
  }
  .commits .msg { font-size: 13.5px; font-weight: 550; }
  .commits .sub { font-size: 12px; color: var(--faint); margin-top: 2px; }
  .commits .sha {
    margin-left: auto; font-family: var(--mono); font-size: 12px; color: var(--dim);
    border: 1px solid var(--line); border-radius: 6px; padding: 2px 7px; height: fit-content;
  }
  .kv { font-size: 13px; }
  .kv div { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line-2); }
  .kv div:last-child { border-bottom: 0; }
  .kv .k { color: var(--faint); min-width: 104px; }
  .kv .v { color: var(--text); word-break: break-all; }
  .kv .v.mono { font-family: var(--mono); font-size: 12px; }
  .runbox {
    background: linear-gradient(110deg, #FFF8F4, #FFEFE6);
    border: 1px solid var(--orange-line); border-radius: 12px;
    padding: 14px 16px; margin-bottom: 16px;
  }
  .runhead { font-size: 13.5px; font-weight: 650; color: var(--orange); margin-bottom: 9px; }
  .runrow { display: flex; gap: 9px; flex-wrap: wrap; }
  .runrow input {
    flex: 1; min-width: 260px; background: #fff; border: 1px solid var(--orange-line);
    border-radius: 9px; padding: 10px 13px; font-size: 13.5px; color: var(--text);
  }
  .runrow input:focus { outline: none; border-color: var(--orange); }
  .runlog { margin-top: 10px; font-family: var(--mono); font-size: 11.5px;
            color: var(--dim); max-height: 150px; overflow-y: auto; }
  .runlog div { padding: 1px 0; }
  .tabs .n { background: var(--bg); border-radius: 20px; padding: 1px 7px;
             font-size: 11.5px; margin-left: 5px; color: var(--dim); }
  .tabs button.on .n { background: var(--orange-soft); color: var(--orange); }
  .br { display: flex; gap: 11px; padding: 12px 16px; border-bottom: 1px solid var(--line-2); align-items: center; }
  .br:last-child { border-bottom: 0; }
  .br .nm { font-family: var(--mono); font-size: 13px; font-weight: 600; }
  .br .def { font-size: 10.5px; background: var(--orange-soft); color: var(--orange);
             border-radius: 20px; padding: 1px 9px; font-weight: 600; }
  .br .oid { margin-left: auto; font-family: var(--mono); font-size: 12px; color: var(--dim);
             border: 1px solid var(--line); border-radius: 6px; padding: 2px 7px; }
  #edBody {
    width: 100%; min-height: 360px; border: 0; border-top: 1px solid var(--line-2);
    padding: 14px 16px; font-family: var(--mono); font-size: 12.5px; line-height: 1.6;
    resize: vertical; background: #FCFCFD; color: var(--text);
  }
  #edBody:focus { outline: none; background: #fff; }
  .commitbox { border-top: 1px solid var(--line-2); padding: 14px 16px; background: var(--bg); }
  .cb-title { font-size: 13.5px; font-weight: 650; margin-bottom: 9px; }
  .radio { display: flex; gap: 9px; align-items: flex-start; font-size: 13px;
           padding: 7px 0; color: var(--dim); cursor: pointer; }
  .radio input { margin-top: 3px; accent-color: var(--orange); }
  .radio b { color: var(--text); font-weight: 600; }
  .radio code { font-family: var(--mono); font-size: 12px; }
  .cb-ai {
    margin: 9px 0; padding: 9px 11px; background: var(--orange-soft);
    border: 1px solid var(--orange-line); border-radius: 8px;
    font-size: 12.5px; color: #8A5A44;
  }
  .cb-actions { display: flex; gap: 8px; margin-top: 4px; }
  .newbtn {
    background: var(--orange); color: #fff; border: 0; font-weight: 600;
    padding: 9px 18px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .newbtn:disabled { opacity: .55; cursor: default; }
  .ghostbtn {
    background: var(--panel); color: var(--dim); border: 1px solid var(--line);
    padding: 9px 16px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .hintline { font-size: 12.5px; color: var(--faint); margin-top: 9px; }
  .hintline.err { color: var(--bad); }
  .hintline.ok { color: var(--ok); }
  button.badge { cursor: pointer; font-family: inherit; }
  .hrow { display: flex; gap: 11px; padding: 10px 16px; border-bottom: 1px solid var(--line-2);
          align-items: center; font-size: 13px; }
  .hrow:last-child { border-bottom: 0; }
  .hrow .av {
    width: 26px; height: 26px; border-radius: 7px; flex: none; display: grid; place-items: center;
    background: var(--orange-soft); color: var(--orange); font-family: var(--mono);
    font-weight: 700; font-size: 11px;
  }
  .hrow .m { font-weight: 550; }
  .hrow .s { font-size: 11.5px; color: var(--faint); }
  .hrow .ch { margin-left: auto; display: flex; gap: 8px; align-items: center; font-size: 12px; }
  .hrow .ch .a { color: var(--ok); font-weight: 600; }
  .hrow .ch .d { color: var(--bad); font-weight: 600; }
  .hrow .ch .sha { font-family: var(--mono); color: var(--dim);
                   border: 1px solid var(--line); border-radius: 6px; padding: 2px 7px; }
  .hrow .tagc { font-size: 10.5px; border-radius: 20px; padding: 1px 8px; font-weight: 600;
                background: var(--blue-bg); color: var(--blue); }
  .hrow .tagc.added { background: var(--ok-bg); color: var(--ok); }
  .hrow .tagc.removed { background: var(--bad-bg); color: var(--bad); }
</style>
</head>
<body>
<div class="app">
  ${sidebar("repos")}
  <div>
    ${topbar("Go to file…")}
    <main>
      <div class="crumb"><a href="/repos">Repositories</a> / <span id="crumbNs">codemesh</span></div>
      <div class="rhead">
        <div class="ico">▤</div>
        <div style="flex:1">
          <h1><span class="ns">codemesh /</span> <span id="rname">…</span></h1>
          <div class="desc" id="rdesc"></div>
          <div class="badges" id="rbadges"></div>
        </div>
      </div>

      <div class="runbox">
        <div class="runhead">✦ Run a mesh on this codebase</div>
        <div class="runrow">
          <input type="text" id="runReq" placeholder="Describe what the swarm should build here…">
          <button class="newbtn" id="runGo">Run mesh</button>
        </div>
        <div class="hintline" id="runMsg">Agents fork this codebase, work concurrently, and
          integrate back into it through the merge train.</div>
      </div>

      <div class="tabs">
        <button class="on" data-tab="code">Code</button>
        <button data-tab="commits">Commits</button>
        <button data-tab="branches">Branches <span class="n" id="nBranches"></span></button>
        <button data-tab="settings">Settings</button>
      </div>

      <div class="row">
        <div>
          <div class="panel" id="paneCode">
            <h2>Files <span class="hint" id="fileCount"></span></h2>
            <div class="files" id="files"><div class="empty" style="padding:14px 16px">Loading…</div></div>
            <div class="fileview" id="fileview" style="display:none">
              <div class="fileview-head"><span class="nm" id="fvName"></span>
                <span class="spacer" style="flex:1"></span>
                <button class="badge" id="fvHist">◷ History</button>
                <button class="badge" id="fvEdit">✎ Edit</button>
                <a class="badge" id="fvRaw" target="_blank" rel="noopener">Raw</a></div>
              <div id="history" style="display:none"></div>
              <pre id="fvBody"></pre>
              <div id="editor" style="display:none">
                <textarea id="edBody" spellcheck="false"></textarea>
                <div class="commitbox">
                  <div class="cb-title">Commit this change</div>
                  <label class="radio"><input type="radio" name="cmode" value="branch" checked>
                    <span><b>Create a new branch</b> — opens a change proposal, trunk untouched</span></label>
                  <label class="radio"><input type="radio" name="cmode" value="direct">
                    <span><b>Commit directly to <code id="cbBranch">main</code></b></span></label>
                  <div class="cb-ai">✦ The commit message and description are written by the
                    Change Intelligence agent from your actual diff — you do not type them.</div>
                  <div class="cb-actions">
                    <button class="newbtn" id="edSave">Commit change</button>
                    <button class="ghostbtn" id="edCancel">Cancel</button>
                  </div>
                  <div class="hintline" id="edMsg"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="panel" id="paneCommits" style="display:none">
            <h2>Commits <span class="hint">authored by the agent that made them</span></h2>
            <div class="commits" id="commits"><div class="empty" style="padding:14px 16px">Loading…</div></div>
          </div>
          <div class="panel" id="paneBranches" style="display:none">
            <h2>Branches <span class="hint">read off the Git remote</span></h2>
            <div id="branches"><div class="empty" style="padding:14px 16px">Loading…</div></div>
          </div>
          <div class="panel" id="paneSettings" style="display:none">
            <h2>Settings <span class="hint">live from the Artifacts control plane</span></h2>
            <div class="pb"><div class="kv" id="settingsKv"></div></div>
          </div>
        </div>

        <div>
          <div class="panel">
            <h2>Repository details</h2>
            <div class="pb"><div class="kv" id="details"></div></div>
          </div>
          <div class="panel">
            <h2>Agent team</h2>
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
const REPO = decodeURIComponent(location.pathname.replace(/^\\/repo\\//, ""));
let entries = [], commits = [], repoMetaCache = null;

function fmtDate(sec) {
  return new Date(sec * 1000).toLocaleString();
}

async function j(url) { const r = await fetch(url); if (!r.ok) throw new Error(await r.text()); return r.json(); }

async function load() {
  $("rname").textContent = REPO;
  document.title = REPO + " — CodeMesh";

  // Repository metadata comes from the real repo listing.
  try {
    const d = await j("/api/repos");
    const r = (d.repos || []).find(x => x.name === REPO);
    repoMetaCache = r;
    if (r) {
      $("rdesc").textContent = r.description || "Created by a CodeMesh agent run.";
      $("rbadges").innerHTML =
        '<span class="badge">' + (r.status === "ready" ? "✓ " : "") + esc(r.status) + "</span>" +
        '<span class="badge">default branch <b>' + esc(r.defaultBranch) + "</b></span>" +
        (REPO.includes("-") && !REPO.startsWith("trunk-") ? "" : "");
      defaultBranch = r.defaultBranch || "main";
      $("details").innerHTML = [
        ["Status", esc(r.status), ""],
        ["Default branch", esc(r.defaultBranch), ""],
        ["Created", new Date(r.createdAt).toLocaleString(), ""],
        ["Updated", new Date(r.updatedAt).toLocaleString(), ""],
        ["Jurisdiction", esc(r.jurisdiction || "—"), ""],
        ["Repo ID", esc(r.id), "mono"],
        ["Git remote", esc(r.remote), "mono"],
      ].map(([k, v, c]) =>
        '<div><span class="k">' + k + '</span><span class="v ' + c + '">' + v + "</span></div>").join("");
    }
  } catch (e) { $("rdesc").textContent = "Could not load metadata."; }

  // File tree
  try {
    const t = await j("/api/repos/" + encodeURIComponent(REPO) + "/tree");
    entries = t.entries || [];
    $("fileCount").textContent = entries.length + " file(s) at main";
    $("files").innerHTML = entries.length ? entries.map(p =>
      '<div class="f" data-path="' + esc(p) + '"><span>' +
      (p.includes("/") ? "▸" : "▪") + '</span><span class="nm">' + esc(p) + "</span></div>").join("")
      : '<div class="empty" style="padding:14px 16px">Empty repository.</div>';
    document.querySelectorAll(".files .f").forEach(el => {
      el.onclick = () => openFile(el.dataset.path, el);
    });
    const first = entries.find(p => /readme/i.test(p)) || entries[0];
    if (first) {
      const el = document.querySelector('.files .f[data-path="' + CSS.escape(first) + '"]');
      openFile(first, el);
    }
  } catch (e) {
    $("files").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }

  // Commit history
  try {
    commits = await j("/api/repos/" + encodeURIComponent(REPO) + "/log");
    $("commits").innerHTML = commits.length ? commits.map(c => {
      const who = c.author.name.replace(/^codemesh-/, "");
      return '<div class="c"><div class="av">' + esc(who.charAt(0).toUpperCase()) + "</div>" +
        '<div style="flex:1"><div class="msg">' + esc(c.message.split("\\n")[0]) + "</div>" +
        '<div class="sub">' + esc(c.author.name) + " · " + fmtDate(c.committedAt) + "</div></div>" +
        '<span class="sha">' + esc(c.hash.slice(0, 7)) + "</span></div>";
    }).join("") : '<div class="empty" style="padding:14px 16px">No commits.</div>';
  } catch (e) {
    $("commits").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }

  // Branches, straight off the remote.
  try {
    const b = await j("/api/repos/" + encodeURIComponent(REPO) + "/branches");
    const list = b.branches || [];
    $("nBranches").textContent = list.length;
    $("branches").innerHTML = list.length ? list.map(x =>
      '<div class="br"><span>⑂</span><span class="nm">' + esc(x.name) + "</span>" +
      (x.name === b.defaultBranch ? '<span class="def">default</span>' : "") +
      '<span class="oid">' + esc(x.oid.slice(0, 7)) + "</span></div>").join("")
      : '<div class="empty" style="padding:14px 16px">No branches.</div>';
  } catch (e) {
    $("branches").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }

  // Settings mirror the repository details, plus the policy that is fixed.
  if (repoMetaCache) {
    const r = repoMetaCache;
    $("settingsKv").innerHTML = [
      ["Name", r.name, "mono"],
      ["Default branch", r.defaultBranch, "mono"],
      ["Visibility", "private to this account", ""],
      ["Read only", String(r.readOnly), ""],
      ["Status", r.status, ""],
      ["Forked from", r.source || "— (root repository)", "mono"],
      ["Jurisdiction", r.jurisdiction || "unrestricted", ""],
      ["Repo ID", r.id, "mono"],
      ["Git remote", r.remote, "mono"],
      ["Merge policy", "serialized merge train — one writer", ""],
      ["Conflict policy", "claims arbitrated at dispatch", ""],
    ].map(([k, v, c]) =>
      '<div><span class="k">' + k + '</span><span class="v ' + c + '">' + esc(v) + "</span></div>").join("");
  }

  renderTeam();
}

async function openFile(path, el) {
  currentPath = path;
  $("history").style.display = "none";
  document.querySelectorAll(".files .f").forEach(n => n.classList.remove("on"));
  if (el) el.classList.add("on");
  const url = "/api/repos/" + encodeURIComponent(REPO) + "/file?path=" + encodeURIComponent(path);
  $("fileview").style.display = "";
  $("fvName").textContent = path;
  $("fvRaw").href = url;
  $("fvBody").textContent = "Loading…";
  try {
    const r = await fetch(url);
    $("fvBody").textContent = r.ok ? await r.text() : "Could not read file.";
  } catch (e) { $("fvBody").textContent = String(e); }
}

/**
 * Which agent produced this repository, inferred from commit authors — the
 * identity is carried in git itself, not in a side table.
 */
function renderTeam() {
  const authors = new Set(commits.map(c => c.author.name.replace(/^codemesh-/, "")));
  $("team").innerHTML = ROLES.map(r => {
    const touched = [...authors].some(a => a.includes(r.key)) ||
      (r.key === "orchestrator" && authors.has("coordinator"));
    return '<div class="tm"><div class="tm-ic">' + r.icon + "</div>" +
      '<div class="tm-body"><div class="tm-name"><span>' +
      r.key.charAt(0).toUpperCase() + r.key.slice(1) + "</span>" +
      '<span class="' + (touched ? "live" : "idle") + '">' + (touched ? "● contributed" : "—") + "</span></div>" +
      '<div class="tm-role">' + r.role + "</div></div></div>";
  }).join("");
}

const PANES = { code: "paneCode", commits: "paneCommits", branches: "paneBranches", settings: "paneSettings" };
document.querySelectorAll(".tabs button").forEach(b => {
  b.onclick = () => {
    document.querySelectorAll(".tabs button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    Object.entries(PANES).forEach(([k, id]) => {
      $(id).style.display = b.dataset.tab === k ? "" : "none";
    });
  };
});
$("filter").addEventListener("input", () => {
  const q = $("filter").value.toLowerCase();
  document.querySelectorAll(".files .f").forEach(el => {
    el.style.display = el.dataset.path.toLowerCase().includes(q) ? "" : "none";
  });
});
let currentPath = null, defaultBranch = "main";

$("fvEdit").onclick = () => {
  $("history").style.display = "none";
  $("edBody").value = $("fvBody").textContent;
  $("fvBody").style.display = "none";
  $("editor").style.display = "";
  $("fvEdit").style.display = "none";
  $("cbBranch").textContent = defaultBranch;
  $("edMsg").textContent = "";
  $("edMsg").className = "hintline";
};
function closeEditor() {
  $("editor").style.display = "none";
  $("fvBody").style.display = "";
  $("fvEdit").style.display = "";
}
$("edCancel").onclick = closeEditor;

$("edSave").onclick = async () => {
  const mode = document.querySelector('input[name="cmode"]:checked').value;
  const msg = $("edMsg");
  $("edSave").disabled = true;
  msg.className = "hintline";
  msg.textContent = "Committing — the agent is writing the message from your diff…";
  try {
    const res = await fetch("/api/repos/" + encodeURIComponent(REPO) + "/edit", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: currentPath, content: $("edBody").value, mode })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    msg.className = "hintline ok";
    msg.innerHTML = "✓ <b>" + esc(d.message) + "</b> — " + esc(d.commit.slice(0, 7)) +
      " on <code>" + esc(d.branch) + "</code>" +
      (d.created ? " (new branch)" : "") + "<br>" + esc(d.description);
    $("fvBody").textContent = $("edBody").value;
    setTimeout(() => { closeEditor(); load(); }, 2600);
  } catch (e) {
    msg.className = "hintline err";
    msg.textContent = String(e.message || e);
  } finally {
    $("edSave").disabled = false;
  }
};

// --- per-file history ---
$("fvHist").onclick = async () => {
  const h = $("history");
  if (h.style.display !== "none") {
    h.style.display = "none";
    $("fvBody").style.display = "";
    return;
  }
  $("fvBody").style.display = "none";
  h.style.display = "";
  h.innerHTML = '<div class="empty" style="padding:14px 16px">Reading history…</div>';
  try {
    const d = await j("/api/repos/" + encodeURIComponent(REPO) +
      "/history?path=" + encodeURIComponent(currentPath));
    h.innerHTML = (d.commits || []).length ? d.commits.map(c =>
      '<div class="hrow"><div class="av">' +
      esc(c.author.replace(/^codemesh-/, "").charAt(0).toUpperCase()) + "</div>" +
      '<div><div class="m">' + esc(c.message) + "</div>" +
      '<div class="s">' + esc(c.author) + " · " + new Date(c.at * 1000).toLocaleString() + "</div></div>" +
      '<div class="ch"><span class="tagc ' + esc(c.change) + '">' + esc(c.change) + "</span>" +
      (c.additions ? '<span class="a">+' + c.additions + "</span>" : "") +
      (c.deletions ? '<span class="d">-' + c.deletions + "</span>" : "") +
      '<span class="sha">' + esc(c.hash.slice(0, 7)) + "</span></div></div>").join("")
      : '<div class="empty" style="padding:14px 16px">No recorded changes to this file.</div>';
  } catch (e) {
    h.innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }
};

// --- run a mesh against this codebase ---
let runTimer = null;
$("runGo").onclick = async () => {
  const request = $("runReq").value.trim();
  if (!request) return;
  $("runGo").disabled = true;
  const msg = $("runMsg");
  msg.className = "hintline";
  msg.textContent = "Starting mesh…";
  try {
    const r = await fetch("/api/mesh", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ request, repo: REPO })
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error);
    clearInterval(runTimer);
    runTimer = setInterval(async () => {
      try {
        const m = await (await fetch("/api/mesh/" + d.meshId)).json();
        msg.className = "hintline";
        msg.innerHTML = "<b>" + esc(m.phase) + "</b> — " +
          (m.agents || []).length + " agent(s) · " +
          (m.agents || []).filter(a => a.status === "merged").length + " merged" +
          '<div class="runlog">' + (m.log || []).slice(-6).map(l =>
            "<div><b>" + esc(l.agent) + "</b> " + esc(l.msg) + "</div>").join("") + "</div>";
        if (m.phase === "done" || m.phase === "error") {
          clearInterval(runTimer);
          $("runGo").disabled = false;
          if (m.phase === "done") {
            msg.className = "hintline ok";
            msg.innerHTML = "✓ Mesh complete — " +
              (m.agents || []).filter(a => a.status === "merged").length +
              ' proposal(s) merged. <a href="/proposals">View change proposals →</a>';
            load();
          }
        }
      } catch (e) {}
    }, 1200);
  } catch (e) {
    msg.className = "hintline err";
    msg.textContent = String(e.message || e);
    $("runGo").disabled = false;
  }
};
$("runReq").addEventListener("keydown", e => { if (e.key === "Enter") $("runGo").click(); });

load();
</script>
</body>
</html>`;

/** Repository index. */
export const REPOS_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Repositories — CodeMesh")}
<style>
  h1.page { margin: 0 0 4px; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  p.page { margin: 0 0 18px; color: var(--dim); font-size: 13.5px; }
  .rl a {
    display: flex; align-items: center; gap: 12px; padding: 13px 16px;
    border-bottom: 1px solid var(--line-2);
  }
  .rl a:last-child { border-bottom: 0; }
  .rl a:hover { background: var(--bg); }
  .rl .ico {
    width: 34px; height: 34px; border-radius: 9px; flex: none; display: grid; place-items: center;
    background: var(--orange-soft); color: var(--orange); font-size: 15px;
  }
  .rl .nm { font-family: var(--mono); font-size: 13.5px; font-weight: 600; }
  .rl a:hover .nm { color: var(--orange); }
  .rl .sub { font-size: 12.5px; color: var(--faint); margin-top: 2px; }
  .rl .when { margin-left: auto; font-size: 12.5px; color: var(--faint); }
  .newbtn {
    background: var(--orange); color: #fff; border: 0; font-weight: 600;
    padding: 10px 18px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .newbtn:disabled { opacity: .55; cursor: default; }
  .ghostbtn {
    background: var(--panel); color: var(--dim); border: 1px solid var(--line);
    padding: 10px 16px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .createbox {
    background: var(--panel); border: 1px solid var(--orange-line); border-radius: 12px;
    padding: 14px 16px; margin-bottom: 16px; display: flex; gap: 9px; flex-wrap: wrap; align-items: center;
  }
  .createbox input {
    flex: 1; min-width: 240px; background: var(--bg); border: 1px solid var(--line);
    border-radius: 9px; padding: 10px 13px; font-size: 13.5px; font-family: var(--mono);
  }
  .createbox input:focus { outline: none; border-color: var(--orange); background: #fff; }
  .hintline { flex-basis: 100%; font-size: 12.5px; color: var(--faint); }
  .hintline.err { color: var(--bad); }
  .hintline.ok { color: var(--ok); }
</style>
</head>
<body>
<div class="app">
  ${sidebar("repos")}
  <div>
    ${topbar("Filter repositories…")}
    <main>
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:280px">
          <h1 class="page">Codebases</h1>
          <p class="page">Every codebase is a real Cloudflare Artifacts repository. Trunks hold
             integrated history; the rest are per-task agent forks.</p>
        </div>
        <button id="newRepo" class="newbtn">+ New codebase</button>
      </div>
      <div id="createBox" class="createbox" style="display:none">
        <input type="text" id="newName" placeholder="codebase name, e.g. payments-api" autocomplete="off">
        <button id="createGo" class="newbtn">Create</button>
        <button id="createCancel" class="ghostbtn">Cancel</button>
        <div class="hintline" id="createMsg">Letters, digits, dot, underscore and hyphen. Must start alphanumeric.</div>
      </div>
      <div class="panel"><div class="rl" id="list"><div class="empty" style="padding:14px 16px">Loading…</div></div></div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
let repos = [];
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return Math.floor(s) + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}
function paint() {
  const q = $("filter").value.toLowerCase();
  const rows = repos.filter(r => r.name.toLowerCase().includes(q));
  $("list").innerHTML = rows.length ? rows.map(r => {
    const isTrunk = /^trunk-[a-z0-9]+$/.test(r.name);
    return '<a href="/repo/' + encodeURIComponent(r.name) + '">' +
      '<div class="ico">' + (isTrunk ? "⇶" : "⑂") + "</div>" +
      '<div><div class="nm">' + esc(r.name) + "</div>" +
      '<div class="sub">' + (isTrunk ? "trunk — integrated history" : "agent fork") +
      " · " + esc(r.defaultBranch) + "</div></div>" +
      '<div class="when">' + ago(r.updatedAt || r.createdAt) + "</div></a>";
  }).join("") : '<div class="empty" style="padding:14px 16px">No repositories match.</div>';
}
(async () => {
  try {
    const d = await (await fetch("/api/repos")).json();
    repos = d.repos || [];
    paint();
  } catch (e) {
    $("list").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  }
})();
$("filter").addEventListener("input", paint);

const box = $("createBox"), msg = $("createMsg");
$("newRepo").onclick = () => {
  box.style.display = box.style.display === "none" ? "flex" : "none";
  if (box.style.display === "flex") $("newName").focus();
};
$("createCancel").onclick = () => { box.style.display = "none"; };

async function createRepo() {
  const name = $("newName").value.trim();
  if (!name) return;
  $("createGo").disabled = true;
  msg.className = "hintline";
  msg.textContent = "Creating repository and pushing the initial commit…";
  try {
    const res = await fetch("/api/repos", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    msg.className = "hintline ok";
    msg.textContent = "Created " + d.name + " at " + d.commit.slice(0, 7) + ".";
    $("newName").value = "";
    const r = await (await fetch("/api/repos")).json();
    repos = r.repos || [];
    paint();
  } catch (e) {
    msg.className = "hintline err";
    msg.textContent = String(e.message || e);
  } finally {
    $("createGo").disabled = false;
  }
}
$("createGo").onclick = createRepo;
$("newName").addEventListener("keydown", e => { if (e.key === "Enter") createRepo(); });
</script>
</body>
</html>`;
