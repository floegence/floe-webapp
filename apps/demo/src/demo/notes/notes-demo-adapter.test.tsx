import type { JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FloeProvider } from '@floegence/floe-webapp-core/app';
import { NotesDemoProvider } from './NotesDemoContext';
import { useNotesDemoController } from './createNotesDemoController';

function DemoProviders(props: { children: JSX.Element }) {
  return (
    <FloeProvider
      config={{
        storage: {
          enabled: false,
        },
      }}
    >
      <NotesDemoProvider>{props.children}</NotesDemoProvider>
    </FloeProvider>
  );
}

function NotesControllerProbe() {
  const controller = useNotesDemoController();
  const snapshot = controller.snapshot();

  return (
    <div>
      {[
        snapshot.topics.length,
        snapshot.items.length,
        snapshot.trash_items.length,
        snapshot.topics[0]?.name ?? 'none',
        snapshot.topics[0]?.icon_key ?? 'none',
        snapshot.items[0]?.style_version ?? 'none',
        controller.activeTopicID(),
        controller.connectionState?.() ?? 'none',
      ].join('|')}
    </div>
  );
}

describe('demo notes shared adapter', () => {
  it('maps the demo store into the canonical shared notes controller contract', () => {
    const html = renderToString(() => (
      <DemoProviders>
        <NotesControllerProbe />
      </DemoProviders>
    ));

    expect(html).toContain('3|6|1|Research Threads|hare|note/v1|topic-research-threads|live');
  });

  it('keeps the demo page as a thin Portal wrapper around the shared NotesOverlay', () => {
    const source = readFileSync(resolve(__dirname, 'NotesPage.tsx'), 'utf-8');

    expect(source).toContain("import { Portal } from 'solid-js/web';");
    expect(source).toContain("import { NotesOverlay } from '@floegence/floe-webapp-core/notes';");
    expect(source).toContain("import { useNotesDemoController } from './createNotesDemoController';");
    expect(source).toContain('const controller = useNotesDemoController();');
    expect(source).toContain('<Portal>');
    expect(source).toContain('<NotesOverlay open controller={controller} onClose={props.onRequestClose} />');
  });
});
