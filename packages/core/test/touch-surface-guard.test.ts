import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function read(relPath: string): string {
  const here = fileURLToPath(import.meta.url);
  const dir = path.dirname(here);
  return fs.readFileSync(path.resolve(dir, relPath), 'utf8');
}

describe('touch surface guard', () => {
  it('defines one shared guard contract and styles the full touch surface subtree', () => {
    const guardSrc = read('../src/utils/touchSurfaceGuard.ts');
    const stylesSrc = read('../src/styles/floe.css');

    expect(guardSrc).toContain("FLOE_TOUCH_SURFACE_ATTR = 'data-floe-touch-surface'");
    expect(guardSrc).toContain("FLOE_TOUCH_SURFACE_VALUE = 'true'");
    expect(guardSrc).toContain('preventTouchSurfaceNativeInteraction');
    expect(guardSrc).toContain('preventTouchSurfacePointerDown');
    expect(guardSrc).toContain('onContextMenu: preventTouchSurfaceNativeInteraction');
    expect(guardSrc).toContain('onSelectStart: preventTouchSurfaceNativeInteraction');

    expect(stylesSrc).toContain("[data-floe-touch-surface='true'],");
    expect(stylesSrc).toContain("[data-floe-touch-surface='true'] *");
    expect(stylesSrc).toContain('-webkit-touch-callout: none;');
    expect(stylesSrc).toContain('touch-action: manipulation;');
  });

  it('reuses the shared guard on keyboard suggestions and the mobile terminal prompt surface', () => {
    const keyboardSrc = read('../src/components/ui/MobileKeyboard.tsx');
    const terminalSrc = read('../src/widgets/TerminalWidget.tsx');

    expect(keyboardSrc).toContain('preventTouchSurfacePointerDown');
    expect(keyboardSrc).toContain('class="mobile-keyboard-suggestion"');
    expect(keyboardSrc).toContain('onPointerDown={preventTouchSurfacePointerDown}');
    expect(keyboardSrc).toContain('class="mobile-keyboard-dismiss"');
    expect(keyboardSrc).toContain('{...floeTouchSurfaceAttrs}');

    expect(terminalSrc).toContain('preventTouchSurfacePointerDown(event);');
    expect(terminalSrc).toContain('{...floeTouchSurfaceAttrs}');
    expect(terminalSrc).toContain('aria-label="Terminal input surface"');
  });
});
