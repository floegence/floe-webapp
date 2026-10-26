import type { Component, JSX } from 'solid-js';

export interface ActivityRailIconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  size?: number | string;
}

/* ======================================================================
   Activity rail glyphs.

   These are drawn for one job: a 20px glyph inside a 40/48px rail button.
   A generic 24-viewBox icon at stroke-width 2 renders ~1.67px of ink at
   that size, heavier than the rest of the shell, and turns detailed
   silhouettes (a gear, a stack of layers) into mush. Every glyph here
   keeps the same frame instead:

     - 24 viewBox, stroke-width 1.5  => 1.25px of ink at 20px, the ratio
       the DockIcons family already uses
     - ink confined to the 3.5..20.5 box, so the set shares one cap height
       and one baseline and the rail reads as a column, not a pile
     - geometry on whole/half units, so hairlines land on pixel boundaries
       instead of resampling into grey

   Each shape is reduced to one idea. At this size a rail glyph is read in
   a glance, so silhouette beats detail.
   ====================================================================== */

const RAIL_INK = 1.5;

function RailBase(props: ActivityRailIconProps & { children: JSX.Element }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size ?? 24}
      height={props.size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={RAIL_INK}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={props.class}
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

/** Launchpad — four rounded tiles in a 2x2 field. */
export const RailLaunchpad: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.2" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="2.2" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="2.2" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="2.2" />
  </RailBase>
);

/** Notes — a page with a folded corner and writing rules. */
export const RailNotes: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <path d="M7 3.5h6.75a1.5 1.5 0 0 1 1.06.44l5.25 5.25a1.5 1.5 0 0 1 .44 1.06V18.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
    <path d="M13.75 3.5v5.25a1.5 1.5 0 0 0 1.5 1.5H20.5" />
    <path d="M8.5 13h9" />
    <path d="M8.5 16.75h5.5" />
  </RailBase>
);

/** Showcase — a workspace frame with chrome and a side rail. */
export const RailShowcase: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 8.75h17" />
    <path d="M9.5 8.75v10.75" />
  </RailBase>
);

/** Files — a tabbed folder. */
export const RailFiles: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <path d="M3.5 17.5V6.5a2 2 0 0 1 2-2h3.35a2 2 0 0 1 1.6.8l1 1.35a2 2 0 0 0 1.6.8h3.45a2 2 0 0 1 2 2v8.05a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" />
  </RailBase>
);

/** Search — lens. */
export const RailSearch: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <circle cx="10.75" cy="10.75" r="6.25" />
    <path d="m15.25 15.25 5.25 5.25" />
  </RailBase>
);

/** Settings — two rails with a knob each. Legible where a gear is not. */
export const RailSettings: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <path d="M3.5 6.5h3.25" />
    <path d="M12.75 6.5h7.75" />
    <circle cx="9.75" cy="6.5" r="2.75" />
    <path d="M3.5 17.5h8.75" />
    <path d="M18.25 17.5h2.25" />
    <circle cx="15.25" cy="17.5" r="2.75" />
  </RailBase>
);

/** Chat — speech bubble with a tail. */
export const RailChat: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <path d="M20.5 7.5a3 3 0 0 0-3-3h-11a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h1.5v3.5L11.5 16.5H17.5a3 3 0 0 0 3-3Z" />
  </RailBase>
);

/** Design tokens — sheets stacked behind a front card. */
export const RailDesignTokens: Component<ActivityRailIconProps> = (props) => (
  <RailBase {...props}>
    <rect x="6.5" y="3.5" width="14" height="14" rx="3.5" />
    <path d="M3.5 8.5v8a4 4 0 0 0 4 4h6" />
  </RailBase>
);

export const ActivityRailIcons = {
  launchpad: RailLaunchpad,
  notes: RailNotes,
  showcase: RailShowcase,
  files: RailFiles,
  search: RailSearch,
  settings: RailSettings,
  chat: RailChat,
  designTokens: RailDesignTokens,
} as const;
