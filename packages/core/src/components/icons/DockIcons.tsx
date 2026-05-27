import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Each icon faithfully depicts the actual component it represents.
   The squircle background is a complementary tint — distinct from the
   component's own colours so the miniature "window" reads clearly.
   ====================================================================== */

function Defs(props: { id: string; top: string; bot: string }) {
  return (
    <defs>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
      <linearGradient id={`${props.id}-rim`} x1="0" y1="0" x2="0" y2=".4">
        <stop offset="0%" stop-color="white" stop-opacity=".2" />
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

/* ── Terminal — dark screen, green prompt, traffic lights ────────────
   Background: warm grey (contrasts with the cool dark screen) */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#353540" bot="#1e1e28" />
    <Glass id="t" />
    {/* terminal screen */}
    <rect x="8" y="9" width="32" height="28" rx="3" fill="#0d0d1a" />
    {/* traffic lights */}
    <circle cx="12" cy="13" r="1.8" fill="#ff6b6b" />
    <circle cx="17" cy="13" r="1.8" fill="#ffd93d" />
    <circle cx="22" cy="13" r="1.8" fill="#6bff8d" />
    {/* prompt */}
    <text x="11" y="20" font-family="'SF Mono',monospace" font-size="7" font-weight="700"
          fill="#78d984">$</text>
    <rect x="16" y="15.5" width="16" height="4" rx="1.5" fill="#78d984" opacity=".55" />
    {/* output lines */}
    <rect x="11" y="26" width="22" height="1" rx=".5" fill="white" opacity=".14" />
    <rect x="11" y="29" width="14" height="1" rx=".5" fill="white" opacity=".1" />
    <rect x="11" y="32" width="18" height="1" rx=".5" fill="white" opacity=".07" />
  </svg>
);

/* ── Folder — amber folder (matches file browser --warning),
   on a cool slate background ───────────────────────────────────────── */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#4c586c" bot="#2a3440" />
    <Glass id="f" />
    {/* folder body — amber like --warning */}
    <path d="M11 14a2.5 2.5 0 0 1 2.5-2.5h4l3 2H35a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H13.5A2.5 2.5 0 0 1 11 29V14Z"
          fill="#e8b830" />
    {/* folder highlight */}
    <path d="M13.5 11.5h4l3 2H35" fill="none" stroke="#f0d060" stroke-width="1"
          stroke-linecap="round" />
    {/* inner shadow depth */}
    <path d="M13.5 14v15a2.5 2.5 0 0 0 2.5 2.5h19a2.5 2.5 0 0 0 2.5-2.5V18H19l-2.5-2h-3Z"
          fill="black" fill-opacity=".12" />
  </svg>
);

/* ── CPU / System Monitor — teal bg, multi-color progress bars ───────
   faithful to the actual monitor widget (CPU blue, Mem amber, Disk green) */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#234a44" bot="#142c28" />
    <Glass id="c" />
    {/* monitor panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#0f1c1a" />
    {/* CPU row — blue bar */}
    <rect x="12" y="13" width="18" height="4" rx="2" fill="white" opacity=".08" />
    <rect x="12" y="13" width="7" height="4" rx="2" fill="#3b82f6" />
    {/* Memory row — amber bar */}
    <rect x="12" y="20" width="18" height="4" rx="2" fill="white" opacity=".08" />
    <rect x="12" y="20" width="12" height="4" rx="2" fill="#f59e0b" />
    {/* Disk row — green bar */}
    <rect x="12" y="27" width="18" height="4" rx="2" fill="white" opacity=".08" />
    <rect x="12" y="27" width="5.5" height="4" rx="2" fill="#10b981" />
  </svg>
);

