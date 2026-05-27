import type { JSX } from 'solid-js';

export interface DockIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number;
}

/* ======================================================================
   Skeuomorphic design principles (macOS Big Sur style):

   1. Depict REAL objects — not abstract symbols.
   2. Shape → colour → styling (layered gradients + inner shadows).
   3. Consistent top-down lighting with soft bounce light.
   4. Rich material rendering — glass, metal, paper, plastic.
   5. Every icon is a miniature photograph of a real thing.
   ====================================================================== */

/* ── shared primitives ───────────────────────────────────────────────── */

/** Soft floating drop shadow — every icon "sits" on the surface. */
function TileDropShadow(props: { id: string }) {
  return (
    <filter id={`${props.id}-shadow`} x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="3.5" flood-color="#000" flood-opacity="0.22" />
    </filter>
  );
}

/** Squircle base with a vertical gradient — the "ground" of every icon. */
function Squircle(props: { id: string; top: string; bot: string }) {
  return (
    <>
      <linearGradient id={`${props.id}-bg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={props.top} />
        <stop offset="100%" stop-color={props.bot} />
      </linearGradient>
      <rect x="1.5" y="1.5" width="45" height="45" rx="11.5"
            fill={`url(#${props.id}-bg)`} filter={`url(#${props.id}-shadow)`} />
    </>
  );
}

/* ── Terminal — a real display with bezel, screen, prompt ──────────── */
export const DockTerminal = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="t" />
    <Squircle id="t" top="#3d3d4d" bot="#1f1f2a" />
    {/* aluminium bezel */}
    <rect x="5" y="7" width="38" height="32" rx="3" fill="#2a2a35" stroke="#1a1a22" stroke-width="1.5" />
    {/* screen */}
    <rect x="7" y="10" width="34" height="26" rx="1.5" fill="#0d0d14" />
    {/* screen glare */}
    <linearGradient id="t-glare" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity=".06" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <rect x="7" y="10" width="34" height="13" rx="1.5" fill="url(#t-glare)" />
    {/* prompt */}
    <text x="12" y="26" font-family="'JetBrains Mono','SF Mono',monospace"
          font-size="8" font-weight="700" fill="#4af626">$</text>
    <rect x="17" y="20" width="12" height="5" rx="1.5" fill="#4af626" opacity=".6" />
    {/* output lines */}
    <rect x="12" y="31" width="20" height="1" rx=".5" fill="white" opacity=".15" />
    <rect x="12" y="33" width="14" height="1" rx=".5" fill="white" opacity=".1" />
  </svg>
);

/* ── Folder — a real manila folder with tab, crease, document inside ─ */
export const DockFolder = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="f" />
    <Squircle id="f" top="#5da2f0" bot="#1c54cc" />
    {/* folder back */}
    <path d="M9 14a3 3 0 0 1 3-3h5l3.5 2.5H36a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V14Z"
          fill="white" fill-opacity=".2" />
    {/* document inside */}
    <rect x="16" y="20" width="16" height="13" rx="1.5" fill="white" fill-opacity=".65" />
    <rect x="19" y="23" width="8" height="1.2" rx=".6" fill="#1c54cc" opacity=".4" />
    <rect x="19" y="26" width="10" height="1.2" rx=".6" fill="#1c54cc" opacity=".3" />
    <rect x="19" y="29" width="6" height="1.2" rx=".6" fill="#1c54cc" opacity=".2" />
    {/* folder front flap */}
    <path d="M9 14v13a3 3 0 0 0 3 3h24a3 3 0 0 0 3-3V17H19.5l-3-2.5H12a3 3 0 0 0-3-.5Z"
          fill="white" fill-opacity=".45" />
    {/* tab highlight */}
    <path d="M12 14.5h5l3 2.5H36" fill="white" fill-opacity=".12" />
  </svg>
);

