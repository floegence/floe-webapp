import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   One icon = one bold, iconic element. No miniature simulations.
   The squircle is a complementary backdrop for a single hero glyph.
   ====================================================================== */

function Defs(props: { id: string; top: string; bot: string }) {
  return (
    <defs>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
      <linearGradient id={`${props.id}-rim`} x1="0" y1="0" x2="0" y2=".35">
        <stop offset="0%" stop-color="white" stop-opacity=".18" />
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

/* ── Terminal — the `>_` prompt is everything ──────────────────────── */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#232338" bot="#0e0e1c" />
    <Glass id="t" />
    <g fill="none" stroke="white" stroke-opacity=".9" stroke-width="3"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="13,13 23,24 13,35" />
      <line x1="27" y1="37" x2="35" y2="37" />
    </g>
  </svg>
);

/* ── Folder — amber folder on cool slate bg ────────────────────────── */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#4c586c" bot="#2a3440" />
    <Glass id="f" />
    <path d="M10 14.5a3 3 0 0 1 3-3h4l3.5 2.5H35a3 3 0 0 1 3 3V31a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V14.5Z"
          fill="#e8b830" />
    <path d="M10 14.5v16.5a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V18H19.5l-3-2.5H13a3 3 0 0 0-3-1Z"
          fill="black" fill-opacity=".1" />
  </svg>
);

/* ── CPU / Monitor — the chart curve is the hero ───────────────────── */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#1c2e2c" bot="#0e1a18" />
    <Glass id="c" />
    {/* bold waveform — the single visual */}
    <polyline points="5,32 8,32 14,14 18,36 23,20 28,28 31,28 43,28"
              fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.8"
              stroke-linecap="round" stroke-linejoin="round" />
    {/* endpoint glow dot */}
    <circle cx="43" cy="28" r="3.5" fill="white" fill-opacity=".25" />
    <circle cx="43" cy="28" r="1.8" fill="white" fill-opacity=".8" />
  </svg>
);

/* ── Activity / Logs — coloured level badges ───────────────────────── */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#28201a" bot="#130d08" />
    <Glass id="a" />
    {/* three bold log-level pills */}
    <rect x="9" y="10" width="30" height="7" rx="3.5" fill="#3b82f6" opacity=".35" />
    <rect x="13" y="12.5" width="22" height="2" rx="1" fill="white" opacity=".4" />
    <rect x="9" y="20.5" width="30" height="7" rx="3.5" fill="#f59e0b" opacity=".35" />
    <rect x="13" y="23" width="16" height="2" rx="1" fill="white" opacity=".35" />
    <rect x="9" y="31" width="30" height="7" rx="3.5" fill="#ef4444" opacity=".35" />
    <rect x="13" y="33.5" width="20" height="2" rx="1" fill="white" opacity=".4" />
  </svg>
);

/* ── FileCode — the `</>` bracket pair ─────────────────────────────── */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#2a3040" bot="#151a28" />
    <Glass id="fc" />
    <g fill="none" stroke="white" stroke-opacity=".9" stroke-width="2.8"
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
    <Defs id="s" top="#1c2a28" bot="#0d1614" />
    <Glass id="s" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="3.2" stroke-linecap="round">
      <circle cx="20" cy="20" r="10" />
      <line x1="28" y1="28" x2="37" y2="37" />
    </g>
  </svg>
);

/* ── Globe / Ports — port number + status dot ──────────────────────── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#1c2830" bot="#0d1518" />
    <Glass id="g" />
    {/* port number — the key visual */}
    <text x="24" y="26" text-anchor="middle"
          font-family="'SF Mono',monospace" font-size="14" font-weight="700"
          fill="white" fill-opacity=".85">:5173</text>
    {/* green status dot */}
    <circle cx="24" cy="35" r="2.5" fill="#2f855a" />
  </svg>
);

