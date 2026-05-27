import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Backgrounds adapt to theme via var(--card).  Each icon tints the card
   surface with its own identity colour so it feels native in every mode.
   The single hero glyph is semi-transparent — legible on any background.
   ====================================================================== */

function Defs(props: { id: string; tint: string; strength?: number }) {
  const s = props.strength ?? 1;
  const topPct = Math.round(8 * s);
  const botPct = Math.round(18 * s);
  return (
    <defs>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"
              stop-color={`color-mix(in srgb, var(--card), ${props.tint} ${topPct}%)`} />
        <stop offset="100%"
              stop-color={`color-mix(in srgb, var(--card), ${props.tint} ${botPct}%)`} />
      </linearGradient>
      <linearGradient id={`${props.id}-rim`} x1="0" y1="0" x2="0" y2=".35">
        <stop offset="0%" stop-color="white" stop-opacity=".14" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </linearGradient>
    </defs>
  );
}

function Glass(props: { id: string }) {
  return (
    <>
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${props.id}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${props.id}-rim)`} />
    </>
  );
}

/* ── Terminal — bold `>_` ──────────────────────────────────────────── */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" tint="#1a1a30" />
    <Glass id="t" />
    <g fill="none" stroke="var(--foreground)" stroke-opacity=".75" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="13,13 23,24 13,35" />
      <line x1="27" y1="37" x2="35" y2="37" />
    </g>
  </svg>
);

/* ── Folder — amber folder shape ───────────────────────────────────── */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" tint="#b07818" />
    <Glass id="f" />
    <path d="M10 14.5a3 3 0 0 1 3-3h4l3.5 2.5H35a3 3 0 0 1 3 3V31a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V14.5Z"
          fill="#e8b830" />
    <path d="M10 14.5v16.5a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V18H19.5l-3-2.5H13a3 3 0 0 0-3-1Z"
          fill="black" fill-opacity=".1" />
  </svg>
);

/* ── Monitor — smooth curve + gradient area fill (floe chart style) ── */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" tint="#0d6b5c" />
    <defs>
      <linearGradient id="c-area" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--chart-4)" stop-opacity=".35" />
        <stop offset="100%" stop-color="var(--chart-4)" stop-opacity=".03" />
      </linearGradient>
    </defs>
    <Glass id="c" />
    {/* subtle grid */}
    <line x1="8" y1="14" x2="40" y2="14" stroke="var(--foreground)" stroke-opacity=".05" stroke-width=".6" />
    <line x1="8" y1="22" x2="40" y2="22" stroke="var(--foreground)" stroke-opacity=".07" stroke-width=".6" />
    <line x1="8" y1="30" x2="40" y2="30" stroke="var(--foreground)" stroke-opacity=".05" stroke-width=".6" />
    <line x1="8" y1="38" x2="40" y2="38" stroke="var(--foreground)" stroke-opacity=".04" stroke-width=".6" />
    {/* area fill — curve closed to baseline */}
    <path d="M6,36 L9,36 L14,18 L20,34 L26,22 L30,26 L34,26 L42,30 L42,42 L6,42 Z"
          fill="url(#c-area)" />
    {/* the curve line */}
    <polyline points="6,36 9,36 14,18 20,34 26,22 30,26 34,26 42,30"
              fill="none" stroke="var(--chart-4)" stroke-opacity=".85" stroke-width="2.2"
              stroke-linecap="round" stroke-linejoin="round" />
    {/* endpoint dot */}
    <circle cx="42" cy="30" r="2.8" fill="var(--chart-4)" fill-opacity=".2" />
    <circle cx="42" cy="30" r="1.5" fill="var(--chart-4)" fill-opacity=".85" />
  </svg>
);

/* ── Activity / Logs — coloured level bars ─────────────────────────── */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" tint="#7c2d10" />
    <Glass id="a" />
    <rect x="8" y="10" width="32" height="8" rx="4" fill="#3b82f6" opacity=".25" />
    <rect x="13" y="13" width="20" height="2" rx="1" fill="var(--foreground)" opacity=".35" />
    <rect x="8" y="21" width="32" height="8" rx="4" fill="#f59e0b" opacity=".25" />
    <rect x="13" y="24" width="14" height="2" rx="1" fill="var(--foreground)" opacity=".3" />
    <rect x="8" y="32" width="32" height="8" rx="4" fill="#ef4444" opacity=".25" />
    <rect x="13" y="35" width="18" height="2" rx="1" fill="var(--foreground)" opacity=".35" />
  </svg>
);

/* ── FileCode — `</>` brackets ─────────────────────────────────────── */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" tint="#2838a0" />
    <Glass id="fc" />
    <g fill="none" stroke="var(--foreground)" stroke-opacity=".75" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,11 5,24 14,37" />
      <polyline points="34,11 43,24 34,37" />
    </g>
  </svg>
);

/* ── Search — magnifying glass ─────────────────────────────────────── */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" tint="#0a6c48" />
    <Glass id="s" />
    <g fill="none" stroke="var(--foreground)" stroke-opacity=".75" stroke-width="3" stroke-linecap="round">
      <circle cx="20" cy="20" r="10" />
      <line x1="28" y1="28" x2="37" y2="37" />
    </g>
  </svg>
);

/* ── Globe / Ports — overlapping circles, pure fill, zero strokes ──── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" tint="#0c6478" />
    <Glass id="g" />
    {/* left circle — translucent */}
    <circle cx="15" cy="24" r="9" fill="var(--foreground)" fill-opacity=".08" />
    {/* right circle — translucent */}
    <circle cx="33" cy="24" r="9" fill="var(--foreground)" fill-opacity=".08" />
    {/* centre circle — green proxy */}
    <circle cx="24" cy="24" r="7" fill="var(--chart-4)" fill-opacity=".4" />
  </svg>
);

/* ── Sparkles / Flower AI — star ───────────────────────────────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" tint="#6b28a8" />
    <Glass id="sp" />
    <path d="M24 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"
          fill="var(--foreground)" fill-opacity=".15" stroke="var(--foreground)"
          stroke-opacity=".7" stroke-width="2" stroke-linejoin="round" />
  </svg>
);

/* ── Bot / Codex — robot face ──────────────────────────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" tint="#4c28a0" />
    <Glass id="b" />
    <g fill="none" stroke="var(--foreground)" stroke-opacity=".7" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="11" y="15" width="26" height="18" rx="6" />
      <line x1="24" y1="15" x2="24" y2="8" />
      <circle cx="24" cy="7" r="2.2" fill="var(--foreground)" fill-opacity=".3" stroke="none" />
      <circle cx="18" cy="23" r="2.5" fill="var(--foreground)" fill-opacity=".2" stroke="none" />
      <circle cx="30" cy="23" r="2.5" fill="var(--foreground)" fill-opacity=".2" stroke="none" />
      <circle cx="18" cy="23" r="1" fill="var(--foreground)" fill-opacity=".65" stroke="none" />
      <circle cx="30" cy="23" r="1" fill="var(--foreground)" fill-opacity=".65" stroke="none" />
      <path d="M19 28 Q24 31 29 28" stroke-opacity=".45" />
    </g>
  </svg>
);

/* ── Code / Codespaces — syntax-highlighted code lines ─────────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" tint="#242c58" strength={1.5} />
    <Glass id="cd" />
    {/* line 1 — keyword + function */}
    <rect x="8"  y="10" width="9"  height="3" rx="1.5" fill="#8b3fa8" opacity=".85" />
    <rect x="20" y="10" width="15" height="3" rx="1.5" fill="#2b6cb8" opacity=".8" />
    {/* line 2 — indented string */}
    <rect x="13" y="17" width="18" height="3" rx="1.5" fill="#2d7a4a" opacity=".75" />
    {/* line 3 — deeper indent + number */}
    <rect x="18" y="24" width="6"  height="3" rx="1.5" fill="#b07020" opacity=".75" />
    <rect x="26" y="24" width="14" height="3" rx="1.5" fill="var(--foreground)" opacity=".2" />
    {/* line 4 — return keyword */}
    <rect x="8"  y="31" width="16" height="3" rx="1.5" fill="#8b3fa8" opacity=".7" />
  </svg>
);

/* ── Sticky — red pin + yellow note ────────────────────────────────── */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" tint="#a06018" />
    <Glass id="ms" />
    <rect x="10" y="15" width="28" height="22" rx="3.5" fill="#f0d060" />
    <ellipse cx="24" cy="19" rx="4" ry="2" fill="#b89020" opacity=".25" />
    <line x1="24" y1="10" x2="24" y2="17" stroke="#c0c0c8" stroke-width="1" />
    <circle cx="24" cy="10" r="4.5" fill="#e04040" />
    <circle cx="23" cy="9" r="1.2" fill="white" opacity=".3" />
    <rect x="14" y="20" width="16" height="2" rx="1" fill="#8b6810" opacity=".35" />
    <rect x="14" y="24.5" width="20" height="2" rx="1" fill="#8b6810" opacity=".28" />
    <rect x="14" y="29" width="12" height="2" rx="1" fill="#8b6810" opacity=".2" />
  </svg>
);

/* ── Region — dashed marquee + corner handles ──────────────────────── */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" tint="#9d1848" />
    <Glass id="r" />
    <rect x="11" y="13" width="26" height="22" rx="2.5" fill="none" stroke="var(--foreground)"
          stroke-opacity=".6" stroke-width="1.8" stroke-dasharray="4 4" />
    <rect x="8" y="10" width="6" height="6" rx="1.5" fill="var(--foreground)" fill-opacity=".65" />
    <rect x="34" y="10" width="6" height="6" rx="1.5" fill="var(--foreground)" fill-opacity=".65" />
    <rect x="8" y="32" width="6" height="6" rx="1.5" fill="var(--foreground)" fill-opacity=".65" />
    <rect x="34" y="32" width="6" height="6" rx="1.5" fill="var(--foreground)" fill-opacity=".65" />
  </svg>
);

/* ── Text — document with lines ────────────────────────────────────── */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" tint="#3c4c60" />
    <Glass id="tx" />
    <rect x="9" y="11" width="30" height="27" rx="2.5"
          fill="var(--background)" stroke="var(--foreground)" stroke-opacity=".12" stroke-width=".8" />
    <rect x="14" y="15" width="14" height="2.5" rx="1.25" fill="var(--foreground)" opacity=".5" />
    <rect x="14" y="20" width="20" height="1.5" rx=".75" fill="var(--foreground)" opacity=".28" />
    <rect x="14" y="24" width="16" height="1.5" rx=".75" fill="var(--foreground)" opacity=".22" />
    <rect x="14" y="28" width="18" height="1.5" rx=".75" fill="var(--foreground)" opacity=".18" />
    <rect x="14" y="32" width="12" height="1.5" rx=".75" fill="var(--foreground)" opacity=".13" />
  </svg>
);

/* ── LayoutDashboard — 2×2 grid ────────────────────────────────────── */
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ld" tint="#3048b0" />
    <Glass id="ld" />
    <g fill="var(--foreground)">
      <rect x="10" y="12" width="12" height="11" rx="2.8" fill-opacity=".35" />
      <rect x="25" y="12" width="12" height="11" rx="2.8" fill-opacity=".13" />
      <rect x="10" y="26" width="12" height="11" rx="2.8" fill-opacity=".13" />
      <rect x="25" y="26" width="12" height="11" rx="2.8" fill-opacity=".2" />
    </g>
  </svg>
);

/* ── Layers — 3 stacked rects ──────────────────────────────────────── */
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="l" tint="#206470" />
    <Glass id="l" />
    <g fill="var(--foreground)" stroke="var(--foreground)" stroke-width="1.6" stroke-linejoin="round">
      <rect x="8"  y="28" width="26" height="11" rx="3.5" fill-opacity=".08"  stroke-opacity=".2" />
      <rect x="10" y="21" width="26" height="11" rx="3.5" fill-opacity=".16" stroke-opacity=".35" />
      <rect x="12" y="14" width="26" height="11" rx="3.5" fill-opacity=".3"  stroke-opacity=".55" />
    </g>
  </svg>
);