/* ── CPU — a real processor chip on green PCB ──────────────────────── */
export const DockCpu = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="c" />
    <Squircle id="c" top="#26b8a0" bot="#0b6c5c" />
    {/* PCB substrate */}
    <rect x="9" y="10" width="30" height="28" rx="2" fill="#0d5c40" />
    {/* PCB texture — fine grid */}
    <pattern id="c-pcb" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="none" />
      <rect x="5" y="0" width="1" height="6" fill="white" opacity=".03" />
      <rect x="0" y="5" width="6" height="1" fill="white" opacity=".03" />
    </pattern>
    <rect x="9" y="10" width="30" height="28" rx="2" fill="url(#c-pcb)" />
    {/* gold pins — top */}
    <g fill="#c8a84c">
      <rect x="16" y="6" width="2" height="4" rx=".5" />
      <rect x="21" y="6" width="2" height="4" rx=".5" />
      <rect x="26" y="6" width="2" height="4" rx=".5" />
      <rect x="31" y="6" width="2" height="4" rx=".5" />
      {/* — bottom */}
      <rect x="16" y="38" width="2" height="4" rx=".5" />
      <rect x="21" y="38" width="2" height="4" rx=".5" />
      <rect x="26" y="38" width="2" height="4" rx=".5" />
      <rect x="31" y="38" width="2" height="4" rx=".5" />
      {/* — left */}
      <rect x="5" y="16" width="4" height="2" rx=".5" />
      <rect x="5" y="21" width="4" height="2" rx=".5" />
      <rect x="5" y="26" width="4" height="2" rx=".5" />
      <rect x="5" y="31" width="4" height="2" rx=".5" />
      {/* — right */}
      <rect x="39" y="16" width="4" height="2" rx=".5" />
      <rect x="39" y="21" width="4" height="2" rx=".5" />
      <rect x="39" y="26" width="4" height="2" rx=".5" />
      <rect x="39" y="31" width="4" height="2" rx=".5" />
    </g>
    {/* silver heat spreader */}
    <rect x="12" y="13" width="24" height="22" rx="2.5"
          fill="url(#c-hs)" stroke="#555" stroke-width=".8" />
    <linearGradient id="c-hs" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8e8ec" />
      <stop offset="30%" stop-color="#c8c8d0" />
      <stop offset="100%" stop-color="#9898a0" />
    </linearGradient>
    {/* heat spreader engraving */}
    <rect x="18" y="18" width="12" height="12" rx="1.5" fill="none" stroke="white" stroke-opacity=".4" stroke-width=".8" />
    <circle cx="24" cy="24" r="3" fill="white" fill-opacity=".2" />
  </svg>
);

/* ── Activity — a real monitoring display with waveform ────────────── */
export const DockActivity = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="a" />
    <Squircle id="a" top="#f08c44" bot="#b44414" />
    {/* display bezel */}
    <rect x="5" y="7" width="38" height="32" rx="3" fill="#1a1010" />
    {/* screen */}
    <rect x="7" y="10" width="34" height="26" rx="1.5" fill="#0a0606" />
    {/* grid */}
    <line x1="9" y1="16" x2="39" y2="16" stroke="white" opacity=".06" stroke-width=".6" stroke-dasharray="2 4" />
    <line x1="9" y1="21" x2="39" y2="21" stroke="white" opacity=".06" stroke-width=".6" stroke-dasharray="2 4" />
    <line x1="9" y1="26" x2="39" y2="26" stroke="white" opacity=".08" stroke-width=".6" stroke-dasharray="2 4" />
    <line x1="9" y1="31" x2="39" y2="31" stroke="white" opacity=".06" stroke-width=".6" stroke-dasharray="2 4" />
    {/* glowing waveform */}
    <polyline points="9,28 15,28 19,18 23,33 27,21 31,28 39,28"
              fill="none" stroke="#4af626" stroke-opacity=".9" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" />
    {/* screen glare */}
    <linearGradient id="a-glare" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity=".05" />
      <stop offset="100%" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <rect x="7" y="10" width="34" height="13" rx="1.5" fill="url(#a-glare)" />
  </svg>
);

