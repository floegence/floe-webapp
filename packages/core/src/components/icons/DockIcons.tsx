import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Each icon's squircle background IS the component's surface.
   Content sits directly on the glass — no inner panel, no frame-in-frame.
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

/* ── Terminal — squircle is the terminal screen ────────────────────── */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#222238" bot="#0d0d1a" />
    <Glass id="t" />
    {/* traffic lights */}
    <circle cx="8" cy="8" r="1.6" fill="#ff6b6b" />
    <circle cx="13" cy="8" r="1.6" fill="#ffd93d" />
    <circle cx="18" cy="8" r="1.6" fill="#6bff8d" />
    {/* prompt */}
    <text x="8" y="20" font-family="'SF Mono',monospace" font-size="7.5" font-weight="700"
          fill="#78d984">$</text>
    <rect x="14" y="15" width="18" height="4.5" rx="1.5" fill="#78d984" opacity=".5" />
    {/* output */}
    <rect x="8" y="25" width="24" height="1.2" rx=".6" fill="white" opacity=".13" />
    <rect x="8" y="28.5" width="16" height="1.2" rx=".6" fill="white" opacity=".09" />
    <rect x="8" y="32" width="20" height="1.2" rx=".6" fill="white" opacity=".06" />
  </svg>
);

/* ── Folder — amber folder on a cool complementary bg ──────────────── */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#4c586c" bot="#2a3440" />
    <Glass id="f" />
    <path d="M11 14a2.5 2.5 0 0 1 2.5-2.5h4l3 2H35a2.5 2.5 0 0 1 2.5 2.5v13a2.5 2.5 0 0 1-2.5 2.5H13.5A2.5 2.5 0 0 1 11 29V14Z"
          fill="#e8b830" />
    <path d="M13.5 11.5h4l3 2H35" fill="none" stroke="#f0d060" stroke-width="1" stroke-linecap="round" />
    <path d="M13.5 14v15a2.5 2.5 0 0 0 2.5 2.5h19a2.5 2.5 0 0 0 2.5-2.5V18H19l-2.5-2h-3Z"
          fill="black" fill-opacity=".12" />
  </svg>
);

/* ── CPU / System Monitor — squircle is the monitor surface ────────── */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#1a302c" bot="#0e1c1a" />
    <Glass id="c" />
    <rect x="10" y="11" width="18" height="4.5" rx="2.2" fill="white" opacity=".08" />
    <rect x="10" y="11" width="7.5" height="4.5" rx="2.2" fill="#3b82f6" />
    <rect x="10" y="19" width="18" height="4.5" rx="2.2" fill="white" opacity=".08" />
    <rect x="10" y="19" width="12.5" height="4.5" rx="2.2" fill="#f59e0b" />
    <rect x="10" y="27" width="18" height="4.5" rx="2.2" fill="white" opacity=".08" />
    <rect x="10" y="27" width="5.5" height="4.5" rx="2.2" fill="#10b981" />
  </svg>
);

/* ── Activity / Log Viewer — squircle is the log surface ───────────── */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#28201a" bot="#140e0a" />
    <Glass id="a" />
    <rect x="8" y="10" width="6.5" height="2.2" rx="1.1" fill="#3b82f6" opacity=".6" />
    <rect x="17" y="10" width="18" height="2.2" rx="1.1" fill="white" opacity=".14" />
    <rect x="8" y="15.5" width="6.5" height="2.2" rx="1.1" fill="#f59e0b" opacity=".6" />
    <rect x="17" y="15.5" width="14" height="2.2" rx="1.1" fill="white" opacity=".11" />
    <rect x="8" y="21" width="6.5" height="2.2" rx="1.1" fill="#ef4444" opacity=".6" />
    <rect x="17" y="21" width="20" height="2.2" rx="1.1" fill="white" opacity=".14" />
    <rect x="8" y="26.5" width="6.5" height="2.2" rx="1.1" fill="#3b82f6" opacity=".45" />
    <rect x="17" y="26.5" width="16" height="2.2" rx="1.1" fill="white" opacity=".09" />
    <rect x="8" y="32" width="6.5" height="2.2" rx="1.1" fill="#94a3b8" opacity=".35" />
    <rect x="17" y="32" width="10" height="2.2" rx="1.1" fill="white" opacity=".07" />
  </svg>
);

