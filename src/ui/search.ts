import { head, sidebar, topbar, ROLES_JS } from "./shell";

/** Code search across every codebase in the namespace. */
export const SEARCH_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Search — CodeMesh")}
<style>
  h1.page { margin: 0 0 4px; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  p.page { margin: 0 0 16px; color: var(--dim); font-size: 13.5px; }
  .sbar { display: flex; gap: 9px; margin-bottom: 18px; flex-wrap: wrap; }
  .sbar input {
    flex: 1; min-width: 280px; background: var(--panel); border: 1px solid var(--line);
    border-radius: 9px; padding: 11px 14px; font-size: 14px; font-family: var(--mono); color: var(--text);
  }
  .sbar input:focus { outline: none; border-color: var(--orange); }
  .newbtn {
    background: var(--orange); color: #fff; border: 0; font-weight: 600;
    padding: 11px 22px; border-radius: 9px; cursor: pointer; font-size: 14px;
  }
  .newbtn:disabled { opacity: .55; cursor: default; }
  .grp { border-bottom: 1px solid var(--line-2); }
  .grp:last-child { border-bottom: 0; }
  .grp .gh {
    display: flex; align-items: center; gap: 9px; padding: 10px 16px;
    background: var(--bg); font-size: 13px;
  }
  .grp .gh .r { font-family: var(--mono); font-weight: 650; }
  .grp .gh .r:hover { color: var(--orange); }
  .grp .gh .n { margin-left: auto; font-size: 12px; color: var(--faint); }
  .hit { display: flex; gap: 11px; padding: 7px 16px; font-family: var(--mono); font-size: 12.5px; }
  .hit:hover { background: #FFFAF7; }
  .hit .ln { width: 38px; flex: none; text-align: right; color: #B6BCC8; user-select: none; }
  .hit .tx { white-space: pre-wrap; word-break: break-word; flex: 1; }
  .hit .tx mark { background: #FFE2CE; color: inherit; border-radius: 2px; padding: 0 1px; }
  .hit .fp { color: var(--faint); font-size: 11.5px; }
  .hit a:hover { color: var(--orange); }
  .reponames { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
  .reponames a {
    font-family: var(--mono); font-size: 12.5px; background: var(--orange-soft);
    border: 1px solid var(--orange-line); color: var(--orange);
    border-radius: 20px; padding: 4px 12px;
  }
  .note { font-size: 12.5px; color: var(--faint); margin-top: 12px; }
</style>
</head>
<body>
<div class="app">
  ${sidebar("search")}
  <div>
    ${topbar("Search code across every codebase…")}
    <main>
      <h1 class="page">Search</h1>
      <p class="page">Searches repository names, file paths and file contents at <code>main</code>
         across every codebase in the namespace.</p>
      <div class="sbar">
        <input type="text" id="q" placeholder="e.g. rateLimit, bcrypt, export function" autocomplete="off">
        <button class="newbtn" id="go">Search</button>
      </div>
      <div class="reponames" id="repoHits"></div>
      <div class="panel">
        <h2>Results <span class="hint" id="meta"></span></h2>
        <div id="out"><div class="empty" style="padding:14px 16px">Type a query to search.</div></div>
      </div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);

function mark(text, needle) {
  const safe = esc(text);
  if (!needle) return safe;
  const i = safe.toLowerCase().indexOf(esc(needle).toLowerCase());
  if (i === -1) return safe;
  const n = esc(needle).length;
  return safe.slice(0, i) + "<mark>" + safe.slice(i, i + n) + "</mark>" + safe.slice(i + n);
}

async function run() {
  const q = $("q").value.trim();
  if (q.length < 2) return;
  history.replaceState(null, "", "/search?q=" + encodeURIComponent(q));
  $("go").disabled = true;
  $("meta").textContent = "searching…";
  $("out").innerHTML = '<div class="empty" style="padding:14px 16px">Reading repositories…</div>';
  try {
    const d = await (await fetch("/api/search?q=" + encodeURIComponent(q))).json();

    $("repoHits").innerHTML = (d.repos || []).map(r =>
      '<a href="/repo/' + encodeURIComponent(r) + '">▤ ' + esc(r) + "</a>").join("");

    // Group hits by repository, then by file, the way a code host does.
    const byRepo = {};
    (d.results || []).forEach(h => {
      byRepo[h.repo] ??= {};
      byRepo[h.repo][h.path] ??= [];
      byRepo[h.repo][h.path].push(h);
    });
    const repoNames = Object.keys(byRepo);

    $("meta").textContent = (d.results || []).length + " hit(s) in " +
      repoNames.length + " codebase(s)" + (d.truncated ? " — truncated" : "");

    $("out").innerHTML = repoNames.length ? repoNames.map(r =>
      '<div class="grp"><div class="gh"><span>▤</span>' +
      '<a class="r" href="/repo/' + encodeURIComponent(r) + '">' + esc(r) + "</a>" +
      '<span class="n">' + Object.values(byRepo[r]).flat().length + " hit(s)</span></div>" +
      Object.entries(byRepo[r]).map(([p, hits]) =>
        '<div class="hit"><span class="ln"></span><span class="fp">' +
        '<a href="/repo/' + encodeURIComponent(r) + '">' + esc(p) + "</a></span></div>" +
        hits.filter(h => h.line > 0).slice(0, 6).map(h =>
          '<div class="hit"><span class="ln">' + h.line + "</span>" +
          '<span class="tx">' + mark(h.text, q) + "</span></div>").join("")
      ).join("") + "</div>").join("")
      : '<div class="empty" style="padding:14px 16px">No matches for <code>' + esc(q) + "</code>.</div>";
  } catch (e) {
    $("out").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  } finally {
    $("go").disabled = false;
  }
}

$("go").onclick = run;
$("q").addEventListener("keydown", e => { if (e.key === "Enter") run(); });

const initial = new URLSearchParams(location.search).get("q");
if (initial) { $("q").value = initial; run(); } else { $("q").focus(); }
</script>
</body>
</html>`;