/* ── FileCode — a real code editor window ──────────────────────────── */
export const DockFileCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="fc" />
    <Squircle id="fc" top="#5c80d0" bot="#2a48a0" />
    {/* editor window */}
    <rect x="5" y="7" width="38" height="32" rx="3" fill="#1a1a28" />
    {/* title bar */}
    <rect x="5" y="7" width="38" height="7" rx="3" fill="#12121c" />
    <rect x="7" y="7" width="34" height="7" rx="3" fill="#12121c" />
    {/* traffic lights */}
    <circle cx="11" cy="10.5" r="2" fill="#ff5f57" />
    <circle cx="17" cy="10.5" r="2" fill="#febc2e" />
    <circle cx="23" cy="10.5" r="2" fill="#28c840" />
    {/* line numbers gutter */}
    <rect x="7" y="15" width="8" height="23" fill="#0d0d16" />
    {/* line numbers */}
    <text x="9" y="21" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".25">1</text>
    <text x="9" y="26" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".25">2</text>
    <text x="9" y="31" font-family="'SF Mono',monospace" font-size="4.5" fill="white" opacity=".25">3</text>
    {/* editor bg */}
    <rect x="15" y="15" width="27" height="23" fill="#141420" />
    {/* syntax-coloured code lines */}
    <rect x="17" y="18" width="16" height="1.5" rx=".75" fill="#c678dd" opacity=".7" />
    <rect x="19" y="22" width="10" height="1.5" rx=".75" fill="#61afef" opacity=".7" />
    <rect x="19" y="22" width="10" height="1.5" rx=".75" fill="#61afef" opacity=".7" />
    <rect x="19" y="26" width="14" height="1.5" rx=".75" fill="#98c379" opacity=".5" />
    <rect x="17" y="30" width="12" height="1.5" rx=".75" fill="#e5c07b" opacity=".5" />
    <rect x="17" y="34" width="8" height="1.5" rx=".75" fill="#abb2bf" opacity=".3" />
  </svg>
);

/* ── Search — a real magnifying glass with lens, rim, handle ───────── */
export const DockSearch = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="s" />
    <Squircle id="s" top="#44c498" bot="#0a704c" />
    {/* handle */}
    <g transform="rotate(42 16 16)">
      <rect x="30" y="28" width="5" height="16" rx="2.5" fill="#8b6914" />
      {/* metallic ferrule */}
      <rect x="29" y="28" width="7" height="4" rx="1.5" fill="#c8c8d0" />
      <rect x="29" y="32" width="7" height="2" rx="1" fill="#a0a0a8" />
    </g>
    {/* metal rim */}
    <circle cx="18" cy="18" r="12" fill="none" stroke="#c8c8d0" stroke-width="3" />
    {/* glass lens */}
    <circle cx="18" cy="18" r="10.5" fill="white" fill-opacity=".12" />
    {/* lens reflection */}
    <linearGradient id="s-lens" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity=".35" />
      <stop offset="40%" stop-color="white" stop-opacity=".05" />
      <stop offset="100%" stop-color="white" stop-opacity=".02" />
    </linearGradient>
    <circle cx="18" cy="18" r="10.5" fill="url(#s-lens)" />
    {/* specular highlight */}
    <ellipse cx="14" cy="12" rx="4" ry="3" fill="white" fill-opacity=".25" />
  </svg>
);

