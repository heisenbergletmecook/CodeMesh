import { LOCKUP_SRC, MARK_SRC, FAVICON } from "../logo";

/** Shared design system. One source of truth for both screens. */
export const CSS = /* css */ `
  :root {
    --orange: #F15A24; --orange-2: #FF7A2F; --orange-soft: #FFF2EC; --orange-line: #FFD9C7;
    --bg: #F7F8FA; --panel: #FFFFFF; --line: #E6E9EF; --line-2: #F1F3F7;
    --text: #141821; --dim: #6B7280; --faint: #9AA1AE;
    --ok: #16A34A; --ok-bg: #E9F8EF; --warn: #D97706; --warn-bg: #FEF4E6;
    --bad: #DC2626; --bad-bg: #FDECEC; --blue: #2563EB; --blue-bg: #EAF1FE;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  a { color: inherit; text-decoration: none; }
  .app { display: grid; grid-template-columns: 236px 1fr; min-height: 100vh; }

  aside {
    background: var(--panel); border-right: 1px solid var(--line);
    padding: 16px 14px; display: flex; flex-direction: column; gap: 20px;
    position: sticky; top: 0; height: 100vh;
  }
  .cm-lockup { display: block; margin: 2px auto 0; }
  nav { display: flex; flex-direction: column; gap: 2px; }
  nav a {
    display: flex; align-items: center; gap: 10px; padding: 9px 11px;
    border-radius: 9px; color: var(--dim); font-size: 13.5px; font-weight: 500;
  }
  nav a:hover { background: var(--bg); }
  nav a.on { background: var(--orange-soft); color: var(--orange); font-weight: 600; }
  nav .ic { width: 16px; text-align: center; }
  .side-foot {
    margin-top: auto; border: 1px solid var(--line); border-radius: 10px;
    padding: 11px 12px; font-size: 12.5px; color: var(--dim);
  }
  .side-foot b { display: block; color: var(--text); font-size: 13px; margin-bottom: 2px; }

  header {
    background: var(--panel); border-bottom: 1px solid var(--line);
    padding: 12px 24px; display: flex; align-items: center; gap: 16px;
    position: sticky; top: 0; z-index: 20;
  }
  .search { flex: 1; max-width: 620px; position: relative; }
  .search input {
    width: 100%; background: var(--bg); border: 1px solid var(--line);
    border-radius: 9px; padding: 9px 14px 9px 36px; font-size: 13.5px; color: var(--text);
  }
  .search input:focus { outline: none; border-color: var(--orange); background: #fff; }
  .search .mag { position: absolute; left: 12px; top: 8px; color: var(--faint); }
  .search .kbd {
    position: absolute; right: 10px; top: 9px; font-size: 10.5px; color: var(--faint);
    border: 1px solid var(--line); border-radius: 5px; padding: 1px 6px; background: var(--panel);
    pointer-events: none;
  }
  a.chip:hover { border-color: var(--orange); color: var(--orange); }
  .dot-live { width: 7px; height: 7px; border-radius: 50%; background: var(--ok); }
  .spacer { flex: 1; }
  .chip {
    display: flex; align-items: center; gap: 7px; border: 1px solid var(--line);
    border-radius: 9px; padding: 5px 11px 5px 7px; font-size: 12.5px; color: var(--dim);
  }
  .chip img { display: block; }

  main { padding: 20px 24px 60px; }
  .panel {
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; margin-bottom: 16px; overflow: hidden;
  }
  .panel > h2 {
    margin: 0; padding: 13px 16px; border-bottom: 1px solid var(--line-2);
    font-size: 14.5px; font-weight: 650; display: flex; align-items: center; gap: 9px;
  }
  .panel > h2 .hint { font-weight: 400; font-size: 12.5px; color: var(--faint); }
  .panel > h2 .right { margin-left: auto; font-weight: 500; font-size: 12.5px; color: var(--orange); }
  .pb { padding: 14px 16px; }

  .pill {
    font-size: 10.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase;
    padding: 3px 9px; border-radius: 20px; white-space: nowrap;
  }
  .p-claimed,.p-developing,.p-testing,.p-reviewing,.p-fixing { background: var(--blue-bg); color: var(--blue); }
  .p-blocked { background: var(--warn-bg); color: var(--warn); }
  .p-ready { background: var(--ok-bg); color: var(--ok); }
  .p-merged { background: var(--ok); color: #fff; }
  .p-failed { background: var(--bad-bg); color: var(--bad); }
  .p-ready-grey { background: var(--bg); color: var(--dim); }

  .empty { color: var(--faint); font-size: 13px; padding: 6px 0; }
  .mono { font-family: var(--mono); font-size: 12px; }
  .err { color: var(--bad); }

  .team { display: flex; flex-direction: column; gap: 11px; }
  .tm { display: flex; gap: 11px; align-items: flex-start; }
  .tm-ic {
    width: 34px; height: 34px; border-radius: 9px; flex: none; display: grid;
    place-items: center; font-size: 14px; background: var(--orange-soft); color: var(--orange);
    font-family: var(--mono); font-weight: 700;
  }
  .tm-body { flex: 1; min-width: 0; }
  .tm-name { font-size: 13.5px; font-weight: 600; display: flex; justify-content: space-between; gap: 8px; }
  .tm-role { font-size: 12px; color: var(--faint); }
  .bar { height: 5px; background: var(--line-2); border-radius: 4px; margin-top: 6px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--orange); border-radius: 4px; transition: width .5s ease; }
  .live { font-size: 11px; color: var(--ok); font-weight: 600; }
  .idle { font-size: 11px; color: var(--faint); font-weight: 600; }

  @media (max-width: 1180px) { .app { grid-template-columns: 1fr; } aside { display: none; } }
`;

