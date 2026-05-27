import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Design principles (to avoid the "AI-generated" look):

   1. NO purple / indigo / violet — the #1 AI fingerprint.
      Use colours observed in real macOS app icons instead.
   2. ONE bold glyph per icon — stripped of decoration.
   3. Vertical gradient with a soft drop shadow — nothing more.
   4. Colours are designer-refined, not web-safe defaults.
   ====================================================================== */

// ── helpers ────────────────────────────────────────────────────────────

function Defs(props: { id: string; top: string; bot: string }) {
  return (
    <defs>
      {/* soft floating shadow — grounds the icon without harsh edges */}
      <radialGradient id={`${props.id}-sd`} cx="50%" cy="48%" r="54%">
        <stop offset="64%" stop-color="black" stop-opacity="0.16" />
        <stop offset="100%" stop-color="black" stop-opacity="0" />
      </radialGradient>
      {/* vertical gradient — top slightly lighter, bottom slightly darker */}
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
    </defs>
  );
}

// ── icons ──────────────────────────────────────────────────────────────

/* Terminal — warm dark charcoal (like macOS Terminal.app) ................*/
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="t" top="#4a4a58" bot="#23232e" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#t-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#t-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.92" stroke-width="3"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="13,13 23,24 13,35" />
      <line x1="27" y1="37" x2="38" y2="37" />
    </g>
  </svg>
);

/* Folder — refined blue (macOS Finder) ..................................*/
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="f" top="#5da2f0" bot="#1c58cc" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#f-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#f-bg)" />
    <path d="M10 14.5a3 3 0 0 1 3-3h4.2l3.3 2.5H35a3 3 0 0 1 3 3V31a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V14.5Z"
          fill="white" fill-opacity="0.9" />
  </svg>
);

/* CPU — deep teal (Activity Monitor) ....................................*/
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="c" top="#26bca4" bot="#0b7060" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#c-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#c-bg)" />
    <g stroke="white" stroke-opacity="0.9" stroke-width="2.2" stroke-linecap="round">
      {/* pins */}
      <line x1="19" y1="9"  x2="19" y2="13" /><line x1="24" y1="9"  x2="24" y2="13" /><line x1="29" y1="9"  x2="29" y2="13" />
      <line x1="19" y1="39" x2="19" y2="35" /><line x1="24" y1="39" x2="24" y2="35" /><line x1="29" y1="39" x2="29" y2="35" />
      <line x1="9"  y1="19" x2="13" y2="19" /><line x1="9"  y1="24" x2="13" y2="24" /><line x1="9"  y1="29" x2="13" y2="29" />
      <line x1="39" y1="19" x2="35" y2="19" /><line x1="39" y1="24" x2="35" y2="24" /><line x1="39" y1="29" x2="35" y2="29" />
    </g>
    <rect x="14" y="14" width="20" height="20" rx="3.5" fill="white" fill-opacity="0.22"
          stroke="white" stroke-opacity="0.7" stroke-width="2.2" />
    <rect x="19" y="19" width="10" height="10" rx="2" fill="white" fill-opacity="0.5" />
  </svg>
);

/* Activity — warm amber (monitoring dashboard) ...........................*/
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="a" top="#f08c44" bot="#b84818" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#a-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#a-bg)" />
    <polyline points="7,28 14,28 18,17 22,34 27,21 31,28 41,28"
              fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.8"
              stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

/* FileCode — periwinkle blue (NOT purple — AI fingerprint avoided) .....*/
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="fc" top="#6a90e8" bot="#2e54c0" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#fc-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#fc-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.8"
       stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14,12 6,24 14,36" />
      <polyline points="34,12 42,24 34,36" />
    </g>
  </svg>
);

/* Search — emerald green (Preview / Spotlight style) ....................*/
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="s" top="#40c898" bot="#0b7854" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#s-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#s-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="3.2" stroke-linecap="round">
      <circle cx="19" cy="19" r="10" />
      <line x1="27" y1="27" x2="37" y2="37" />
    </g>
  </svg>
);

/* Globe — teal-cyan (Safari / network style) ............................*/
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="g" top="#30c6d6" bot="#0c7484" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#g-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#g-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.2">
      <circle cx="24" cy="24" r="11" />
      <ellipse cx="24" cy="24" rx="11" ry="4.5" stroke-opacity="0.45" />
      <ellipse cx="24" cy="24" rx="4.5" ry="11" stroke-opacity="0.45" />
      <circle cx="20" cy="20" r="2" fill="white" fill-opacity="0.65" stroke="none" />
      <circle cx="28" cy="22" r="2" fill="white" fill-opacity="0.65" stroke="none" />
      <path d="M20 20 Q24 16 28 22" stroke-opacity="0.55" stroke-width="1.8" stroke-linecap="round" />
    </g>
  </svg>
);