/* ── Globe — a real desktop globe with axis, continents ────────────── */
export const DockGlobe = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="g" />
    <Squircle id="g" top="#30c2d6" bot="#0c6c80" />
    {/* globe sphere */}
    <radialGradient id="g-sphere" cx="38%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#5ee8f8" />
      <stop offset="50%" stop-color="#1a9cb8" />
      <stop offset="100%" stop-color="#0a5c70" />
    </radialGradient>
    <circle cx="24" cy="22" r="12" fill="url(#g-sphere)" />
    {/* metallic axis — top */}
    <rect x="22" y="8" width="4" height="4" rx="1.5" fill="#c0c0c8" />
    <line x1="22" y1="10" x2="22" y2="16" stroke="#888" stroke-width="1" />
    <line x1="26" y1="10" x2="26" y2="16" stroke="#888" stroke-width="1" />
    {/* metallic axis — bottom */}
    <rect x="22" y="32" width="4" height="4" rx="1.5" fill="#c0c0c8" />
    {/* latitude lines */}
    <ellipse cx="24" cy="22" rx="12" ry="5" fill="none" stroke="white" stroke-opacity=".15" stroke-width=".8" />
    <ellipse cx="24" cy="19" rx="12" ry="5" fill="none" stroke="white" stroke-opacity=".15" stroke-width=".8" />
    {/* longitude lines */}
    <ellipse cx="24" cy="22" rx="5" ry="12" fill="none" stroke="white" stroke-opacity=".15" stroke-width=".8" />
    {/* continent blobs */}
    <path d="M16 16 Q18 13 22 15 Q24 14 26 16 Q28 18 24 22 Q20 24 16 20Z"
          fill="#4ade80" fill-opacity=".35" />
    <path d="M28 14 Q32 12 35 15 Q36 19 33 21 Q30 19 28 17Z"
          fill="#4ade80" fill-opacity=".3" />
    <circle cx="20" cy="20" r="1.5" fill="white" fill-opacity=".4" />
    <circle cx="28" cy="18" r="1.5" fill="white" fill-opacity=".4" />
  </svg>
);

/* ── Sparkles — a real crystal / gemstone ──────────────────────────── */
export const DockSparkles = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="sp" />
    <Squircle id="sp" top="#e8a830" bot="#b47010" />
    {/* crystal body */}
    <linearGradient id="sp-crystal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity=".9" />
      <stop offset="35%" stop-color="#fff8e0" stop-opacity=".7" />
      <stop offset="100%" stop-color="#d4a020" stop-opacity=".6" />
    </linearGradient>
    <path d="M24 7l14 17-14 17-14-17Z" fill="url(#sp-crystal)"
          stroke="white" stroke-opacity=".5" stroke-width="1.2" stroke-linejoin="round" />
    {/* facet lines */}
    <path d="M24 7l-4 17 4 17" fill="none" stroke="white" stroke-opacity=".35" stroke-width=".8" />
    <path d="M24 7l4 17-4 17" fill="none" stroke="white" stroke-opacity=".2" stroke-width=".8" />
    {/* specular highlight */}
    <path d="M20 14l-2 8 6-3Z" fill="white" fill-opacity=".4" />
    {/* surrounding sparkle particles */}
    <circle cx="9" cy="10" r="1.5" fill="white" fill-opacity=".7" />
    <circle cx="38" cy="12" r="1" fill="white" fill-opacity=".5" />
    <circle cx="40" cy="30" r="1.5" fill="white" fill-opacity=".6" />
    <circle cx="8" cy="34" r="1" fill="white" fill-opacity=".4" />
  </svg>
);

