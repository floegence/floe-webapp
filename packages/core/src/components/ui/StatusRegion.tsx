import { splitProps, type JSX } from 'solid-js';

export interface StatusRegionProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'style'> {
  /** Reserve a bounded number of text lines through idle, pending, success, and failure. */
  lines?: number;
  style?: JSX.CSSProperties;
}

/** A persistent, scrollable feedback slot. Long errors remain available without resizing adjacent content. */
export function StatusRegion(props: StatusRegionProps) {
  const [local, rest] = splitProps(props, ['lines', 'style', 'children']);
  return <div role="status" aria-live="polite" {...rest} style={{
    'block-size': `${local.lines ?? 2}lh`,
    'flex-shrink': '0',
    'min-width': '0',
    overflow: 'auto',
    'overflow-wrap': 'anywhere',
    ...local.style,
  }}>{local.children}</div>;
}