/* Sparkles — warm gold (NOT purple — another critical AI-fingerprint fix) */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="sp" top="#e8ac34" bot="#b87812" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#sp-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#sp-bg)" />
    <g transform="translate(11, 9)" fill="none">
      {/* four-pointed star */}
      <path d="M13 0l4 12 12 4-12 4-4 12-4-12-12-4 12-4z"
            fill="white" fill-opacity="0.38" stroke="white" stroke-opacity="0.9"
            stroke-width="2" stroke-linejoin="round" />
    </g>
  </svg>
);

/* Bot — steel blue (professional, not AI-purple) ........................*/
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="b" top="#6c90b4" bot="#385e80" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#b-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#b-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.3"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="14" width="24" height="18" rx="5.5" />
      <line x1="24" y1="14" x2="24" y2="8" />
      <circle cx="24" cy="7" r="2.2" fill="white" fill-opacity="0.45" stroke="none" />
      <circle cx="18" cy="22" r="3" fill="white" fill-opacity="0.35" stroke="none" />
      <circle cx="30" cy="22" r="3" fill="white" fill-opacity="0.35" stroke="none" />
      <circle cx="18" cy="22" r="1.2" fill="white" fill-opacity="0.9" stroke="none" />
      <circle cx="30" cy="22" r="1.2" fill="white" fill-opacity="0.9" stroke="none" />
      <path d="M20 27 Q24 30 28 27" stroke-opacity="0.55" />
    </g>
  </svg>
);

/* Code — slate blue (developer tool — no indigo) ........................*/
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="cd" top="#5c80c8" bot="#345098" />
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

/* MessageSquare / Sticky — warm yellow (Apple Notes) .....................*/
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ms" top="#eec838" bot="#b88814" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#ms-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#ms-bg)" />
    <rect x="10" y="11" width="28" height="26" rx="4" fill="white" fill-opacity="0.38" />
    <path d="M29 11l9 9h-5.5a3.5 3.5 0 0 1-3.5-3.5V11Z" fill="#b88814" fill-opacity="0.45" />
    <rect x="16" y="17" width="14" height="2.2" rx="1.1" fill="white" fill-opacity="0.6" />
    <rect x="16" y="22" width="16" height="2.2" rx="1.1" fill="white" fill-opacity="0.5" />
    <rect x="16" y="27" width="10" height="2.2" rx="1.1" fill="white" fill-opacity="0.38" />
  </svg>
);

/* Region — coral rose (selection / marquee tool) ........................*/
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="r" top="#ee608c" bot="#b42a50" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#r-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#r-bg)" />
    <g fill="none" stroke="white" stroke-opacity="0.9" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
      <rect x="10" y="13" width="28" height="22" rx="2.5" stroke-dasharray="4 3.5" stroke-opacity="0.75" />
      <rect x="7" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
      <rect x="35" y="10" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
      <rect x="7" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
      <rect x="35" y="32" width="6" height="6" rx="1.5" fill="white" fill-opacity="0.85" stroke="none" />
    </g>
  </svg>
);

/* Text — slate gray (TextEdit style) ....................................*/
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="tx" top="#688098" bot="#344858" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#tx-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#tx-bg)" />
    <rect x="10" y="10" width="28" height="28" rx="3.5" fill="white" fill-opacity="0.15"
          stroke="white" stroke-opacity="0.3" stroke-width="1.5" />
    <rect x="15" y="16" width="12" height="3" rx="1.5" fill="white" fill-opacity="0.7" />
    <rect x="15" y="22" width="18" height="2" rx="1" fill="white" fill-opacity="0.45" />
    <rect x="15" y="26" width="14" height="2" rx="1" fill="white" fill-opacity="0.35" />
    <rect x="15" y="30" width="16" height="2" rx="1" fill="white" fill-opacity="0.25" />
  </svg>
);

/* LayoutDashboard — muted blue (widget panel) ............................*/
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="ld" top="#6a8ee8" bot="#3858bc" />
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

/* Layers — muted teal (NOT purple — another AI fingerprint eliminated) ..*/
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <Defs id="l" top="#54a4b4" bot="#287080" />
    <rect x="2" y="2.5" width="44" height="44" rx="11" fill="url(#l-sd)" />
    <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#l-bg)" />
    <g fill="white" stroke="white" stroke-width="1.8" stroke-linejoin="round">
      <rect x="8"  y="28" width="26" height="11" rx="3.5" fill-opacity="0.12" stroke-opacity="0.3" />
      <rect x="10" y="21" width="26" height="11" rx="3.5" fill-opacity="0.24" stroke-opacity="0.45" />
      <rect x="12" y="14" width="26" height="11" rx="3.5" fill-opacity="0.42" stroke-opacity="0.75" />
    </g>
  </svg>
);
