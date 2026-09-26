import { createMemo, type Accessor } from 'solid-js';
import { useResizeObserver } from './useResizeObserver';

export type AdaptiveSidebarPresentation = 'inline' | 'overlay';

export interface AdaptiveSidebarOptions {
  /** Stable layout region shared by the sidebar and main content. */
  container: Accessor<HTMLElement | null | undefined>;
  /** Preferred inline width, including separators. Never mutated by this policy. */
  sidebarWidth: Accessor<number>;
  /** Space reserved for the main content in local CSS pixels. */
  minContentWidth: Accessor<number>;
}

/** Space allocation only; the host retains navigation, disclosure and persistence. */
export function createAdaptiveSidebar(options: AdaptiveSidebarOptions): Accessor<AdaptiveSidebarPresentation> {
  const size = useResizeObserver(options.container, { preserveWhenHidden: true });
  const presentation = createMemo<AdaptiveSidebarPresentation>(() => {
    const measured = size();
    return measured && measured.width < options.sidebarWidth() + options.minContentWidth() ? 'overlay' : 'inline';
  });
  return presentation;
}