/* ── FileCode — squircle is the editor surface ─────────────────────── */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#242c3a" bot="#131820" />
    <Glass id="fc" />
    <text x="8" y="16" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".22">1</text>
    <text x="8" y="21" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".18">2</text>
    <text x="8" y="26" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".18">3</text>
    <rect x="15" y="12.5" width="6" height="1.5" rx=".75" fill="#c678dd" opacity=".7" />
    <rect x="22" y="12.5" width="10" height="1.5" rx=".75" fill="#61afef" opacity=".65" />
    <rect x="15" y="17.5" width="8" height="1.5" rx=".75" fill="#98c379" opacity=".55" />
    <rect x="15" y="22.5" width="12" height="1.5" rx=".75" fill="#e5c07b" opacity=".55" />
    <rect x="15" y="27.5" width="6" height="1.5" rx=".75" fill="#d19a66" opacity=".5" />
    <rect x="15" y="32.5" width="14" height="1.5" rx=".75" fill="white" opacity=".12" />
  </svg>
);

/* ── Search / Preview — squircle is the preview surface ────────────── */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" top="#1c2a28" bot="#0e1816" />
    <Glass id="s" />
    <g fill="none" stroke="white" stroke-opacity=".35" stroke-width="2" stroke-linecap="round">
      <circle cx="22" cy="19" r="5" />
      <line x1="26" y1="23" x2="29" y2="26" />
    </g>
    <rect x="13" y="29" width="18" height="1.5" rx=".75" fill="white" opacity=".16" />
    <rect x="10" y="33" width="24" height="1" rx=".5" fill="white" opacity=".07" />
  </svg>
);

/* ── Globe / Ports — squircle is the ports surface ─────────────────── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#1c2830" bot="#0e161c" />
    <Glass id="g" />
    <text x="8" y="15" font-family="'SF Mono',monospace" font-size="6.5" font-weight="700" fill="#60a0f0">:5173</text>
    <rect x="30" y="10" width="7" height="3.5" rx="1.7" fill="white" opacity=".1" />
    <circle cx="38" cy="15" r="1.5" fill="#2f855a" />
    <text x="8" y="23" font-family="'SF Mono',monospace" font-size="6.5" font-weight="700" fill="#60a0f0">:4550</text>
    <rect x="30" y="18" width="7" height="3.5" rx="1.7" fill="white" opacity=".1" />
    <circle cx="38" cy="23" r="1.5" fill="#b7791f" />
    <text x="8" y="31" font-family="'SF Mono',monospace" font-size="6.5" font-weight="700" fill="#60a0f0">:3000</text>
    <rect x="30" y="26" width="7" height="3.5" rx="1.7" fill="white" opacity=".1" />
    <circle cx="38" cy="31" r="1.5" fill="#2f855a" />
  </svg>
);

/* ── Sparkles / Flower AI — squircle is the AI surface ─────────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#2a2038" bot="#160e20" />
    <Glass id="sp" />
    {/* hero */}
    <rect x="6" y="7" width="36" height="12" rx="2.5" fill="white" opacity=".06" />
    <path d="M13 11l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"
          fill="white" fill-opacity=".45" stroke="none" />
    <rect x="21" y="10" width="12" height="2.2" rx="1.1" fill="white" opacity=".22" />
    <rect x="21" y="14" width="16" height="1.5" rx=".75" fill="white" opacity=".1" />
    {/* cards */}
    <rect x="6" y="22" width="36" height="6" rx="2" fill="white" opacity=".05" stroke="white" stroke-opacity=".07" stroke-width=".5" />
    <circle cx="9.5" cy="25" r="1.3" fill="white" opacity=".22" />
    <rect x="13" y="23.5" width="14" height="1.5" rx=".75" fill="white" opacity=".18" />
    <rect x="6" y="30" width="36" height="6" rx="2" fill="white" opacity=".04" stroke="white" stroke-opacity=".05" stroke-width=".5" />
    <circle cx="9.5" cy="33" r="1.3" fill="white" opacity=".17" />
    <rect x="13" y="31.5" width="12" height="1.5" rx=".75" fill="white" opacity=".13" />
    <rect x="6" y="38" width="36" height="6" rx="2" fill="white" opacity=".03" stroke="white" stroke-opacity=".04" stroke-width=".5" />
    <circle cx="9.5" cy="41" r="1.3" fill="white" opacity=".12" />
    <rect x="13" y="39.5" width="10" height="1.5" rx=".75" fill="white" opacity=".09" />
  </svg>
);