/* ── Activity / Log Viewer — dark bg, coloured log lines ─────────────
   faithful to the log viewer: blue info, amber warn, red error */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#3d3028" bot="#221a14" />
    <Glass id="a" />
    {/* log viewer panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#14100e" />
    {/* info line — blue */}
    <rect x="10" y="12" width="6" height="2" rx="1" fill="#3b82f6" opacity=".6" />
    <rect x="18" y="12" width="18" height="2" rx="1" fill="white" opacity=".15" />
    {/* warn line — amber */}
    <rect x="10" y="17" width="6" height="2" rx="1" fill="#f59e0b" opacity=".6" />
    <rect x="18" y="17" width="14" height="2" rx="1" fill="white" opacity=".12" />
    {/* error line — red */}
    <rect x="10" y="22" width="6" height="2" rx="1" fill="#ef4444" opacity=".6" />
    <rect x="18" y="22" width="20" height="2" rx="1" fill="white" opacity=".15" />
    {/* info line */}
    <rect x="10" y="27" width="6" height="2" rx="1" fill="#3b82f6" opacity=".5" />
    <rect x="18" y="27" width="16" height="2" rx="1" fill="white" opacity=".1" />
    {/* debug line */}
    <rect x="10" y="32" width="6" height="2" rx="1" fill="#94a3b8" opacity=".4" />
    <rect x="18" y="32" width="10" height="2" rx="1" fill="white" opacity=".08" />
  </svg>
);

/* ── FileCode — dark editor, syntax-highlighted code ─────────────────
   faithful to the code editor: purple keyword, blue fn, green string */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#344058" bot="#1c2436" />
    <Glass id="fc" />
    {/* editor panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#141a24" />
    {/* line numbers */}
    <rect x="8" y="9" width="9" height="29" rx="3" fill="#0e121a" />
    <text x="11" y="17" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".25">1</text>
    <text x="11" y="22" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".2">2</text>
    <text x="11" y="27" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".2">3</text>
    {/* syntax-coloured code */}
    <rect x="20" y="14" width="6" height="1.5" rx=".75" fill="#c678dd" opacity=".7" />
    <rect x="27" y="14" width="10" height="1.5" rx=".75" fill="#61afef" opacity=".65" />
    <rect x="20" y="19" width="8" height="1.5" rx=".75" fill="#98c379" opacity=".55" />
    <rect x="20" y="24" width="12" height="1.5" rx=".75" fill="#e5c07b" opacity=".55" />
    <rect x="20" y="29" width="6" height="1.5" rx=".75" fill="#d19a66" opacity=".5" />
    <rect x="20" y="34" width="14" height="1.5" rx=".75" fill="white" opacity=".15" />
  </svg>
);

/* ── Search / Preview — centred layout with magnifying glass ───────── */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" top="#2c403c" bot="#162420" />
    <Glass id="s" />
    {/* preview panel */}
    <rect x="9" y="10" width="30" height="27" rx="3" fill="#121c1a" />
    {/* search icon */}
    <g fill="none" stroke="white" stroke-opacity=".35" stroke-width="2" stroke-linecap="round">
      <circle cx="24" cy="20" r="5" />
      <line x1="28" y1="24" x2="31" y2="27" />
    </g>
    {/* title line */}
    <rect x="16" y="29" width="16" height="1.5" rx=".75" fill="white" opacity=".18" />
    {/* url line */}
    <rect x="13" y="33" width="22" height="1" rx=".5" fill="white" opacity=".08" />
  </svg>
);

/* ── Globe / Ports — port list with numbers & status ───────────────── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#2c3c44" bot="#18242c" />
    <Glass id="g" />
    {/* ports panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#101c24" />
    {/* port row 1 */}
    <text x="11" y="17" font-family="'SF Mono',monospace" font-size="6" font-weight="700"
          fill="#60a0f0">:5173</text>
    <rect x="32" y="12" width="6" height="3" rx="1.5" fill="white" opacity=".12" />
    <circle cx="37" cy="16" r="1.5" fill="#2f855a" />
    {/* port row 2 */}
    <text x="11" y="24" font-family="'SF Mono',monospace" font-size="6" font-weight="700"
          fill="#60a0f0">:4550</text>
    <rect x="32" y="19" width="6" height="3" rx="1.5" fill="white" opacity=".12" />
    <circle cx="37" cy="23" r="1.5" fill="#b7791f" />
    {/* port row 3 */}
    <text x="11" y="31" font-family="'SF Mono',monospace" font-size="6" font-weight="700"
          fill="#60a0f0">:3000</text>
    <rect x="32" y="26" width="6" height="3" rx="1.5" fill="white" opacity=".12" />
    <circle cx="37" cy="30" r="1.5" fill="#2f855a" />
  </svg>
);