/* ── Bot — a real toy robot with metallic body ─────────────────────── */
export const DockBot = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="b" />
    <Squircle id="b" top="#6890b8" bot="#345878" />
    {/* metallic head */}
    <linearGradient id="b-metal" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8e8f0" />
      <stop offset="40%" stop-color="#c0c0cc" />
      <stop offset="100%" stop-color="#888898" />
    </linearGradient>
    <rect x="11" y="13" width="26" height="20" rx="6" fill="url(#b-metal)"
          stroke="#666" stroke-width="1" />
    {/* head highlight */}
    <rect x="13" y="14" width="22" height="10" rx="5" fill="white" fill-opacity=".15" />
    {/* antenna */}
    <line x1="24" y1="13" x2="24" y2="7" stroke="#888" stroke-width="2" stroke-linecap="round" />
    <circle cx="24" cy="6" r="2.5" fill="#e04040" stroke="#a02020" stroke-width=".8" />
    <circle cx="23" cy="5" r=".8" fill="white" fill-opacity=".4" />
    {/* eyes — glowing LED style */}
    <circle cx="18" cy="21" r="3.5" fill="#1a1a28" stroke="#555" stroke-width=".8" />
    <circle cx="30" cy="21" r="3.5" fill="#1a1a28" stroke="#555" stroke-width=".8" />
    <circle cx="18" cy="21" r="2" fill="#4af" />
    <circle cx="30" cy="21" r="2" fill="#4af" />
    <circle cx="17" cy="20" r=".7" fill="white" fill-opacity=".6" />
    <circle cx="29" cy="20" r=".7" fill="white" fill-opacity=".6" />
    {/* mouth grill */}
    <rect x="17" y="27" width="14" height="3" rx="1.5" fill="#1a1a28" stroke="#555" stroke-width=".6" />
    <line x1="20" y1="27" x2="20" y2="30" stroke="#555" stroke-width=".5" />
    <line x1="24" y1="27" x2="24" y2="30" stroke="#555" stroke-width=".5" />
    <line x1="28" y1="27" x2="28" y2="30" stroke="#555" stroke-width=".5" />
    {/* ears / bolts */}
    <rect x="8" y="19" width="3" height="8" rx="1.5" fill="#888898" stroke="#666" stroke-width=".6" />
    <rect x="37" y="19" width="3" height="8" rx="1.5" fill="#888898" stroke="#666" stroke-width=".6" />
  </svg>
);

/* ── Code — a real developer IDE window ────────────────────────────── */
export const DockCode = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="cd" />
    <Squircle id="cd" top="#5c80c8" bot="#304a90" />
    {/* IDE window */}
    <rect x="5" y="7" width="38" height="32" rx="3" fill="#1e1e28" />
    {/* side bar */}
    <rect x="5" y="7" width="10" height="32" rx="3" fill="#16161e" />
    <rect x="15" y="7" width="1" height="32" fill="#2a2a38" />
    {/* file tree items */}
    <rect x="9" y="13" width="5" height="1.5" rx=".75" fill="white" opacity=".5" />
    <rect x="10" y="17" width="4" height="1.5" rx=".75" fill="white" opacity=".35" />
    <rect x="10" y="21" width="5" height="1.5" rx=".75" fill="white" opacity=".35" />
    {/* editor */}
    <rect x="17" y="7" width="26" height="32" fill="#1e1e28" />
    {/* code lines */}
    <rect x="20" y="14" width="12" height="1.5" rx=".75" fill="#61afef" opacity=".6" />
    <rect x="20" y="18" width="8" height="1.5" rx=".75" fill="#c678dd" opacity=".6" />
    <rect x="22" y="22" width="14" height="1.5" rx=".75" fill="#e5c07b" opacity=".5" />
    <rect x="22" y="26" width="10" height="1.5" rx=".75" fill="#98c379" opacity=".5" />
    <rect x="20" y="30" width="16" height="1.5" rx=".75" fill="white" opacity=".25" />
    <rect x="22" y="34" width="6" height="1.5" rx=".75" fill="white" opacity=".15" />
  </svg>
);

/* ── Sticky — a real paper sticky note with fold, pin ──────────────── */
export const DockMessageSquare = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="ms" />
    <Squircle id="ms" top="#eec838" bot="#b48010" />
    {/* note — slight 3D rotation via skew */}
    <rect x="9" y="10" width="29" height="27" rx="3"
          fill="#fff8d0" stroke="#d4b848" stroke-width=".8" />
    {/* paper texture hint */}
    <linearGradient id="ms-paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white" stop-opacity=".3" />
      <stop offset="100%" stop-color="black" stop-opacity=".05" />
    </linearGradient>
    <rect x="9" y="10" width="29" height="27" rx="3" fill="url(#ms-paper)" />
    {/* fold corner */}
    <path d="M30 10l8 8h-5a3 3 0 0 1-3-3V10Z"
          fill="#e8d090" stroke="#d4b848" stroke-width=".4" />
    {/* pushpin */}
    <circle cx="23" cy="14" r="3" fill="#e04040" stroke="#a02020" stroke-width=".6" />
    <circle cx="22" cy="13" r="1" fill="white" fill-opacity=".35" />
    {/* handwritten lines */}
    <line x1="14" y1="19" x2="28" y2="18" stroke="#8b7308" stroke-opacity=".4" stroke-width="1.2" stroke-linecap="round" />
    <line x1="14" y1="23" x2="26" y2="23" stroke="#8b7308" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round" />
    <line x1="14" y1="27" x2="24" y2="27.5" stroke="#8b7308" stroke-opacity=".25" stroke-width="1.2" stroke-linecap="round" />
    <line x1="14" y1="31" x2="20" y2="31" stroke="#8b7308" stroke-opacity=".2" stroke-width="1.2" stroke-linecap="round" />
  </svg>
);