/* ── Bot / Codex — squircle is the codex surface ───────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#242038" bot="#120e20" />
    <Glass id="b" />
    {/* hero */}
    <rect x="6" y="7" width="36" height="11" rx="2.5" fill="white" opacity=".05" />
    <rect x="9" y="9" width="3" height="3" rx="1.5" fill="white" opacity=".28" />
    <rect x="14" y="9.5" width="16" height="2.5" rx="1.25" fill="white" opacity=".2" />
    <rect x="14" y="14.5" width="20" height="1.5" rx=".75" fill="white" opacity=".09" />
    {/* tasks */}
    <rect x="6" y="21" width="36" height="6" rx="2" fill="white" opacity=".04" />
    <text x="9" y="26" font-family="'SF Mono',monospace" font-size="5.5" fill="white" opacity=".22">#</text>
    <rect x="14" y="23.5" width="16" height="1.3" rx=".65" fill="white" opacity=".14" />
    <rect x="6" y="29" width="36" height="6" rx="2" fill="white" opacity=".03" />
    <text x="9" y="34" font-family="'SF Mono',monospace" font-size="5.5" fill="white" opacity=".18">{'</>'}</text>
    <rect x="14" y="31.5" width="14" height="1.3" rx=".65" fill="white" opacity=".11" />
    <rect x="6" y="37" width="36" height="6" rx="2" fill="white" opacity=".02" />
    <text x="9" y="42" font-family="'SF Mono',monospace" font-size="5.5" fill="white" opacity=".14">z</text>
    <rect x="14" y="39.5" width="12" height="1.3" rx=".65" fill="white" opacity=".09" />
  </svg>
);

/* ── Code / Codespaces — squircle is the codespaces surface ────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#202838" bot="#101420" />
    <Glass id="cd" />
    <rect x="7" y="8" width="34" height="8" rx="2" fill="white" opacity=".06" stroke="white" stroke-opacity=".07" stroke-width=".5" />
    <circle cx="10.5" cy="12" r="1.5" fill="white" opacity=".24" />
    <rect x="14" y="10" width="16" height="2" rx="1" fill="white" opacity=".18" />
    <rect x="14" y="14.5" width="9" height="1.5" rx=".75" fill="#2f855a" opacity=".45" />
    <rect x="7" y="18" width="34" height="8" rx="2" fill="white" opacity=".04" stroke="white" stroke-opacity=".05" stroke-width=".5" />
    <circle cx="10.5" cy="22" r="1.5" fill="white" opacity=".18" />
    <rect x="14" y="20" width="14" height="2" rx="1" fill="white" opacity=".13" />
    <rect x="14" y="24.5" width="11" height="1.5" rx=".75" fill="#b7791f" opacity=".35" />
    <rect x="7" y="28" width="34" height="8" rx="2" fill="white" opacity=".03" stroke="white" stroke-opacity=".04" stroke-width=".5" />
    <circle cx="10.5" cy="32" r="1.5" fill="white" opacity=".13" />
    <rect x="14" y="30" width="12" height="2" rx="1" fill="white" opacity=".1" />
  </svg>
);

/* ── Sticky — yellow note + red pin on a cool-tone bg ──────────────── */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#484050" bot="#2a2430" />
    <Glass id="ms" />
    <rect x="10" y="14" width="27" height="22" rx="3" fill="#f0d060" />
    <ellipse cx="24" cy="18" rx="3.5" ry="1.8" fill="#b89020" opacity=".3" />
    <line x1="24" y1="10" x2="24" y2="16" stroke="#c0c0c8" stroke-width="1" />
    <circle cx="24" cy="10" r="4" fill="#e04040" />
    <circle cx="23" cy="9" r="1.2" fill="white" opacity=".3" />
    <path d="M30 14l7 7h-4.5a2.5 2.5 0 0 1-2.5-2.5V14Z" fill="#d4b838" />
    <line x1="14" y1="19.5" x2="28" y2="19" stroke="#8b6810" opacity=".4" stroke-width="1" stroke-linecap="round" />
    <line x1="14" y1="23" x2="26" y2="23" stroke="#8b6810" opacity=".3" stroke-width="1" stroke-linecap="round" />
    <line x1="14" y1="26.5" x2="22" y2="26.5" stroke="#8b6810" opacity=".25" stroke-width="1" stroke-linecap="round" />
    <line x1="14" y1="30" x2="24" y2="30" stroke="#8b6810" opacity=".2" stroke-width="1" stroke-linecap="round" />
  </svg>
);

/* ── Region — marquee directly on the squircle ─────────────────────── */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" top="#30242c" bot="#1a1018" />
    <Glass id="r" />
    <rect x="11" y="13" width="26" height="22" rx="2.5" fill="none" stroke="white"
          stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 3.5" />
    <rect x="8" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="34" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="8" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
    <rect x="34" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" />
  </svg>
);

/* ── Text — document directly on the squircle ──────────────────────── */
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

/* ── LayoutDashboard — grid directly on the squircle ───────────────── */
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

/* ── Layers — stacked rects directly on the squircle ───────────────── */
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