/* ── Sparkles / Flower AI — hero section + analysis cards ──────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#403048" bot="#241c30" />
    <Glass id="sp" />
    {/* AI panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#1a1424" />
    {/* hero highlight */}
    <rect x="10" y="11" width="28" height="10" rx="2.5" fill="white" opacity=".06" />
    {/* sparkle icon */}
    <path d="M18 14l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"
          fill="white" fill-opacity=".5" stroke="none" />
    {/* hero title */}
    <rect x="24" y="12" width="10" height="2" rx="1" fill="white" opacity=".25" />
    <rect x="24" y="16" width="14" height="1.5" rx=".75" fill="white" opacity=".12" />
    {/* cards */}
    <rect x="10" y="22" width="28" height="5" rx="1.5" fill="white" opacity=".05" stroke="white" stroke-opacity=".08" stroke-width=".6" />
    <circle cx="13" cy="24.5" r="1.2" fill="white" opacity=".25" />
    <rect x="16" y="23" width="12" height="1.5" rx=".75" fill="white" opacity=".2" />
    <rect x="10" y="28.5" width="28" height="5" rx="1.5" fill="white" opacity=".04" stroke="white" stroke-opacity=".06" stroke-width=".6" />
    <circle cx="13" cy="31" r="1.2" fill="white" opacity=".2" />
    <rect x="16" y="29.5" width="10" height="1.5" rx=".75" fill="white" opacity=".15" />
    <rect x="10" y="35" width="28" height="5" rx="1.5" fill="white" opacity=".03" stroke="white" stroke-opacity=".05" stroke-width=".6" />
    <circle cx="13" cy="37.5" r="1.2" fill="white" opacity=".15" />
    <rect x="16" y="36" width="8" height="1.5" rx=".75" fill="white" opacity=".1" />
  </svg>
);

/* ── Bot / Codex — hero + task list with icons ─────────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#343050" bot="#1e1834" />
    <Glass id="b" />
    {/* codex panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#161226" />
    {/* hero */}
    <rect x="10" y="11" width="28" height="9" rx="2.5" fill="white" opacity=".05" />
    <rect x="13" y="12" width="3" height="3" rx="1.5" fill="white" opacity=".3" />
    <rect x="18" y="12" width="14" height="2.5" rx="1.25" fill="white" opacity=".22" />
    <rect x="18" y="16.5" width="18" height="1.5" rx=".75" fill="white" opacity=".1" />
    {/* task rows */}
    <rect x="10" y="22" width="28" height="5" rx="1.5" fill="white" opacity=".04" />
    <text x="13" y="25.5" font-family="'SF Mono',monospace" font-size="5" fill="white" opacity=".25">#</text>
    <rect x="17" y="24" width="14" height="1.3" rx=".65" fill="white" opacity=".15" />
    <rect x="10" y="28" width="28" height="5" rx="1.5" fill="white" opacity=".03" />
    <text x="13" y="31.5" font-family="'SF Mono',monospace" font-size="5" fill="white" opacity=".2">{'</>'}</text>
    <rect x="17" y="30" width="12" height="1.3" rx=".65" fill="white" opacity=".12" />
    <rect x="10" y="34" width="28" height="5" rx="1.5" fill="white" opacity=".02" />
    <text x="13" y="37.5" font-family="'SF Mono',monospace" font-size="5" fill="white" opacity=".15">z</text>
    <rect x="17" y="36" width="10" height="1.3" rx=".65" fill="white" opacity=".1" />
  </svg>
);

