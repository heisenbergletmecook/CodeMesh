/**
 * Shared model access for every CodeMesh agent.
 *
 * Agents run on Workers AI so a demo needs no third-party key. The engine is
 * swappable per agent: `MODEL_BY_ROLE` is the only place that binds a role to
 * a model, so pointing the Developer at an external coding agent later is a
 * one-line change.
 */

const CODER = "@cf/qwen/qwen2.5-coder-32b-instruct";
const GENERAL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

export const MODEL_BY_ROLE: Record<string, string> = {
  orchestrator: GENERAL,
  developer: CODER,
  testing: CODER,
  security: GENERAL,
  reviewer: GENERAL,
  autofix: CODER,
};

export type Env = {
  ARTIFACTS: any;
  MESH: DurableObjectNamespace;
  AI: any;
};

/**
 * Ask a model for JSON and actually get JSON back.
 *
 * Small models fence their output and narrate around it, so we extract the
 * outermost JSON value rather than trusting the response shape. A parse
 * failure returns the fallback instead of killing the run: one flaky agent
 * must not take down a mesh of fifty.
 */
export async function askJSON<T>(
  env: Env,
  role: string,
  system: string,
  user: string,
  fallback: T,
): Promise<T> {
  const model = MODEL_BY_ROLE[role] ?? GENERAL;
  try {
    const res = await env.AI.run(model, {
      messages: [
        { role: "system", content: system + "\n\nRespond with JSON only. No prose, no code fences." },
        { role: "user", content: user },
      ],
      max_tokens: 2048,
      temperature: 0.2,
    });
    const text: string = res?.response ?? res?.result?.response ?? "";
    const parsed = extractJSON(text);
    return (parsed as T) ?? fallback;
  } catch (err) {
    console.error(`agent ${role} model error`, err);
    return fallback;
  }
}

function extractJSON(text: string): unknown | null {
  if (!text) return null;
  const stripped = text.replace(/```(?:json)?/gi, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Fall through to brace matching.
  }
  const start = stripped.search(/[[{]/);
  if (start === -1) return null;
  const open = stripped[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(stripped.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
