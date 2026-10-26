import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { Button } from '../src/components/ui/Button';
import { LaunchpadItem } from '../src/components/launchpad/LaunchpadItem';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDir, '../../..');

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('close button polish', () => {
  it('exposes a shared ghost-destructive button variant for close affordances', () => {
    const html = renderToString(() => (
      <Button variant="ghost-destructive" size="icon">
        Close
      </Button>
    ));

    /* A close affordance is a quiet control until hovered: then the danger
     * arrives as a 12% error wash under error-colored ink, never a filled
     * destructive button competing with the content it dismisses. */
    expect(html).toContain('hover:bg-[color-mix(in_srgb,var(--error)_12%,transparent)]');
    expect(html).toContain('hover:text-error');
    expect(html).not.toContain('hover:bg-accent');
  });

  it('defines the danger hover utility consumed by close affordances', () => {
    const styles = read('packages/core/src/styles/floe.css');

    expect(styles).toContain('.hover\\:bg-error:hover');
    expect(styles).toContain('.hover\\:text-error-foreground:hover');
  });

  it('routes dialog-like close controls through the shared variant', () => {
    expect(read('packages/core/src/components/ui/Dialog.tsx')).toContain('variant="ghost-destructive"');
    expect(read('packages/core/src/components/ui/FloatingWindow.tsx')).toContain('variant="ghost-destructive"');
    expect(read('packages/core/src/components/ui/picker/PickerBase.tsx')).toContain('variant="ghost-destructive"');
  });
});

describe('launchpad item polish', () => {
  it('drops the extra rectangular border framing around launchpad icons', () => {
    const html = renderToString(() => (
      <LaunchpadItem
        item={{
          id: 'files',
          name: 'Files',
          icon: (props) => <span class={props.class}>F</span>,
        }}
        index={0}
      />
    ));

    expect(html).not.toContain('border-border/50');
    expect(html).not.toContain('border-border/40');
    expect(html).toContain('hover:bg-card/20');
  });
});