/* ── Code / Codespaces — card list with status badges ──────────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#303848" bot="#1a2030" />
    <Glass id="cd" />
    {/* codespaces panel */}
    <rect x="8" y="9" width="32" height="29" rx="3" fill="#121824" />
    {/* card 1 */}
    <rect x="10" y="11" width="28" height="7" rx="2" fill="white" opacity=".06" stroke="white" stroke-opacity=".08" stroke-width=".5" />
    <circle cx="13" cy="14.5" r="1.5" fill="white" opacity=".25" />
    <rect x="17" y="12.5" width="14" height="2" rx="1" fill="white" opacity=".2" />
    <rect x="17" y="16.5" width="8" height="1.5" rx=".75" fill="#2f855a" opacity=".5" />
    {/* card 2 */}
    <rect x="10" y="19.5" width="28" height="7" rx="2" fill="white" opacity=".04" stroke="white" stroke-opacity=".06" stroke-width=".5" />
    <circle cx="13" cy="23" r="1.5" fill="white" opacity=".2" />
    <rect x="17" y="21" width="12" height="2" rx="1" fill="white" opacity=".15" />
    <rect x="17" y="25" width="10" height="1.5" rx=".75" fill="#b7791f" opacity=".4" />
    {/* card 3 */}
    <rect x="10" y="28" width="28" height="7" rx="2" fill="white" opacity=".03" stroke="white" stroke-opacity=".05" stroke-width=".5" />
    <circle cx="13" cy="31.5" r="1.5" fill="white" opacity=".15" />
    <rect x="17" y="29.5" width="10" height="2" rx="1" fill="white" opacity=".12" />
  </svg>
);

/* ── Sticky — yellow note + red pushpin on a cool-tone background ────
   Background is NOT yellow — the note stands out clearly */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#484050" bot="#2a2430" />
    <Glass id="ms" />
    {/* yellow note body */}
    <rect x="10" y="14" width="27" height="22" rx="3" fill="#f0d060" />
    {/* pin shadow on paper */}
    <ellipse cx="24" cy="18" rx="3.5" ry="1.8" fill="#b89020" opacity=".3" />
    {/* pin needle */}
    <line x1="24" y1="10" x2="24" y2="16" stroke="#c0c0c8" stroke-width="1" />
    {/* red pin head */}
    <circle cx="24" cy="10" r="4" fill="#e04040" />
    <circle cx="23" cy="9" r="1.2" fill="white" opacity=".3" />
    {/* fold corner */}
    <path d="M30 14l7 7h-4.5a2.5 2.5 0 0 1-2.5-2.5V14Z" fill="#d4b838" />
    {/* handwritten lines */}
    <line x1="14" y1="19.5" x2="28" y2="19" stroke="#8b6810" opacity=".4" stroke-width="1" stroke-linecap="round" />
    <line x1="14" y1="23" x2="26" y2="23" stroke="#8b6810" opacity=".3" stroke-width="1" stroke-linecap="round" />
    <line x1="14" y1="26.5" x2="22" y2="26.5" stroke="#8b6810" opacity=".25" stroke-width="1" stroke-linecap="round" />
    <line x1="14" y1="30" x2="24" y2="30" stroke="#8b6810" opacity=".2" stroke-width="1" stroke-linecap="round" />
  </svg>
);

/* ── Region — dashed frame + handles on a dark bg ──────────────────── */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" top="#483840" bot="#281c24" />
    <Glass id="r" />
    {/* dark viewfinder */}
    <rect x="8" y="9" width="32" height="29" rx="2.5" fill="#180e14" />
    {/* dashed marquee */}
    <rect x="12" y="14" width="24" height="19" rx="2" fill="none" stroke="white"
          stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 3.5" />
    {/* corner handles */}
    <rect x="9" y="11" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="33" y="11" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="9" y="30" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="33" y="30" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
  </svg>
);

/* ── Text — document with lines on a neutral bg ────────────────────── */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" top="#444c58" bot="#28303a" />
    <Glass id="tx" />
    {/* document */}
    <rect x="9" y="11" width="30" height="27" rx="2.5" fill="#f4f4f8" />
    {/* title */}
    <rect x="14" y="15" width="14" height="2.5" rx="1.25" fill="#1a1a2a" opacity=".55" />
    {/* body */}
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
      <rect x="10" y="12" width="12" height="11" rx="2.8" fill-opacity=".35" />
      <rect x="25" y="12" width="12" height="11" rx="2.8" fill-opacity=".14" />
      <rect x="10" y="26" width="12" height="11" rx="2.8" fill-opacity=".14" />
      <rect x="25" y="26" width="12" height="11" rx="2.8" fill-opacity=".2" />
    </g>
  </svg>
);

/* ── Layers — three stacked rounded rects ──────────────────────────── */
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
