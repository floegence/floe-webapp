import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Liquid Glass icons — WWDC 2025 / macOS Tahoe design language.

   • The squircle IS the icon — no inner frames, bezels, or containers.
   • Flat, frontal, bold shapes integrated into tinted glass.
   • Top rim highlight catches light on the glass edge.
   • One glyph per icon — clean, iconic, immediate.
   ====================================================================== */

function Defs(props: { id: string; top: string; bot: string }) {
  return (
    <defs>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
      <linearGradient id={`${props.id}-rim`} x1="0" y1="0" x2="0" y2=".4">
        <stop offset="0%" stop-color="white" stop-opacity=".22" />
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

/* ── Terminal ──────────────────────────────────────────────────────── */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#3d3d4d" bot="#1a1a24" />
    <Glass id="t" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="13,13 23,24 13,35" />
      <line x1="27" y1="37" x2="36" y2="37" />
    </g>
  </svg>
);

/* ── Folder — amber/yellow, matches file browser `--warning` ───────── */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#f0c040" bot="#c88018" />
    <Glass id="f" />
    <path d="M10 14.5a3 3 0 0 1 3-3h4l3.5 2.5H35a3 3 0 0 1 3 3V31a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V14.5Z"
          fill="white" fill-opacity=".88" />
  </svg>
);

/* ── CPU ───────────────────────────────────────────────────────────── */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#22b89c" bot="#0a6858" />
    <Glass id="c" />
    <g stroke="white" stroke-opacity=".88" stroke-width="2.2" stroke-linecap="round">
      <line x1="19" y1="9"  x2="19" y2="13" /><line x1="24" y1="9"  x2="24" y2="13" /><line x1="29" y1="9"  x2="29" y2="13" />
      <line x1="19" y1="39" x2="19" y2="35" /><line x1="24" y1="39" x2="24" y2="35" /><line x1="29" y1="39" x2="29" y2="35" />
      <line x1="9"  y1="19" x2="13" y2="19" /><line x1="9"  y1="24" x2="13" y2="24" /><line x1="9"  y1="29" x2="13" y2="29" />
      <line x1="39" y1="19" x2="35" y2="19" /><line x1="39" y1="24" x2="35" y2="24" /><line x1="39" y1="29" x2="35" y2="29" />
    </g>
    <rect x="14" y="14" width="20" height="20" rx="3.5" fill="white" fill-opacity=".18"
          stroke="white" stroke-opacity=".65" stroke-width="2.2" />
    <rect x="19" y="19" width="10" height="10" rx="2" fill="white" fill-opacity=".45" />
  </svg>
);

/* ── Activity ──────────────────────────────────────────────────────── */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#f08840" bot="#b44010" />
    <Glass id="a" />
    <polyline points="7,26 14,26 18,16 22,33 27,20 31,26 41,26"
              fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

/* ── FileCode ──────────────────────────────────────────────────────── */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#5e84e0" bot="#2848b0" />
    <Glass id="fc" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,12 6,24 14,36" />
      <polyline points="34,12 42,24 34,36" />
    </g>
  </svg>
);

/* ── Search ────────────────────────────────────────────────────────── */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" top="#3cc494" bot="#0a6c48" />
    <Glass id="s" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="3" stroke-linecap="round">
      <circle cx="19" cy="19" r="10" />
      <line x1="27" y1="27" x2="37" y2="37" />
    </g>
  </svg>
);

