import { head, sidebar, topbar, ROLES_JS } from "./shell";
import { MARK_SRC } from "../logo";

/**
 * Agent Studio — the workspace profile.
 *
 * Same composition as a developer profile, but CodeMesh has no human accounts,
 * so the subject is the workspace itself and every panel is counted from real
 * repositories and real commit authorship. The contribution heatmap is built
 * from actual commit timestamps.
 */
export const PROFILE_PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
${head("Agent Studio — CodeMesh")}
<style>
  .ptabs { display: flex; gap: 2px; border-bottom: 1px solid var(--line); margin-bottom: 18px; overflow-x: auto; }
  .ptabs button {
    background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
    padding: 10px 15px; font-size: 13.5px; color: var(--dim); font-weight: 500; white-space: nowrap;
  }
  .ptabs button.on { color: var(--orange); border-bottom-color: var(--orange); font-weight: 600; }

  .player { display: grid; grid-template-columns: 330px 1fr 330px; gap: 16px; align-items: start; }
  @media (max-width: 1400px) { .player { grid-template-columns: 300px 1fr; } }
  @media (max-width: 1100px) { .player { grid-template-columns: 1fr; } }

  .idcard { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  .cover { height: 104px; background: linear-gradient(115deg, #FFCFA8, #FF8A4C 55%, #F15A24); position: relative; }
  .cover::after {
    content: ""; position: absolute; inset: 0;
    background: radial-gradient(120% 90% at 78% 110%, rgba(255,255,255,.42), transparent 60%);
  }
  .idbody { padding: 0 18px 18px; }
  .pfp {
    width: 104px; height: 104px; border-radius: 50%; background: #fff; border: 4px solid var(--panel);
    margin-top: -54px; display: grid; place-items: center; position: relative; z-index: 1;
    box-shadow: 0 2px 10px rgba(20,24,33,.08);
  }
  .pfp img { width: 68px; }
  .pname { font-size: 21px; font-weight: 650; letter-spacing: -.4px; margin-top: 11px;
           display: flex; align-items: center; gap: 7px; }
  .verified { width: 17px; height: 17px; border-radius: 50%; background: var(--orange);
              color: #fff; font-size: 10px; display: grid; place-items: center; }
  .phandle { color: var(--dim); font-size: 14px; margin-top: 1px; }
  .ptitle { font-size: 13.5px; margin-top: 11px; font-weight: 550; }
  .porg { font-size: 13.5px; color: var(--dim); }
  .pbio { font-size: 13.5px; color: var(--dim); margin-top: 11px; line-height: 1.55; }
  .pmeta { margin-top: 14px; font-size: 13px; }
  .pmeta div { display: flex; gap: 9px; padding: 4px 0; color: var(--dim); align-items: flex-start; }
  .pmeta .mi { width: 15px; flex: none; text-align: center; color: var(--faint); }
  .pmeta .v { word-break: break-all; }
  .pcounts { display: flex; gap: 0; margin-top: 16px; border-top: 1px solid var(--line-2); padding-top: 14px; }
  .pcounts div { flex: 1; text-align: center; }
  .pcounts b { display: block; font-size: 18px; font-weight: 650; }
  .pcounts span { font-size: 12px; color: var(--faint); }

  .pinned { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 720px) { .pinned { grid-template-columns: 1fr; } }
  .pin { border: 1px solid var(--line); border-radius: 11px; padding: 13px 14px; background: var(--panel); }
  .pin .nm { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 650; }
  .pin .nm .ic { color: var(--orange); }
  .pin a:hover .nm { color: var(--orange); }
  .pin .tagp {
    font-size: 10.5px; border: 1px solid var(--line); border-radius: 20px;
    padding: 1px 8px; color: var(--dim); font-weight: 500; margin-left: auto;
  }
  .pin .d { font-size: 12.5px; color: var(--dim); margin-top: 6px; line-height: 1.5; min-height: 34px; }
  .pin .f { display: flex; gap: 14px; margin-top: 9px; font-size: 12px; color: var(--faint); align-items: center; }
  .lang { display: inline-flex; align-items: center; gap: 5px; }
  .ldot { width: 9px; height: 9px; border-radius: 50%; background: var(--orange); }

  /* heatmap */
  .heat { display: flex; gap: 3px; overflow-x: auto; padding-bottom: 4px; }
  .hcol { display: flex; flex-direction: column; gap: 3px; }
  .hc { width: 11px; height: 11px; border-radius: 2.5px; background: #F0F2F6; }
  .h1 { background: #FFD9C7; } .h2 { background: #FFA477; }
  .h3 { background: #FA7A3C; } .h4 { background: #D8430F; }
  .hlegend { display: flex; align-items: center; gap: 5px; justify-content: flex-end;
             margin-top: 9px; font-size: 11.5px; color: var(--faint); }
  .hmonths { display: flex; gap: 3px; font-size: 10.5px; color: var(--faint); margin-bottom: 5px; }

  .donutwrap { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .legend { flex: 1; min-width: 150px; font-size: 12.5px; }
  .legend div { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
  .lgd { width: 9px; height: 9px; border-radius: 50%; flex: none; }

  .impact { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .im { border: 1px solid var(--line); border-radius: 11px; padding: 13px 14px; }
  .im .ic { font-size: 15px; color: var(--orange); }
  .im b { display: block; font-size: 21px; font-weight: 650; letter-spacing: -.4px; margin-top: 5px; }
  .im span { font-size: 12px; color: var(--faint); }

  .skills { display: flex; flex-wrap: wrap; gap: 7px; }
  .skill {
    background: var(--bg); border: 1px solid var(--line); border-radius: 8px;
    padding: 6px 12px; font-size: 12.5px; color: var(--dim);
  }
  .caps { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 12px; }
  .cap { text-align: center; }
  .cap .orb {
    width: 54px; height: 54px; border-radius: 50%; margin: 0 auto 8px; display: grid;
    place-items: center; font-size: 20px; background: var(--orange-soft); color: var(--orange);
    border: 1px solid var(--orange-line);
  }
  .cap .n { font-size: 12.5px; font-weight: 600; }
  .cap .s { font-size: 11px; color: var(--faint); }

  .act div.a { display: flex; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--line-2); font-size: 13px; }
  .act div.a:last-child { border-bottom: 0; }
  .act .when { margin-left: auto; font-size: 11.5px; color: var(--faint); white-space: nowrap; }
  .act .ai { color: var(--orange); flex: none; }
</style>
</head>
<body>
<div class="app">
  ${sidebar("profile")}
  <div>
    ${topbar("Search the workspace…")}
    <main>
      <div class="ptabs">
        <button class="on">Overview</button>
        <button onclick="location.href='/repos'">Codebases</button>
        <button onclick="location.href='/proposals'">Change Proposals</button>
        <button onclick="location.href='/'">Activity</button>
      </div>

      <div class="player">
        <!-- identity -->
        <div>
          <div class="idcard">
            <div class="cover"></div>
            <div class="idbody">
              <div class="pfp"><img src="${MARK_SRC}" alt="CodeMesh"></div>
              <div class="pname">CodeMesh Workspace <span class="verified">✓</span></div>
              <div class="phandle">@codemesh</div>
              <div class="ptitle">Agent-native source control</div>
              <div class="porg">Cloudflare Workers + Artifacts</div>
              <div class="pbio">A fork per agent, claims before work, and a merge train
                instead of pull requests. No human accounts: every contributor here is an agent.</div>
              <div class="pmeta">
                <div><span class="mi">◎</span><span class="v">Global — Durable Objects, routed from any region</span></div>
                <div><span class="mi">▤</span><span class="v">namespace <code>codemesh</code></span></div>
                <div><span class="mi">⚯</span><span class="v" id="pRemote">artifacts.cloudflare.net</span></div>
                <div><span class="mi">◷</span><span class="v" id="pJoined">—</span></div>
              </div>
              <div class="pcounts" id="pCounts"></div>
            </div>
          </div>
        </div>

        <!-- middle column -->
        <div>
          <div class="panel">
            <h2>Pinned codebases <a class="right" href="/repos">View all →</a></h2>
            <div class="pb"><div class="pinned" id="pinned"></div></div>
          </div>
          <div class="panel">
            <h2>Contribution activity <span class="hint" id="heatHint"></span></h2>
            <div class="pb">
              <div class="hmonths" id="hmonths"></div>
              <div class="heat" id="heat"></div>
              <div class="hlegend">Less
                <span class="hc"></span><span class="hc h1"></span><span class="hc h2"></span>
                <span class="hc h3"></span><span class="hc h4"></span>More</div>
            </div>
          </div>
          <div class="panel">
            <h2>Stack <span class="hint">what this is actually built on</span></h2>
            <div class="pb"><div class="skills">
              <span class="skill">Cloudflare Workers</span>
              <span class="skill">Artifacts</span>
              <span class="skill">Durable Objects</span>
              <span class="skill">Workers AI</span>
              <span class="skill">isomorphic-git</span>
              <span class="skill">TypeScript</span>
              <span class="skill">Git smart HTTP</span>
              <span class="skill">In-memory FS</span>
            </div></div>
          </div>
          <div class="panel">
            <h2>Capabilities <span class="hint">implemented, not aspirational</span></h2>
            <div class="pb"><div class="caps">
              <div class="cap"><div class="orb">⑂</div><div class="n">Fork per task</div><div class="s">isolation by default</div></div>
              <div class="cap"><div class="orb">⚯</div><div class="n">Claim arbitration</div><div class="s">conflicts prevented</div></div>
              <div class="cap"><div class="orb">⇶</div><div class="n">Merge train</div><div class="s">one writer, always</div></div>
              <div class="cap"><div class="orb">✎</div><div class="n">Edge commits</div><div class="s">no disk, no git binary</div></div>
              <div class="cap"><div class="orb">✦</div><div class="n">Written messages</div><div class="s">derived from the diff</div></div>
            </div></div>
          </div>
        </div>

        <!-- right column -->
        <div>
          <div class="panel">
            <h2>Contribution insight <span class="hint">by commit author</span></h2>
            <div class="pb"><div class="donutwrap">
              <svg width="128" height="128" viewBox="0 0 42 42" id="donut"></svg>
              <div class="legend" id="legend"></div>
            </div></div>
          </div>
          <div class="panel">
            <h2>Impact overview</h2>
            <div class="pb"><div class="impact" id="impact"></div></div>
          </div>
          <div class="panel">
            <h2>Recent activity <span class="hint">real commits</span></h2>
            <div class="pb"><div class="act" id="activity"></div></div>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>
<script>
${ROLES_JS}
const $ = (id) => document.getElementById(id);
const COLORS = ["#F15A24", "#FF9A3C", "#16A34A", "#2563EB", "#9AA1AE"];

function ago(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return Math.floor(s) + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

(async () => {
  let repos = [];
  try { repos = (await (await fetch("/api/repos")).json()).repos || []; } catch (e) {}

  const trunks = repos.filter(r => /^trunk-[a-z0-9]+$/.test(r.name));
  const forks  = repos.filter(r => /^trunk-[a-z0-9]+-.+/.test(r.name));
  const named  = repos.filter(r => !/^trunk-/.test(r.name));

  if (repos.length) {
    const oldest = repos.reduce((a, b) => a.createdAt < b.createdAt ? a : b);
    $("pJoined").textContent = "First repository " + new Date(oldest.createdAt).toLocaleDateString();
    $("pRemote").textContent = (oldest.remote || "").replace(/^https:\\/\\//, "").split("/")[0];
  }

  // Pull every commit we can, for the heatmap, donut and activity feed.
  const commits = [];
  await Promise.all(repos.slice(0, 30).map(async r => {
    try {
      const log = await (await fetch("/api/repos/" + encodeURIComponent(r.name) + "/log")).json();
      log.forEach(c => commits.push({ ...c, repo: r.name }));
    } catch (e) {}
  }));
  commits.sort((a, b) => b.committedAt - a.committedAt);

  $("pCounts").innerHTML = [
    [repos.length, "Codebases"], [forks.length, "Proposals"], [6, "Agents"],
  ].map(([v, l]) => "<div><b>" + v + "</b><span>" + l + "</span></div>").join("");

  // --- pinned: the most recently updated codebases ---
  const pins = [...named, ...trunks].slice(0, 4);
  $("pinned").innerHTML = pins.length ? pins.map(r => {
    const isTrunk = /^trunk-/.test(r.name);
    const n = commits.filter(c => c.repo === r.name).length;
    return '<a href="/repo/' + encodeURIComponent(r.name) + '"><div class="pin">' +
      '<div class="nm"><span class="ic">▤</span>' + esc(r.name) +
      '<span class="tagp">' + (isTrunk ? "trunk" : "codebase") + "</span></div>" +
      '<div class="d">' + esc(r.description || (isTrunk
        ? "Integrated history for one mesh run." : "Created in CodeMesh.")) + "</div>" +
      '<div class="f"><span class="lang"><span class="ldot"></span>TypeScript</span>' +
      "<span>⑂ " + (isTrunk ? forks.filter(f => f.name.startsWith(r.name + "-")).length : 0) + "</span>" +
      "<span>◷ " + n + " commits</span></div></div></a>";
  }).join("") : '<div class="empty">No codebases yet.</div>';

  // --- heatmap from real commit timestamps, 26 weeks ---
  const WEEKS = 26;
  const byDay = {};
  commits.forEach(c => {
    const d = new Date(c.committedAt * 1000);
    byDay[d.toISOString().slice(0, 10)] = (byDay[d.toISOString().slice(0, 10)] || 0) + 1;
  });
  const today = new Date();
  const cols = [];
  const monthLabels = [];
  let lastMonth = -1;
  for (let w = WEEKS - 1; w >= 0; w--) {
    const cells = [];
    let colMonth = null;
    for (let d = 0; d < 7; d++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - (w * 7 + (6 - d)));
      const key = dt.toISOString().slice(0, 10);
      const n = byDay[key] || 0;
      const cls = n === 0 ? "" : n < 2 ? "h1" : n < 5 ? "h2" : n < 10 ? "h3" : "h4";
      cells.push('<div class="hc ' + cls + '" title="' + key + ": " + n + ' commit(s)"></div>');
      if (d === 0) colMonth = dt.getMonth();
    }
    if (colMonth !== lastMonth) {
      monthLabels.push('<span style="width:14px">' +
        new Date(today.getFullYear(), colMonth, 1).toLocaleString("en", { month: "short" }) + "</span>");
      lastMonth = colMonth;
    } else {
      monthLabels.push('<span style="width:14px"></span>');
    }
    cols.push('<div class="hcol">' + cells.join("") + "</div>");
  }
  $("heat").innerHTML = cols.join("");
  $("hmonths").innerHTML = monthLabels.join("");
  $("heatHint").textContent = commits.length + " commits over the last " + WEEKS + " weeks";

  // --- donut by commit author category ---
  const cat = { "Agent code": 0, "Coordinator": 0, "Human edits": 0 };
  commits.forEach(c => {
    const who = (c.author && c.author.name || "").replace(/^codemesh-/, "");
    if (who === "coordinator") cat["Coordinator"]++;
    else if (who === "editor") cat["Human edits"]++;
    else cat["Agent code"]++;
  });
  const total = Math.max(1, commits.length);
  let offset = 25;
  const segs = Object.entries(cat).filter(([, v]) => v > 0);
  $("donut").innerHTML =
    '<circle cx="21" cy="21" r="15.9" fill="none" stroke="#F0F2F6" stroke-width="5"></circle>' +
    segs.map(([k, v], i) => {
      const pct = (v / total) * 100;
      const el = '<circle cx="21" cy="21" r="15.9" fill="none" stroke="' + COLORS[i] +
        '" stroke-width="5" stroke-dasharray="' + pct.toFixed(2) + " " + (100 - pct).toFixed(2) +
        '" stroke-dashoffset="' + offset.toFixed(2) + '"></circle>';
      offset -= pct;
      return el;
    }).join("") +
    '<text x="21" y="20.5" text-anchor="middle" font-size="7" font-weight="700" fill="#141821">' +
    commits.length + "</text>" +
    '<text x="21" y="25.5" text-anchor="middle" font-size="3" fill="#9AA1AE">commits</text>';
  $("legend").innerHTML = segs.map(([k, v], i) =>
    '<div><span class="lgd" style="background:' + COLORS[i] + '"></span>' +
    Math.round((v / total) * 100) + "% " + k + "</div>").join("");

  // --- impact ---
  $("impact").innerHTML = [
    ["⇶", forks.length, "Proposals merged"],
    ["⑂", trunks.length, "Mesh runs"],
    ["✎", commits.length, "Agent commits"],
    ["✦", 6, "Agents available"],
  ].map(([i, v, l]) =>
    '<div class="im"><div class="ic">' + i + "</div><b>" + v + "</b><span>" + l + "</span></div>").join("");

  // --- activity ---
  $("activity").innerHTML = commits.slice(0, 7).map(c =>
    '<div class="a"><span class="ai">✦</span><div><div>' +
    esc(c.message.split("\\n")[0].slice(0, 60)) + "</div>" +
    '<div style="font-size:11.5px;color:var(--faint)">' + esc(c.repo) + "</div></div>" +
    '<span class="when">' + ago(c.committedAt * 1000) + "</span></div>").join("") ||
    '<div class="empty">No activity yet.</div>';
})();
</script>
</body>
</html>`;
