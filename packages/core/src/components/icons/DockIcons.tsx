import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Every icon shares the same structure:
     layer 0 — soft radial drop-shadow
     layer 1 — squircle with a refined vertical gradient
     layer 2 — bold white glyph, centred, ~55 % of the tile
   ====================================================================== */

function Defs(props: { id: string; top: string; bot: string }) {
  return (
    <defs>
      <radialGradient id={`${props.id}-sd`} cx="50%" cy="45%" r="55%">
        <stop offset="60%" stop-color="black" stop-opacity="0.18" />
        <stop offset="100%" stop-color="black" stop-opacity="0" />
      </radialGradient>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
    </defs>
  );
}

/* ------------------------------------------------------------------ */
/* Terminal  —  dark warm slate  →  bold  >_  prompt                 */
/* ------------------------------------------------------------------ */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#4c4c5e" bot="#22222e" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#t-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#t-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.92" stroke-width="3"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="13,13 23,24 13,35" />
      <line x1="27" y1="37" x2="38" y2="37" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Folder  —  Apple Finder blue  →  folder silhouette                */
/* ------------------------------------------------------------------ */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#5fa5f5" bot="#1e5ad0" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#f-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#f-bg)" />
    <path d="M10 14.5a3 3 0 0 1 3-3h4.2l3.3 2.5H35a3 3 0 0 1 3 3V31a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V14.5Z"
          fill="white" fill-opacity="0.9" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* CPU  —  refined teal  →  chip with pins + core                    */
/* ------------------------------------------------------------------ */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#30ccb8" bot="#0b7465" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#c-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#c-bg)" />
    {/* pins */}
    <g stroke="white" stroke-opacity="0.9" stroke-width="2.2" stroke-linecap="round">
      <line x1="19" y1="9"  x2="19" y2="13" /><line x1="24" y1="9"  x2="24" y2="13" />
      <line x1="29" y1="9"  x2="29" y2="13" />
      <line x1="19" y1="39" x2="19" y2="35" /><line x1="24" y1="39" x2="24" y2="35" />
      <line x1="29" y1="39" x2="29" y2="35" />
      <line x1="9"  y1="19" x2="13" y2="19" /><line x1="9"  y1="24" x2="13" y2="24" />
      <line x1="9"  y1="29" x2="13" y2="29" />
      <line x1="39" y1="19" x2="35" y2="19" /><line x1="39" y1="24" x2="35" y2="24" />
      <line x1="39" y1="29" x2="35" y2="29" />
    </g>
    {/* body */}
    <rect x="14" y="14" width="20" height="20" rx="3.5" fill="white" fill-opacity="0.22"
          stroke="white" stroke-opacity="0.7" stroke-width="2.2" />
    {/* core */}
    <rect x="19" y="19" width="10" height="10" rx="2" fill="white" fill-opacity="0.5" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Activity  —  warm refined amber  →  waveform + dot                */
/* ------------------------------------------------------------------ */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#f59758" bot="#b85020" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#a-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#a-bg)" />
    <polyline points="7,28 14,28 18,18 22,34 27,22 31,28 41,28"
              fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.8"
              stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* FileCode  —  periwinkle violet-blue  →  bracket pair              */
/* ------------------------------------------------------------------ */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#8694f5" bot="#4845cc" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#fc-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#fc-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,12 6,24 14,36" />
      <polyline points="34,12 42,24 34,36" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Search  —  refined emerald  →  magnifying glass                   */
/* ------------------------------------------------------------------ */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" top="#48cc9e" bot="#0b7d5a" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#s-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#s-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="3.2"
       stroke-linecap="round">
      <circle cx="19" cy="19" r="10" />
      <line x1="27" y1="27" x2="37" y2="37" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Globe  —  refined cyan  →  globe + arcs                           */
/* ------------------------------------------------------------------ */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#34cfdc" bot="#0e7385" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#g-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.2">
      <circle cx="24" cy="24" r="11" />
      <ellipse cx="24" cy="24" rx="11" ry="4.5" stroke-opacity="0.45" />
      <ellipse cx="24" cy="24" rx="4.5" ry="11" stroke-opacity="0.45" />
      <circle cx="20" cy="20" r="2" fill="white" fill-opacity="0.65" stroke="none" />
      <circle cx="28" cy="22" r="2" fill="white" fill-opacity="0.65" stroke="none" />
      <path d="M20 20 Q24 16 28 22" stroke-opacity="0.55" stroke-width="1.8"
            stroke-linecap="round" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Sparkles / AI  —  refined violet  →  diamond + corner dots        */
/* ------------------------------------------------------------------ */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#c494f5" bot="#703ab0" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#sp-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#sp-bg)" />
    <g transform="translate(12, 10)">
      {/* diamond */}
      <path d="M12 0L24 14L12 28L0 14Z" fill="white" fill-opacity="0.28"
            stroke="white" stroke-opacity="0.9" stroke-width="2" stroke-linejoin="round" />
      {/* inner highlights */}
      <path d="M12 5L17 14L12 23L7 14Z" fill="white" fill-opacity="0.18" />
      {/* corner sparkles */}
      <circle cx="0" cy="0" r="2.2" fill="white" fill-opacity="0.7" />
      <circle cx="24" cy="0" r="2.2" fill="white" fill-opacity="0.7" />
      <circle cx="0" cy="28" r="2.2" fill="white" fill-opacity="0.55" />
      <circle cx="24" cy="28" r="2.2" fill="white" fill-opacity="0.55" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Bot  —  deep refined purple  →  robot face                        */
