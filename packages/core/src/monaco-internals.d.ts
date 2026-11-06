declare module 'monaco-editor/features/register.all' {
  const runtime: unknown;
  export default runtime;
}

declare module 'monaco-editor/platform/hover/browser/hover.js' {
  export const IHoverService: unknown;
}
declare module 'monaco-editor/platform/hover/browser/hoverService.js' {
  export interface FloeMonacoHoverOptions {
    target: HTMLElement | { targetElements: HTMLElement[] };
    container?: HTMLElement;
    style?: number;
    appearance?: { showPointer?: boolean };
    position?: { hoverPosition?: number; anchorAlignment?: number };
  }
  export class HoverService {
    showDelayedHover(options: FloeMonacoHoverOptions, lifecycleOptions?: unknown): unknown;
    showInstantHover(options: FloeMonacoHoverOptions, focus?: boolean, skipLastFocusedUpdate?: boolean, dontShow?: boolean): unknown;
  }
}
declare module 'monaco-editor/platform/instantiation/common/extensions.js' {
  export function registerSingleton(id: unknown, constructor: unknown, delayed: boolean): void;
}

declare module 'monaco-editor/editor/contrib/suggest/browser/suggestMemory.js' {
  const runtime: unknown;
  export default runtime;
}

declare module 'monaco-editor/editor/contrib/codelens/browser/codeLensCache.js' {
  const runtime: unknown;
  export default runtime;
}

declare module 'monaco-editor/editor/contrib/inlayHints/browser/inlayHintsContribution.js' {
  const runtime: unknown;
  export default runtime;
}

declare module 'monaco-editor/editor/common/services/treeViewsDndService.js' {
  const runtime: unknown;
  export default runtime;
}

declare module 'monaco-editor/platform/actionWidget/browser/actionWidget.js' {
  const runtime: unknown;
  export default runtime;
}
