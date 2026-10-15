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
  ITEMS: DurableObjectNamespace;
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
    const parsed = coerce(res);
    if (parsed === null) {
      console.error(`agent ${role}: unparseable response`, JSON.stringify(res).slice(0, 600));
      return fallback;
    }
    return parsed as T;
  } catch (err) {
    console.error(`agent ${role} model error`, err);
    return fallback;
  }
}

/**
 * Workers AI models do not agree on a response shape. Some return
 * `response` as a raw string, some return it already parsed as an object, and
 * the OpenAI-compatible ones nest the text under `choices[].message.content`.
 * Normalising here keeps every agent indifferent to which model it is bound to.
 */
function coerce(res: any): unknown | null {
  if (res == null) return null;
  const candidates = [
    res.response,
    res.result?.response,
    res.choices?.[0]?.message?.content,
    res.output,
    res,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (typeof c === "object") {
      // Already-parsed JSON, but skip the envelope itself unless it looks like data.
      if (c === res && !("tasks" in c || "files" in c || "findings" in c || "comments" in c)) continue;
      return c;
    }
    if (typeof c === "string") {
      const parsed = extractJSON(c);
      if (parsed !== null) return parsed;
    }
  }
  return null;
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
