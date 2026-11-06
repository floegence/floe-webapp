import { HoverService } from 'monaco-editor/platform/hover/browser/hoverService.js';
import { IHoverService } from 'monaco-editor/platform/hover/browser/hover.js';
import { registerSingleton } from 'monaco-editor/platform/instantiation/common/extensions.js';

// Standalone Monaco positions control tooltips against the document viewport.
// Floe editors are clipped reading surfaces: put pointer tooltips below their
// controls, and resolve ownership from the target rather than the focused editor.
class FloeEditorHoverService extends HoverService {
  private scopeOptions(options: Parameters<HoverService['showInstantHover']>[0]) {
    const target = options.target instanceof HTMLElement ? options.target : options.target.targetElements[0];
    const owner = target?.closest<HTMLElement>('.floe-code-editor');
    if (!owner) return options;
    const bounds = owner.getBoundingClientRect();
    const anchor = target.getBoundingClientRect();
    return { ...options, container: owner,
      ...(options.style === 1 || options.appearance?.showPointer ? { position: { ...options.position, hoverPosition: 2,
        anchorAlignment: anchor.left + anchor.width / 2 > bounds.left + bounds.width / 2 ? 1 : 0 } } : {}),
    };
  }
  override showInstantHover(...args: Parameters<HoverService['showInstantHover']>) {
    args[0] = this.scopeOptions(args[0]);
    return super.showInstantHover(...args);
  }
  override showDelayedHover(...args: Parameters<HoverService['showDelayedHover']>) {
    args[0] = this.scopeOptions(args[0]);
    return super.showDelayedHover(...args);
  }
}

let registered = false;
export function ensureFloeMonacoHover() {
  if (registered) return;
  registered = true;
  registerSingleton(IHoverService, FloeEditorHoverService, true);
}