/* ── Region — a real camera viewfinder / selection marquee ─────────── */
export const DockRegion = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="r" />
    <Squircle id="r" top="#ee5c88" bot="#b01e48" />
    {/* dark viewfinder overlay */}
    <rect x="6" y="8" width="36" height="32" rx="3" fill="#1a0810" />
    {/* the selected area (brighter) */}
    <rect x="11" y="14" width="26" height="20" rx="1.5" fill="white" fill-opacity=".08" />
    {/* dashed marquee */}
    <rect x="11" y="14" width="26" height="20" rx="1.5" fill="none" stroke="white" stroke-opacity=".8"
          stroke-width="1.5" stroke-dasharray="4 4" />
    {/* corner handles */}
    <rect x="8" y="11" width="6" height="6" rx="1.5" fill="white" fill-opacity=".9" />
    <rect x="34" y="11" width="6" height="6" rx="1.5" fill="white" fill-opacity=".9" />
    <rect x="8" y="31" width="6" height="6" rx="1.5" fill="white" fill-opacity=".9" />
    <rect x="34" y="31" width="6" height="6" rx="1.5" fill="white" fill-opacity=".9" />
    {/* center crosshair */}
    <circle cx="24" cy="24" r="2" fill="none" stroke="white" stroke-opacity=".4" stroke-width=".8" />
    <line x1="20" y1="24" x2="22" y2="24" stroke="white" stroke-opacity=".4" stroke-width=".8" />
    <line x1="26" y1="24" x2="28" y2="24" stroke="white" stroke-opacity=".4" stroke-width=".8" />
    <line x1="24" y1="20" x2="24" y2="22" stroke="white" stroke-opacity=".4" stroke-width=".8" />
    <line x1="24" y1="26" x2="24" y2="28" stroke="white" stroke-opacity=".4" stroke-width=".8" />
  </svg>
);

/* ── Text — a real paper document with text ────────────────────────── */
export const DockText = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="tx" />
    <Squircle id="tx" top="#688098" bot="#304050" />
    {/* paper */}
    <rect x="7" y="8" width="34" height="33" rx="2.5"
          fill="#fafafc" stroke="#c8c8d0" stroke-width=".8" />
    {/* red margin line */}
    <line x1="16" y1="12" x2="16" y2="38" stroke="#e8a0a0" stroke-width=".5" />
    {/* title */}
    <rect x="18" y="13" width="16" height="2.5" rx="1.25" fill="#1a1a28" opacity=".7" />
    {/* body */}
    <rect x="18" y="19" width="20" height="1.5" rx=".75" fill="#1a1a28" opacity=".4" />
    <rect x="18" y="23" width="18" height="1.5" rx=".75" fill="#1a1a28" opacity=".35" />
    <rect x="18" y="27" width="19" height="1.5" rx=".75" fill="#1a1a28" opacity=".3" />
    <rect x="18" y="31" width="14" height="1.5" rx=".75" fill="#1a1a28" opacity=".25" />
    <rect x="18" y="35" width="17" height="1.5" rx=".75" fill="#1a1a28" opacity=".2" />
  </svg>
);

