import { For, type JSX } from 'solid-js';

export interface StableTextProps {
  children: string;
  /** All transient labels, in the current locale. Only the current label is exposed to assistive technology. */
  reserve: readonly string[];
  class?: string;
}

/** Intrinsic sizing includes every state before the first interaction, including wrapped labels. */
export function StableText(props: StableTextProps) {
  const cell: JSX.CSSProperties = { 'grid-area': '1 / 1', 'min-width': '0' };
  return <span class={props.class} style={{ display: 'inline-grid', 'min-width': '0', 'vertical-align': 'bottom', 'align-items': 'center' }}>
    <For each={props.reserve}>{label => <span aria-hidden="true" style={{ ...cell, visibility: 'hidden', 'pointer-events': 'none', 'user-select': 'none' }}>{label}</span>}</For>
    <span style={cell}>{props.children}</span>
  </span>;
}
