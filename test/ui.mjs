/**
 * UI wiring audit.
 *
 * Catches the failure mode a status-code check misses: a button that renders
 * fine and does nothing. For every page it checks that
 *
 *   1. each link target actually resolves,
 *   2. every element id the inline script reaches for exists in the markup,
 *   3. every id the markup declares is unique,
 *   4. no template placeholder was left unrendered.
 *
 *   node test/ui.mjs [baseUrl]
 */

const BASE = process.argv[2] || "https://codemesh.heisenberg145.workers.dev";
let failures = 0;
const results = [];

function record(group, name, ok, detail = "") {
  results.push({ group, ok });
  if (!ok) failures++;
  console.log(`  ${ok ? "\x1b[32m ok \x1b[0m" : "\x1b[31mFAIL\x1b[0m"} ${name}` +
    (detail ? `  \x1b[90m${detail}\x1b[0m` : ""));
}

async function page(path) {
  const res = await fetch(BASE + path);
  return { status: res.status, html: await res.text() };
}

/** Ids the inline script looks up — these must exist or the control is dead. */
function scriptIds(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\$\(\s*"([A-Za-z0-9_-]+)"\s*\)/g)) ids.add(m[1]);
  for (const m of html.matchAll(/getElementById\(\s*"([A-Za-z0-9_-]+)"\s*\)/g)) ids.add(m[1]);
  return [...ids];
}

function markupIds(html) {
  // Only ids in real tags, not ones built inside script strings.
  return [...html.matchAll(/<[^>]*\sid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
}

function links(html) {
  return [...html.matchAll(/<a[^>]+href="([^"#][^"]*)"/g)]
    .map((m) => m[1])
    // Skip hrefs assembled inside script strings — those are templates, not
    // real targets, and checking them proves nothing.
    .filter((h) => !h.startsWith("http") && !h.startsWith("data:") && !h.startsWith("mailto:"))
    .filter((h) => !/[+'"]|encodeURIComponent/.test(h));
}

/** Buttons the script never wires and that carry no inline handler are dead. */
function unwiredButtons(html) {
  const dead = [];
  for (const m of html.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attrs = m[1];
    if (/onclick=/.test(attrs)) continue;
    const id = (attrs.match(/\sid="([A-Za-z0-9_-]+)"/) || [])[1];
    const data = /\sdata-[a-z-]+=/.test(attrs);
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || "";
    if (id || data) continue;
    // Buttons rendered into lists get their handlers by class or data attr.
    if (/mini|badge|ghostbtn|newbtn/.test(cls)) continue;
    const label = m[2].replace(/<[^>]*>/g, "").trim().slice(0, 30);
    if (label) dead.push(label);
  }
  return dead;
}

const PAGES = [
  "/", "/repos", "/proposals", "/items", "/agents", "/profile", "/security", "/search",
];

async function main() {
  console.log(`\nCodeMesh UI wiring audit\n${BASE}\n${"=".repeat(62)}`);

  // Discover live resources so the dynamic pages get checked too.
  const repos = (await (await fetch(`${BASE}/api/repos`)).json()).repos || [];
  const trunk = repos.find((r) => /^trunk-[a-z0-9]+$/.test(r.name));
  const fork = repos.find((r) => /^trunk-[a-z0-9]+-.+/.test(r.name));
  const named = repos.find((r) => !/^trunk-/.test(r.name));
  const dynamic = [
    named && `/repo/${encodeURIComponent(named.name)}`,
    trunk && `/repo/${encodeURIComponent(trunk.name)}`,
    fork && `/proposal/${encodeURIComponent(fork.name)}`,
    named && `/compare/${encodeURIComponent(named.name)}`,
  ].filter(Boolean);

  const allLinks = new Set();

  for (const path of [...PAGES, ...dynamic]) {
    console.log(`\n\x1b[1m${path}\x1b[0m`);
    const { status, html } = await page(path);
    record("page", "responds 200", status === 200, `HTTP ${status}`);
    if (status !== 200) continue;

    record("page", "no unrendered template", !/\$\{[a-zA-Z]/.test(html));

    const ids = markupIds(html);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    record("ids", "all element ids unique", dupes.length === 0, [...new Set(dupes)].join(", "));

    const wanted = scriptIds(html);
    const missing = wanted.filter((id) => !ids.includes(id));
    record("wiring", `${wanted.length} scripted ids all exist`, missing.length === 0,
      missing.length ? "missing: " + missing.join(", ") : "");

    // Parse the inline script. A syntax error here kills every control on the
    // page while the markup still looks perfectly fine.
    const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => m[1]);
    let syntaxErr = null;
    for (const code of scripts) {
      try {
        new Function(code);
      } catch (e) {
        syntaxErr = e.message;
        break;
      }
    }
    record("js", `${scripts.length} inline script(s) parse`, syntaxErr === null, syntaxErr || "");

    const dead = unwiredButtons(html);
    record("wiring", "no unwired buttons", dead.length === 0, dead.join(", "));

    links(html).forEach((l) => allLinks.add(l.split("?")[0]));
  }

  console.log(`\n\x1b[1mLink targets\x1b[0m`);
  for (const l of [...allLinks].sort()) {
    const res = await fetch(BASE + (l.startsWith("/") ? l : "/" + l));
    record("links", `${l}`, res.status === 200, `HTTP ${res.status}`);
  }

  console.log("\n" + "=".repeat(62));
  const by = {};
  results.forEach((r) => {
    by[r.group] ??= { p: 0, f: 0 };
    r.ok ? by[r.group].p++ : by[r.group].f++;
  });
  for (const [g, v] of Object.entries(by)) {
    console.log(`  ${g.padEnd(10)} ${String(v.p).padStart(3)} passed  ${v.f ? `\x1b[31m${v.f} failed\x1b[0m` : "0 failed"}`);
  }
  console.log("=".repeat(62));
  console.log(failures ? `\n\x1b[31m${failures} failed\x1b[0m\n` : `\n\x1b[32mAll ${results.length} UI checks passed.\x1b[0m\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