export function head(title: string): string {
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="icon" href="${FAVICON}">
<style>${CSS}</style>`;
}

export function sidebar(
  active:
    | "mesh" | "repos" | "proposals" | "agents"
    | "items" | "security" | "search" | "profile",
): string {
  const item = (key: string, href: string, icon: string, label: string) =>
    `<a href="${href}"${active === key ? ' class="on"' : ""}><span class="ic">${icon}</span> ${label}</a>`;
  return `<aside>
    <img class="cm-lockup" src="${LOCKUP_SRC}" alt="CodeMesh — Build Together" width="150">
    <nav>
      ${item("mesh", "/", "◉", "Overview")}
      ${item("repos", "/repos", "▤", "Codebases")}
      ${item("proposals", "/proposals", "⑂", "Change Proposals")}
      ${item("items", "/items", "◉", "Work Items")}
      ${item("agents", "/agents", "✦", "Agent Studio")}
      ${item("security", "/security", "⛊", "Trust Center")}
      ${item("profile", "/profile", "◍", "Profile")}
    </nav>
    <div class="side-foot">
      <b>Workers + Artifacts</b>
      Every repository here is a real Artifacts repository, created and committed
      to by an agent running at the edge.
    </div>
  </aside>`;
}

export function topbar(placeholder: string): string {
  // The box filters the current page as you type; Enter escalates the same
  // text to a search across every codebase.
  return `<header>
    <div class="search"><span class="mag">⌕</span>
      <input type="text" id="filter" placeholder="${placeholder}"
             title="Filter this page — press Enter to search all codebases">
      <span class="kbd">↵ search all</span></div>
    <div class="spacer"></div>
    <a class="chip" href="/search">⌕ Search code</a>
    <a class="chip" href="/profile" title="Workspace profile">
      <img src="${MARK_SRC}" height="18" alt=""> <span>codemesh</span>
      <span class="dot-live" title="live"></span></a>
  </header>
  <script>
    (function () {
      var f = document.getElementById("filter");
      if (!f) return;
      f.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && f.value.trim().length > 1) {
          location.href = "/search?q=" + encodeURIComponent(f.value.trim());
        }
      });
    })();
  </script>`;
}

/** The six agent roles, shared by both screens. */
export const ROLES_JS = `const ROLES = [
  { key: "orchestrator", icon: "O", role: "Splits work, arbitrates claims" },
  { key: "developer",    icon: "D", role: "Writes code, real commits" },
  { key: "testing",      icon: "T", role: "Generates and judges tests" },
  { key: "security",     icon: "S", role: "Flags vulnerabilities" },
  { key: "reviewer",     icon: "R", role: "Inline review, verdict" },
  { key: "autofix",      icon: "F", role: "Applies corrections" },
];
const ACTIVE_FOR = {
  developing: ["developer"], testing: ["testing"],
  reviewing: ["security", "reviewer"], fixing: ["autofix"],
  claimed: [], blocked: [], ready: [], merged: [], failed: [],
};
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
}`;