/* ── Sparkles / Flower AI — the sparkle star ───────────────────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#2c203a" bot="#160e24" />
    <Glass id="sp" />
    <path d="M24 8l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"
          fill="white" fill-opacity=".22" stroke="white" stroke-opacity=".85"
          stroke-width="2" stroke-linejoin="round" />
  </svg>
);

/* ── Bot / Codex — robot face + antenna ────────────────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#28243a" bot="#141020" />
    <Glass id="b" />
    <g fill="none" stroke="white" stroke-opacity=".85" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="11" y="15" width="26" height="18" rx="6" />
      <line x1="24" y1="15" x2="24" y2="8" />
      <circle cx="24" cy="7" r="2.2" fill="white" fill-opacity=".35" stroke="none" />
      <circle cx="18" cy="23" r="2.5" fill="white" fill-opacity=".25" stroke="none" />
      <circle cx="30" cy="23" r="2.5" fill="white" fill-opacity=".25" stroke="none" />
      <circle cx="18" cy="23" r="1" fill="white" fill-opacity=".8" stroke="none" />
      <circle cx="30" cy="23" r="1" fill="white" fill-opacity=".8" stroke="none" />
      <path d="M19 28 Q24 31 29 28" stroke-opacity=".5" />
    </g>
  </svg>
);

/* ── Code / Codespaces — card with green status badge ──────────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#202838" bot="#101420" />
    <Glass id="cd" />
    {/* one bold card */}
    <rect x="7" y="10" width="34" height="28" rx="4" fill="white" opacity=".1"
          stroke="white" stroke-opacity=".15" stroke-width="1" />
    <circle cx="12" cy="16" r="2" fill="white" opacity=".3" />
    <rect x="17" y="14" width="16" height="2.5" rx="1.25" fill="white" opacity=".25" />
    <rect x="17" y="19" width="12" height="2" rx="1" fill="white" opacity=".15" />
    {/* green "Running" badge */}
    <rect x="11" y="28" width="26" height="6" rx="3" fill="#2f855a" opacity=".3" />
    <circle cx="17" cy="31" r="1.5" fill="#4ade80" />
    <rect x="21" y="29" width="12" height="2.5" rx="1.25" fill="white" opacity=".4" />
  </svg>
);

/* ── Sticky — red pin + yellow note ────────────────────────────────── */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#4a4254" bot="#2c2434" />
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
    <Defs id="r" top="#32262e" bot="#1b1018" />
    <Glass id="r" />
    <rect x="11" y="13" width="26" height="22" rx="2.5" fill="none" stroke="white"
          stroke-opacity=".7" stroke-width="1.8" stroke-dasharray="4 4" />
    <rect x="8" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="34" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="8" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="34" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
  </svg>
);

/* ── Text — document with text lines ───────────────────────────────── */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" top="#444c58" bot="#28303a" />
    <Glass id="tx" />
    <rect x="9" y="11" width="30" height="27" rx="2.5" fill="#f4f4f8" />
    <rect x="14" y="15" width="14" height="2.5" rx="1.25" fill="#1a1a2a" opacity=".55" />
    <rect x="14" y="20" width="20" height="1.5" rx=".75" fill="#1a1a2a" opacity=".3" />
    <rect x="14" y="24" width="16" height="1.5" rx=".75" fill="#1a1a2a" opacity=".25" />
    <rect x="14" y="28" width="18" height="1.5" rx=".75" fill="#1a1a2a" opacity=".2" />
    <rect x="14" y="32" width="12" height="1.5" rx=".75" fill="#1a1a2a" opacity=".15" />
  </svg>
);

/* ── LayoutDashboard — 2×2 grid ────────────────────────────────────── */
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ld" top="#384458" bot="#1c2838" />
    <Glass id="ld" />
    <g fill="white">
      <rect x="10" y="12" width="12" height="11" rx="2.8" fill-opacity=".38" />
      <rect x="25" y="12" width="12" height="11" rx="2.8" fill-opacity=".15" />
      <rect x="10" y="26" width="12" height="11" rx="2.8" fill-opacity=".15" />
      <rect x="25" y="26" width="12" height="11" rx="2.8" fill-opacity=".22" />
    </g>
  </svg>
);

/* ── Layers — 3 stacked rects ──────────────────────────────────────── */
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="l" top="#384c44" bot="#1c3028" />
    <Glass id="l" />
    <g fill="white" stroke="white" stroke-width="1.6" stroke-linejoin="round">
      <rect x="8"  y="28" width="26" height="11" rx="3.5" fill-opacity=".1"  stroke-opacity=".22" />
      <rect x="10" y="21" width="26" height="11" rx="3.5" fill-opacity=".18" stroke-opacity=".38" />
      <rect x="12" y="14" width="26" height="11" rx="3.5" fill-opacity=".32" stroke-opacity=".6"  />
    </g>
  </svg>
);