/* ── LayoutDashboard — a real dashboard with panels & gadgets ──────── */
export const DockLayoutDashboard = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="ld" />
    <Squircle id="ld" top="#688ce0" bot="#3450b0" />
    {/* dashboard surface (slightly recessed) */}
    <rect x="6" y="7" width="36" height="34" rx="4" fill="#1a2040" />
    {/* top-left panel */}
    <rect x="9" y="11" width="14" height="13" rx="2" fill="#252a50" stroke="#3a3f68" stroke-width=".8" />
    {/* mini bar chart in TL */}
    <rect x="12" y="20" width="2.5" height="3" rx=".8" fill="#60a0f0" />
    <rect x="16" y="18" width="2.5" height="5" rx=".8" fill="#80c0f0" />
    <rect x="20" y="16" width="2.5" height="7" rx=".8" fill="#a0d0f0" opacity=".8" />
    {/* top-right panel */}
    <rect x="25" y="11" width="14" height="13" rx="2" fill="#252a50" stroke="#3a3f68" stroke-width=".8" />
    {/* mini pie in TR */}
    <circle cx="32" cy="17.5" r="4" fill="none" stroke="#60a0f0" stroke-width="3" />
    <circle cx="32" cy="17.5" r="4" fill="none" stroke="#f0a060" stroke-width="2"
            stroke-dasharray="10 15" stroke-dashoffset="0" />
    {/* bottom-left panel */}
    <rect x="9" y="26" width="14" height="13" rx="2" fill="#252a50" stroke="#3a3f68" stroke-width=".8" />
    {/* mini line in BL */}
    <polyline points="11,34 14,32 17,33 20,29 21,30"
              fill="none" stroke="#80c0f0" stroke-width="1.5" stroke-linecap="round" />
    {/* bottom-right panel */}
    <rect x="25" y="26" width="14" height="13" rx="2" fill="#252a50" stroke="#3a3f68" stroke-width=".8" />
    {/* mini number in BR */}
    <text x="28" y="34" font-family="'SF Mono',monospace" font-size="9" font-weight="700" fill="white" opacity=".7">42</text>
    <text x="28" y="37" font-family="'SF Mono',monospace" font-size="4" fill="white" opacity=".3">active</text>
  </svg>
);

/* ── Layers — real stacked glass/acetate sheets ────────────────────── */
export const DockLayers = (props: DockIconProps = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={props.size ?? 48} height={props.size ?? 48}
       viewBox="0 0 48 48" fill="none" class={props.class}>
    <TileDropShadow id="l" />
    <Squircle id="l" top="#54a4b4" bot="#246870" />
    {/* bottom sheet — cyan tint */}
    <rect x="7" y="27" width="28" height="13" rx="3.5"
          fill="#c8f0f8" fill-opacity=".25" stroke="white" stroke-opacity=".3" stroke-width="1.2" />
    <rect x="11" y="30" width="10" height="1.5" rx=".75" fill="white" opacity=".15" />
    <rect x="11" y="33" width="16" height="1.5" rx=".75" fill="white" opacity=".1" />
    {/* middle sheet — magenta tint */}
    <rect x="9" y="20" width="28" height="13" rx="3.5"
          fill="#f0c8f8" fill-opacity=".35" stroke="white" stroke-opacity=".45" stroke-width="1.2" />
    <rect x="13" y="23" width="12" height="1.5" rx=".75" fill="white" opacity=".2" />
    <rect x="13" y="26" width="18" height="1.5" rx=".75" fill="white" opacity=".15" />
    {/* top sheet — yellow tint, in focus */}
    <rect x="11" y="13" width="28" height="13" rx="3.5"
          fill="#f8f8d0" fill-opacity=".5" stroke="white" stroke-opacity=".7" stroke-width="1.2" />
    <rect x="15" y="16" width="14" height="1.5" rx=".75" fill="white" opacity=".35" />
    <rect x="15" y="19" width="20" height="1.5" rx=".75" fill="white" opacity=".25" />
    <rect x="15" y="22" width="10" height="1.5" rx=".75" fill="white" opacity=".15" />
  </svg>
);
