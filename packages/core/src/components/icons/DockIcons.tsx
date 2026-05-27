import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Liquid Glass icon design (WWDC 2025, macOS Tahoe):

   1. The squircle IS the icon — no inner frames, bezels, or containers.
   2. Flat, frontal, iconic shapes — the system material adds depth.
   3. Soft vertical gradient on the base.
   4. Subtle edge highlight (top rim) — light catching the glass edge.
   5. Bold white glyph integrated into the glass.
   6. No baked-in heavy shadows, bevels, or metallic textures.
   ====================================================================== */

function Defs(props: { id: string; top: string; bot: string }) {
  return (
    <defs>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
      {/* subtle edge highlight — light catching the glass rim */}
      <linearGradient id={`${props.id}-rim`} x1="0" y1="0" x2="0" y2=".35">
        <stop offset="0%" stop-color="white" stop-opacity=".25" />
        <stop offset="100%" stop-color="white" stop-opacity="0" />
      </linearGradient>
    </defs>
  );
}

function GlassBase(props: { id: string }) {
  return (
    <>
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${props.id}-bg)`} />
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${props.id}-rim)`} />
    </>
  );
}

/* ── Terminal — dark glass, white prompt glowing from within ──────── */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#3d3d4d" bot="#1a1a24" />
    <GlassBase id="t" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="13,13 23,24 13,35" />
      <line x1="27" y1="37" x2="36" y2="37" />
    </g>
  </svg>
);

/* ── Folder — refined blue glass, clean folder silhouette ─────────── */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#5a9cf0" bot="#1a4ec8" />
    <GlassBase id="f" />
    <path d="M10 14.5a3 3 0 0 1 3-3h4l3.5 2.5H35a3 3 0 0 1 3 3V31a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V14.5Z"
          fill="white" fill-opacity=".88" />
  </svg>
);

/* ── CPU — teal glass, clean chip shape ───────────────────────────── */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#22b89c" bot="#0a6858" />
    <GlassBase id="c" />
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

/* ── Activity — warm amber glass, glowing waveform ────────────────── */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#f08840" bot="#b44010" />
    <GlassBase id="a" />
    <polyline points="7,26 14,26 18,16 22,33 27,20 31,26 41,26"
              fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

/* ── FileCode — blue glass, bracket pair ──────────────────────────── */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#5e84e0" bot="#2848b0" />
    <GlassBase id="fc" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,12 6,24 14,36" />
      <polyline points="34,12 42,24 34,36" />
    </g>
  </svg>
);

/* ── Search — emerald glass, magnifying glass ─────────────────────── */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" top="#3cc494" bot="#0a6c48" />
    <GlassBase id="s" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="3" stroke-linecap="round">
      <circle cx="19" cy="19" r="10" />
      <line x1="27" y1="27" x2="37" y2="37" />
    </g>
  </svg>
);

/* ── Globe — cyan glass, globe with latitude ──────────────────────── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#2cbed2" bot="#0a6478" />
    <GlassBase id="g" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2">
      <circle cx="24" cy="24" r="11" />
      <ellipse cx="24" cy="24" rx="11" ry="4.5" stroke-opacity=".4" />
      <ellipse cx="24" cy="24" rx="4.5" ry="11" stroke-opacity=".4" />
      <circle cx="20" cy="20" r="1.8" fill="white" fill-opacity=".6" stroke="none" />
      <circle cx="28" cy="22" r="1.8" fill="white" fill-opacity=".6" stroke="none" />
    </g>
  </svg>
);

/* ── Sparkles — warm gold glass, star ─────────────────────────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#e4a428" bot="#b07010" />
    <GlassBase id="sp" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.2"
       stroke-linejoin="round">
      <path d="M24 9l4 11 12 4-12 4-4 11-4-11-12-4 12-4z"
            fill="white" fill-opacity=".25" />
    </g>
  </svg>
);

/* ── Bot — steel blue glass, robot face ───────────────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#6490b8" bot="#305478" />
    <GlassBase id="b" />
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

/* ── Code — slate blue glass, angle brackets ──────────────────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#5880c0" bot="#304888" />
    <GlassBase id="cd" />
    <g fill="none" stroke="white" stroke-opacity=".88" stroke-width="2.5"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,13 7,24 14,35" />
      <polyline points="34,13 41,24 34,35" />
    </g>
  </svg>
);

/* ── Sticky — yellow glass, note + lines ──────────────────────────── */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#ecc434" bot="#b07810" />
    <GlassBase id="ms" />
    {/* note */}
    <rect x="10" y="11" width="28" height="26" rx="3.5" fill="white" fill-opacity=".28" />
    {/* fold */}
    <path d="M29 11l9 9h-5.5a3.5 3.5 0 0 1-3.5-3.5V11Z" fill="white" fill-opacity=".2" />
    {/* lines */}
    <rect x="16" y="17" width="14" height="2" rx="1" fill="white" fill-opacity=".55" />
    <rect x="16" y="22" width="16" height="2" rx="1" fill="white" fill-opacity=".45" />
    <rect x="16" y="27" width="10" height="2" rx="1" fill="white" fill-opacity=".32" />
  </svg>
);

/* ── Region — coral glass, dashed frame + handles ─────────────────── */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" top="#ec5880" bot="#ac1c44" />
    <GlassBase id="r" />
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

/* ── Text — slate glass, document + text lines ────────────────────── */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" top="#647c94" bot="#2c4050" />
    <GlassBase id="tx" />
    {/* heading */}
    <rect x="12" y="14" width="14" height="2.8" rx="1.4" fill="white" fill-opacity=".65" />
    {/* body lines */}
    <rect x="12" y="20" width="24" height="1.8" rx=".9" fill="white" fill-opacity=".42" />
    <rect x="12" y="25" width="20" height="1.8" rx=".9" fill="white" fill-opacity=".35" />
    <rect x="12" y="30" width="22" height="1.8" rx=".9" fill="white" fill-opacity=".28" />
    <rect x="12" y="35" width="15" height="1.8" rx=".9" fill="white" fill-opacity=".2" />
  </svg>
);

/* ── LayoutDashboard — blue glass, 2×2 grid ───────────────────────── */
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ld" top="#6888e0" bot="#344cb0" />
    <GlassBase id="ld" />
    <g fill="white">
      <rect x="10" y="12" width="12" height="11" rx="2.8" fill-opacity=".38" />
      <rect x="25" y="12" width="12" height="11" rx="2.8" fill-opacity=".15" />
      <rect x="10" y="26" width="12" height="11" rx="2.8" fill-opacity=".15" />
      <rect x="25" y="26" width="12" height="11" rx="2.8" fill-opacity=".22" />
    </g>
  </svg>
);

/* ── Layers — teal glass, three stacked rounded rects ─────────────── */
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="l" top="#50a0b0" bot="#206470" />
    <GlassBase id="l" />
    <g fill="white" stroke="white" stroke-width="1.6" stroke-linejoin="round">
      <rect x="8"  y="28" width="26" height="11" rx="3.5" fill-opacity=".1"  stroke-opacity=".25" />
      <rect x="10" y="21" width="26" height="11" rx="3.5" fill-opacity=".2"  stroke-opacity=".4"  />
      <rect x="12" y="14" width="26" height="11" rx="3.5" fill-opacity=".35" stroke-opacity=".65" />
    </g>
  </svg>
);