/* ------------------------------------------------------------------ */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#a898f5" bot="#5e3ab8" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#b-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#b-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.3"
       stroke-linecap="round" stroke-linejoin="round">
      {/* head */}
      <rect x="12" y="14" width="24" height="18" rx="5.5" />
      {/* antenna */}
      <line x1="24" y1="14" x2="24" y2="8" />
      <circle cx="24" cy="7" r="2.2" fill="white" fill-opacity="0.45" stroke="none" />
      {/* eyes */}
      <circle cx="18" cy="22" r="3" fill="white" fill-opacity="0.35" stroke="none" />
      <circle cx="30" cy="22" r="3" fill="white" fill-opacity="0.35" stroke="none" />
      <circle cx="18" cy="22" r="1.2" fill="white" fill-opacity="0.9" stroke="none" />
      <circle cx="30" cy="22" r="1.2" fill="white" fill-opacity="0.9" stroke="none" />
      {/* smile */}
      <path d="M20 27 Q24 30 28 27" stroke-opacity="0.55" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Code / Codespaces  —  refined indigo  →  terminal window + `< >`  */
/* ------------------------------------------------------------------ */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#7078f0" bot="#3d3ab5" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#cd-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#cd-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.5"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="12,14 6,24 12,34" />
      <polyline points="36,14 42,24 36,34" />
      <line x1="22" y1="16" x2="26" y2="32" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* MessageSquare / Sticky  —  warm amber  →  note + fold + lines     */
/* ------------------------------------------------------------------ */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#f2cd40" bot="#c08e18" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#ms-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ms-bg)" />
    <g>
      {/* note body */}
      <rect x="10" y="11" width="28" height="26" rx="4" fill="white" fill-opacity="0.38" />
      {/* fold */}
      <path d="M29 11l9 9h-5.5a3.5 3.5 0 0 1-3.5-3.5V11Z" fill="#c08e18" fill-opacity="0.45" />
      {/* lines */}
      <rect x="16" y="17" width="14" height="2.2" rx="1.1" fill="white" fill-opacity="0.6" />
      <rect x="16" y="22" width="16" height="2.2" rx="1.1" fill="white" fill-opacity="0.5" />
      <rect x="16" y="27" width="10" height="2.2" rx="1.1" fill="white" fill-opacity="0.38" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Region  —  refined rose  →  dashed frame + corner handles         */
/* ------------------------------------------------------------------ */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" top="#f07aa8" bot="#b42858" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#r-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#r-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
      {/* dashed frame */}
      <rect x="10" y="13" width="28" height="22" rx="2.5" stroke-dasharray="4 3.5" stroke-opacity="0.75" />
      {/* corner handles */}
      <rect x="7" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
      <rect x="35" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
      <rect x="7" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
      <rect x="35" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Text  —  refined slate  →  document + heading + body lines        */
/* ------------------------------------------------------------------ */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" top="#6b8298" bot="#334352" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#tx-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#tx-bg)" />
    <g>
      {/* doc shape */}
      <rect x="10" y="10" width="28" height="28" rx="3.5" fill="white" fill-opacity="0.15"
            stroke="white" stroke-opacity="0.3" stroke-width="1.5" />
      {/* heading */}<rect x="15" y="16" width="12" height="3" rx="1.5" fill="white" fill-opacity="0.7" />
      {/* body */}
      <rect x="15" y="22" width="18" height="2" rx="1" fill="white" fill-opacity="0.45" />
      <rect x="15" y="26" width="14" height="2" rx="1" fill="white" fill-opacity="0.35" />
      <rect x="15" y="30" width="16" height="2" rx="1" fill="white" fill-opacity="0.25" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* LayoutDashboard  —  refined indigo  →  2×2 panel grid             */
/* ------------------------------------------------------------------ */
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ld" top="#808ef4" bot="#4648cc" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#ld-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ld-bg)" />
    <g fill="white">
      <rect x="10" y="12" width="12" height="11" rx="2.8" fill-opacity="0.42" />
      <rect x="25" y="12" width="12" height="11" rx="2.8" fill-opacity="0.18" />
      <rect x="10" y="26" width="12" height="11" rx="2.8" fill-opacity="0.18" />
      <rect x="25" y="26" width="12" height="11" rx="2.8" fill-opacity="0.25" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/* Layers  —  refined violet  →  three stacked rectangles            */
/* ------------------------------------------------------------------ */
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="l" top="#9c94f5" bot="#5e30c0" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#l-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#l-bg)" />
    <g fill="white" stroke="white" stroke-width="1.8" stroke-linejoin="round">
      <rect x="8"  y="28" width="26" height="11" rx="3.5" fill-opacity="0.12" stroke-opacity="0.3" />
      <rect x="10" y="21" width="26" height="11" rx="3.5" fill-opacity="0.24" stroke-opacity="0.45" />
      <rect x="12" y="14" width="26" height="11" rx="3.5" fill-opacity="0.42" stroke-opacity="0.75" />
    </g>
  </svg>
);
