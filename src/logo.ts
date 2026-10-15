/**
 * The CodeMesh mark, as inline SVG.
 *
 * Kept as vector rather than a raster asset so it stays sharp at every size,
 * ships inside the Worker with no extra request, and doubles as the favicon.
 */

const GRAD = (id: string) => `
  <linearGradient id="${id}-a" x1="0" y1="1" x2="1" y2="0">
    <stop offset="0" stop-color="#FF9A3C"/><stop offset="1" stop-color="#F4511E"/>
  </linearGradient>
  <linearGradient id="${id}-b" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FF7A2F"/><stop offset="1" stop-color="#E2411A"/>
  </linearGradient>`;

/**
 * The ribbon "M": two folded strokes that cross at the centre valley, which is
 * the mesh idea in one glyph — separate paths of work converging.
 */
export function mark(size = 32, id = "cm"): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 100" fill="none"
  xmlns="http://www.w3.org/2000/svg" role="img" aria-label="CodeMesh">
  <defs>${GRAD(id)}</defs>
  <path d="M6 88 L34 16 Q38 6 46 10 L60 52 L74 10 Q82 6 86 16 L114 88 L96 88 L76 32 L64 70 Q60 80 56 70 L44 32 L24 88 Z"
        fill="url(#${id}-a)"/>
  <path d="M46 10 Q38 6 34 16 L60 52 L74 10 Q70 4 64 8 L60 30 Z"
        fill="url(#${id}-b)" opacity=".55"/>
  <path d="M60 52 L76 32 L96 88 L86 88 Z" fill="#D63B14" opacity=".28"/>
</svg>`;
}

/** Full lockup: mark over the wordmark and tagline. */
export function lockup(): string {
  return `<div class="lockup">
    ${mark(46, "cml")}
    <div class="lockup-text">
      <div class="wordmark">Code<span>Mesh</span></div>
      <div class="tagline">Build Together</div>
    </div>
  </div>`;
}

export const FAVICON =
  "data:image/svg+xml," + encodeURIComponent(mark(64, "fav"));
