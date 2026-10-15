import { head, sidebar, topbar, ROLES_JS } from "./shell";

/** Compare any two refs in a codebase, or a codebase against another. */
export const COMPARE_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Compare — CodeMesh")}
<style>
  .crumb { font-size: 13px; color: var(--dim); margin-bottom: 10px; }
  .crumb a:hover { color: var(--orange); }
  h1.page { margin: 0 0 4px; font-size: 22px; letter-spacing: -.4px; font-weight: 650; }
  p.page { margin: 0 0 16px; color: var(--dim); font-size: 13.5px; }
  .picker {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 14px 16px; margin-bottom: 16px; display: flex; gap: 10px;
    align-items: center; flex-wrap: wrap;
  }
  .picker label { font-size: 12.5px; color: var(--faint); }
  .picker select {
    background: var(--bg); border: 1px solid var(--line); border-radius: 9px;
    padding: 9px 12px; font-size: 13px; font-family: var(--mono); color: var(--text);
    max-width: 280px;
  }
  .picker select:focus { outline: none; border-color: var(--orange); }
  .arrow { color: var(--faint); font-size: 16px; }
  .newbtn {
    background: var(--orange); color: #fff; border: 0; font-weight: 600;
    padding: 10px 20px; border-radius: 9px; cursor: pointer; font-size: 13.5px;
  }
  .newbtn:disabled { opacity: .55; cursor: default; }
  .summary { display: flex; gap: 12px; align-items: center; font-size: 13px; margin-left: auto; }
  .dadd { color: var(--ok); font-weight: 600; } .ddel { color: var(--bad); font-weight: 600; }
  .dfile { border: 1px solid var(--line); border-radius: 10px; margin-bottom: 11px; overflow: hidden; }
  .dfile > .h {
    display: flex; align-items: center; gap: 10px; padding: 9px 13px;
    background: var(--bg); border-bottom: 1px solid var(--line); font-size: 13px; cursor: pointer;
  }
  .dfile > .h .p { font-family: var(--mono); font-size: 12.5px; font-weight: 600; }
  .dfile > .h .tag {
    font-size: 10.5px; border-radius: 20px; padding: 1px 8px; font-weight: 600;
    background: var(--blue-bg); color: var(--blue);
  }
  .dfile > .h .tag.added { background: var(--ok-bg); color: var(--ok); }
  .dfile > .h .tag.removed { background: var(--bad-bg); color: var(--bad); }
  .dbody { font-family: var(--mono); font-size: 12px; line-height: 1.55; overflow-x: auto; }
  .dfile.collapsed .dbody { display: none; }
  .hh { background: #EEF1F6; color: var(--dim); padding: 3px 13px; font-size: 11.5px; }
  .dl { display: flex; white-space: pre; }
  .dl .ln {
    width: 46px; flex: none; text-align: right; padding: 0 8px; color: #B6BCC8;
    background: #FBFBFD; user-select: none; border-right: 1px solid var(--line-2);
  }
  .dl .tx { padding: 0 10px; flex: 1; }
  .dl.add { background: #E8F8EE; } .dl.add .tx::before { content: "+"; color: var(--ok); margin-right: 6px; }
  .dl.del { background: #FDECEC; } .dl.del .tx::before { content: "-"; color: var(--bad); margin-right: 6px; }
  .dl.ctx .tx::before { content: " "; margin-right: 6px; }
</style>
</head>
<body>
<div class="app">
  ${sidebar("repos")}
  <div>
    ${topbar("Filter changed files…")}
    <main>
      <div class="crumb"><a href="/repos">Codebases</a> / <a id="back">…</a> / Compare</div>
      <h1 class="page">Compare refs</h1>
      <p class="page">A real line diff between any two refs. Branches and tags are read straight
         off the Git remote.</p>

      <div class="picker">
        <label>base</label>
        <select id="base"></select>
        <span class="arrow">←</span>
        <label>compare</label>
        <select id="head"></select>
        <button class="newbtn" id="go">Compare</button>
        <div class="summary" id="sum"></div>
      </div>

      <div id="out"><div class="empty" style="padding:14px 16px">Pick two refs.</div></div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
const REPO = decodeURIComponent(location.pathname.replace(/^\\/compare\\//, ""));
async function j(u) { const r = await fetch(u); if (!r.ok) throw new Error(await r.text()); return r.json(); }

(async () => {
  $("back").textContent = REPO;
  $("back").href = "/repo/" + encodeURIComponent(REPO);
  document.title = "Compare " + REPO + " — CodeMesh";

  let refs = [];
  try {
    const [b, t] = await Promise.all([
      j("/api/repos/" + encodeURIComponent(REPO) + "/branches"),
      j("/api/repos/" + encodeURIComponent(REPO) + "/tags").catch(() => ({ tags: [] })),
    ]);
    refs = [
      ...(b.branches || []).map(x => ({ ...x, kind: "branch" })),
      ...(t.tags || []).map(x => ({ ...x, kind: "tag" })),
    ];
    const opts = refs.map(r =>
      '<option value="' + esc(r.name) + '">' + (r.kind === "tag" ? "🏷 " : "⑂ ") + esc(r.name) + "</option>").join("");
    $("base").innerHTML = opts;
    $("head").innerHTML = opts;
    const def = (b.defaultBranch || "main");
    $("base").value = def;
    const other = refs.find(r => r.name !== def);
    if (other) $("head").value = other.name;
  } catch (e) {
    $("out").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
    return;
  }

  const qs = new URLSearchParams(location.search);
  if (qs.get("base")) $("base").value = qs.get("base");
  if (qs.get("head")) $("head").value = qs.get("head");
  if (qs.get("base") || qs.get("head")) run();
})();

async function run() {
  const base = $("base").value, head = $("head").value;
  if (base === head) {
    $("sum").textContent = "";
    $("out").innerHTML = '<div class="empty" style="padding:14px 16px">Those are the same ref.</div>';
    return;
  }
  history.replaceState(null, "", "/compare/" + encodeURIComponent(REPO) +
    "?base=" + encodeURIComponent(base) + "&head=" + encodeURIComponent(head));
  $("go").disabled = true;
  $("out").innerHTML = '<div class="empty" style="padding:14px 16px">Diffing…</div>';
  try {
    const d = await j("/api/repos/" + encodeURIComponent(REPO) + "/compare" +
      "?base=" + encodeURIComponent(base) + "&head=" + encodeURIComponent(head));
    $("sum").innerHTML = '<span class="dadd">+' + d.additions + '</span><span class="ddel">-' +
      d.deletions + '</span><span class="muted">' + d.files.length + " file(s)</span>";
    $("out").innerHTML = d.files.length ? d.files.map(f =>
      '<div class="dfile"><div class="h"><span class="p">' + esc(f.path) + "</span>" +
      '<span class="tag ' + esc(f.status) + '">' + esc(f.status) + "</span>" +
      '<span class="summary"><span class="dadd">+' + f.additions + '</span>' +
      '<span class="ddel">-' + f.deletions + "</span></span></div>" +
      '<div class="dbody">' + f.hunks.map(h =>
        '<div class="hh">' + esc(h.header) + "</div>" +
        h.lines.map(l =>
          '<div class="dl ' + l.type + '">' +
          '<span class="ln">' + (l.a ?? "") + "</span>" +
          '<span class="ln">' + (l.b ?? "") + "</span>" +
          '<span class="tx">' + esc(l.text) + "</span></div>").join("")
      ).join("") + "</div></div>").join("")
      : '<div class="empty" style="padding:14px 16px">These refs are identical.</div>';
    document.querySelectorAll(".dfile > .h").forEach(h => {
      h.onclick = () => h.parentElement.classList.toggle("collapsed");
    });
  } catch (e) {
    $("out").innerHTML = '<div class="empty err" style="padding:14px 16px">' + esc(e.message) + "</div>";
  } finally { $("go").disabled = false; }
}

$("go").onclick = run;
$("filter").addEventListener("input", () => {
  const q = $("filter").value.toLowerCase();
  document.querySelectorAll(".dfile").forEach(el => {
    el.style.display = el.querySelector(".p").textContent.toLowerCase().includes(q) ? "" : "none";
  });
});
</script>
</body>
</html>`;
