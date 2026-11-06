import { splitProps, type JSX } from 'solid-js';

export interface RetainedPanelProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'hidden' | 'inert' | 'style' | 'aria-hidden'> {
  active: boolean;
}

/** A retained document layer. Its positioned parent owns the viewport dimensions.
 * Visibility changes preserve layout, scroll and embedded document identity.
 * Mounting, ordering, media activation and disposal remain the caller's responsibility.
 */
export function RetainedPanel(props: RetainedPanelProps) {
  const [local, attributes] = splitProps(props, ['active', 'children']);
  return <div {...attributes} data-floe-retained-panel
    aria-hidden={local.active ? undefined : 'true'} inert={!local.active}
    style={{ position: 'absolute', inset: '0', 'min-width': '0', 'min-height': '0',
      visibility: local.active ? 'visible' : 'hidden', opacity: local.active ? '1' : '0', 'pointer-events': local.active ? undefined : 'none' }}>
    {local.children}
  </div>;
}
