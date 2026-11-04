import type { Component } from 'solid-js';
import { ActivityRailGlyph, type ActivityRailIconProps } from './ActivityRailGlyph';
export {
  ActivityRailGlyph,
  type ActivityRailGlyphProps,
  type ActivityRailIconProps,
} from './ActivityRailGlyph';

// All destinations share the 24-unit frame, 1.5-unit round ink and light-fill recipe.
const WindowShape = () => <rect x="3.5" y="5" width="17" height="14" rx="2.5" />;
const PULSE =
  'M3.5 15.5h1.6q.5 0 .65-.55L7.9 7.3q.25-.9.45 0l2.35 10.8q.2.9.45 0l2.1-6.9q.25-.8.6 0l1.4 3.75q.2.55.75.55h4.5';
const Arrow = () => (
  <>
    <rect x="3.75" y="6.75" width="13.5" height="1.5" rx=".75" />
    <path d="M16 5.25q-.5-.3-.5.3v3.9q0 .6.5.3l3.2-1.85q.65-.4 0-.8Z" />
  </>
);

export const RailLaunchpad: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="launchpad"
    shape={() => (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.2" />
        <rect x="13" y="3.5" width="7.5" height="7.5" rx="2.2" />
        <rect x="3.5" y="13" width="7.5" height="7.5" rx="2.2" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="2.2" />
      </>
    )}
  />
);
export const RailFiles: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="files"
    shape={() => (
      <path d="M3.5 8a2 2 0 0 1 2-2h3.15a2 2 0 0 1 1.6.8l.95 1.3a2 2 0 0 0 1.6.8h5.7a2 2 0 0 1 2 2v6.6a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" />
    )}
  />
);
export const RailTerminal: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="terminal"
    shape={WindowShape}
    detail={() => <path fill="none" d="m7 9 2.5 2.2q.8.8 0 1.6L7 15M13 15h3.5" />}
  />
);
export const RailMonitor: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="monitor"
    shape={() => <path d={PULSE + 'V19.5H3.5Z'} />}
    outline={() => <path d={PULSE} />}
    activeFillOpacity={0.2}
    activeLines={() => <path d={PULSE} />}
  />
);
export const RailCode: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="code"
    shape={WindowShape}
    detail={() => (
      <path
        fill="none"
        stroke-width="1.35"
        d="m8.5 9-2.2 2.2q-.8.8 0 1.6L8.5 15m7-6 2.2 2.2q.8.8 0 1.6L15.5 15M13 8.5l-2 7"
      />
    )}
  />
);
export const RailGlobe: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="globe"
    shape={() => <circle cx="12" cy="12" r="8.25" />}
    detail={() => (
      <path
        fill="none"
        stroke-width="1.4"
        d="M3.75 12h16.5M12 3.75c-4.6 4.8-4.6 11.7 0 16.5M12 3.75c4.6 4.8 4.6 11.7 0 16.5"
      />
    )}
  />
);
export const RailApplications: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="applications"
    shape={WindowShape}
    detail={() => (
      <>
        <path fill="none" stroke-width="1.3" d="M3.5 9h17" />
        <path
          stroke-width="0"
          fill="currentColor"
          d="M10 11.1q-.5-.3-.5.3v4.7q0 .6.5.3l4-2.35q.5-.3 0-.6Z"
        />
      </>
    )}
  />
);
export const RailContainers: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="containers"
    shape={() => (
      <path d="m10.6 4.25-5.1 2.8a3 3 0 0 0-1.75 2.7v4.9a3 3 0 0 0 1.75 2.7l5.1 2.8a3 3 0 0 0 2.8 0l5.1-2.8a3 3 0 0 0 1.75-2.7v-4.9a3 3 0 0 0-1.75-2.7l-5.1-2.8a3 3 0 0 0-2.8 0Z" />
    )}
    detail={() => (
      <path fill="none" stroke-width="1.4" d="m4 8.2 6.5 3.4q1.5.8 3 0L20 8.2M12 12v8.3" />
    )}
  />
);
export const RailConnections: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="connections"
    shape={() => (
      <>
        <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2.2" />
        <rect x="13" y="13" width="7.5" height="7.5" rx="2.2" />
      </>
    )}
    lines={() => <path d="M7.25 11v3.75a2 2 0 0 0 2 2H13M16.75 13V9.25a2 2 0 0 0-2-2H11" />}
  />
);
export const RailSwitch: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="switch"
    shape={() => (
      <>
        <Arrow />
        <g transform="rotate(180 12 12)">
          <Arrow />
        </g>
      </>
    )}
    outline={() => (
      <path d="M4.5 7.5h14.75m-3.25-2.25 3.25 2.25L16 9.75M19.5 16.5H4.75M8 14.25 4.75 16.5 8 18.75" />
    )}
  />
);
export const RailSettings: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="settings"
    shape={() => (
      <>
        <circle cx="9.75" cy="6.5" r="2.75" />
        <circle cx="15.25" cy="17.5" r="2.75" />
      </>
    )}
    lines={() => <path d="M3.5 6.5h3.5M12.5 6.5h8M3.5 17.5h9M18 17.5h2.5" />}
  />
);
export const RailNotes: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="notes"
    shape={() => (
      <path d="M7 3.5h6.75a1.5 1.5 0 0 1 1.06.44l5.25 5.25a1.5 1.5 0 0 1 .44 1.06V18.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
    )}
    detail={() => (
      <path fill="none" d="M13.75 3.5v5.25a1.5 1.5 0 0 0 1.5 1.5H20.5M8.5 13h9M8.5 16.75h5.5" />
    )}
  />
);
export const RailShowcase: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="showcase"
    shape={() => <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />}
    detail={() => <path fill="none" d="M3.5 8.75h17M9.5 8.75v10.75" />}
  />
);
export const RailSearch: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="search"
    shape={() => <circle cx="10.75" cy="10.75" r="6.25" />}
    lines={() => <path d="m15.25 15.25 5.25 5.25" />}
  />
);
export const RailChat: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="chat"
    shape={() => (
      <path d="M20.5 7.5a3 3 0 0 0-3-3h-11a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h1.5v3.5L11.5 16.5H17.5a3 3 0 0 0 3-3Z" />
    )}
  />
);
export const RailDesignTokens: Component<ActivityRailIconProps> = (props) => (
  <ActivityRailGlyph
    {...props}
    identity="design-tokens"
    shape={() => <rect x="6.5" y="3.5" width="14" height="14" rx="3.5" />}
    lines={() => <path d="M3.5 8.5v8a4 4 0 0 0 4 4h6" />}
  />
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
  terminal: RailTerminal,
  monitor: RailMonitor,
  code: RailCode,
  globe: RailGlobe,
  applications: RailApplications,
  containers: RailContainers,
  connections: RailConnections,
  switch: RailSwitch,
} as const;