/* ── Globe ─────────────────────────────────────────────────────────── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#2cbed2" bot="#0a6478" />
    <Glass id="g" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2">
      <circle cx="24" cy="24" r="11" />
      <ellipse cx="24" cy="24" rx="11" ry="4.5" stroke-opacity=".4" />
      <ellipse cx="24" cy="24" rx="4.5" ry="11" stroke-opacity=".4" />
      <circle cx="20" cy="20" r="1.8" fill="white" fill-opacity=".6" stroke="none" />
      <circle cx="28" cy="22" r="1.8" fill="white" fill-opacity=".6" stroke="none" />
    </g>
  </svg>
);

/* ── Sparkles ──────────────────────────────────────────────────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#e4a428" bot="#b07010" />
    <Glass id="sp" />
    <path d="M24 9l4 11 12 4-12 4-4 11-4-11-12-4 12-4z"
          fill="white" fill-opacity=".25" stroke="white" stroke-opacity=".88"
          stroke-width="2" stroke-linejoin="round" />
  </svg>
);

/* ── Bot ───────────────────────────────────────────────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#6490b8" bot="#305478" />
    <Glass id="b" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="14" width="24" height="18" rx="5.5" />
      <line x1="24" y1="14" x2="24" y2="8" />
      <circle cx="24" cy="7" r="2" fill="white" fill-opacity=".4" stroke="none" />
      <circle cx="18" cy="22" r="2.5" fill="white" fill-opacity=".3" stroke="none" />
      <circle cx="30" cy="22" r="2.5" fill="white" fill-opacity=".3" stroke="none" />
      <circle cx="18" cy="22" r="1" fill="white" fill-opacity=".85" stroke="none" />
      <circle cx="30" cy="22" r="1" fill="white" fill-opacity=".85" stroke="none" />
      <path d="M20 27 Q24 30 28 27" stroke-opacity=".5" />
    </g>
  </svg>
);

/* ── Code ──────────────────────────────────────────────────────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#5880c0" bot="#304888" />
    <Glass id="cd" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.5"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,13 7,24 14,35" />
      <polyline points="34,13 41,24 34,35" />
    </g>
  </svg>
);

/* ── Sticky — red pushpin piercing a yellow note ───────────────────── */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#ecc434" bot="#b07810" />
    <Glass id="ms" />
    {/* note body — slight perspective tilt */}
    <rect x="9" y="13" width="30" height="24" rx="3"
          fill="white" fill-opacity=".32" />
    {/* pin shadow on paper */}
    <ellipse cx="24" cy="18" rx="4" ry="2" fill="black" fill-opacity=".08" />
    {/* pin needle */}
    <line x1="24" y1="10" x2="24" y2="16" stroke="white" stroke-opacity=".5" stroke-width="1.2" />
    {/* pin head */}
    <circle cx="24" cy="10" r="4.5" fill="#e04040" />
    <circle cx="24" cy="10" r="4.5" fill="url(#ms-pin)" />
    <circle cx="23" cy="9" r="1.2" fill="white" fill-opacity=".35" />
    <defs>
      <radialGradient id="ms-pin" cx="38%" cy="32%" r="55%">
        <stop offset="0%" stop-color="#ff7070" />
        <stop offset="100%" stop-color="#c02020" />
      </radialGradient>
    </defs>
    {/* fold corner */}
    <path d="M31 13l8 8h-5a3 3 0 0 1-3-3V13Z" fill="white" fill-opacity=".18" />
    {/* text lines */}
    <rect x="14" y="19" width="16" height="1.8" rx=".9" fill="white" fill-opacity=".5" />
    <rect x="14" y="23" width="18" height="1.8" rx=".9" fill="white" fill-opacity=".4" />
    <rect x="14" y="27" width="10" height="1.8" rx=".9" fill="white" fill-opacity=".28" />
    <rect x="14" y="31" width="14" height="1.8" rx=".9" fill="white" fill-opacity=".18" />
  </svg>
);

/* ── Region ────────────────────────────────────────────────────────── */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" top="#ec5880" bot="#ac1c44" />
    <Glass id="r" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="10" y="13" width="28" height="22" rx="2.5" stroke-dasharray="4 4" stroke-opacity=".7" />
      <rect x="7" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" stroke="none" />
      <rect x="35" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" stroke="none" />
      <rect x="7" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" stroke="none" />
      <rect x="35" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity=".8" stroke="none" />
    </g>
  </svg>
);

/* ── Text ──────────────────────────────────────────────────────────── */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" top="#647c94" bot="#2c4050" />
    <Glass id="tx" />
    <rect x="12" y="14" width="14" height="2.8" rx="1.4" fill="white" fill-opacity=".65" />
    <rect x="12" y="20" width="24" height="1.8" rx=".9" fill="white" fill-opacity=".42" />
    <rect x="12" y="25" width="20" height="1.8" rx=".9" fill="white" fill-opacity=".35" />
    <rect x="12" y="30" width="22" height="1.8" rx=".9" fill="white" fill-opacity=".28" />
    <rect x="12" y="35" width="15" height="1.8" rx=".9" fill="white" fill-opacity=".2" />
  </svg>
);

/* ── LayoutDashboard ───────────────────────────────────────────────── */
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ld" top="#6888e0" bot="#344cb0" />
    <Glass id="ld" />
    <g fill="white">
      <rect x="10" y="12" width="12" height="11" rx="2.8" fill-opacity=".38" />
      <rect x="25" y="12" width="12" height="11" rx="2.8" fill-opacity=".15" />
      <rect x="10" y="26" width="12" height="11" rx="2.8" fill-opacity=".15" />
      <rect x="25" y="26" width="12" height="11" rx="2.8" fill-opacity=".22" />
    </g>
  </svg>
);

/* ── Layers ────────────────────────────────────────────────────────── */
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="l" top="#50a0b0" bot="#206470" />
    <Glass id="l" />
    <g fill="white" stroke="white" stroke-width="1.6" stroke-linejoin="round">
      <rect x="8"  y="28" width="26" height="11" rx="3.5" fill-opacity=".1"  stroke-opacity=".25" />
      <rect x="10" y="21" width="26" height="11" rx="3.5" fill-opacity=".2"  stroke-opacity=".4"  />
      <rect x="12" y="14" width="26" height="11" rx="3.5" fill-opacity=".35" stroke-opacity=".65" />
    </g>
  </svg>
);
