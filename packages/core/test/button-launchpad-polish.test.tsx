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

    expect(html).toContain('hover:bg-error');
    expect(html).toContain('hover:text-error-foreground');
    expect(html).not.toContain('hover:bg-accent');
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
