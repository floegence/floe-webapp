import type { JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FloeProvider } from '@floegence/floe-webapp-core/app';
import { NotesDemoProvider } from './NotesDemoContext';
import { useNotesDemoController } from './createNotesDemoController';

const NOTES_PAGE_SOURCE = resolve(__dirname, 'NotesPage.tsx');
const DEMO_VITE_CONFIG_SOURCE = resolve(__dirname, '../../../vite.config.ts');
const DEMO_WORKSPACE_TAILWIND_SOURCE = resolve(__dirname, '../../core-workspace-tailwind.css');

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
        snapshot.items[0]?.title ?? 'none',
        snapshot.items[0]?.headline ?? 'none',
        controller.activeTopicID(),
        controller.connectionState?.() ?? 'none',
      ].join('|')}
    </div>
  );
}

function HeadlineSDKProbe() {
  const controller = useNotesDemoController();
  const created = controller.createNote({
    topic_id: controller.activeTopicID(),
    headline: 'SDK Headline',
    body: 'SDK body',
    x: 24,
    y: 36,
  });

  if (created instanceof Promise) {
    throw new Error('Demo controller createNote should be synchronous in tests');
  }

  const updated = controller.updateNote(created.note_id, {
    headline: 'Updated SDK Headline',
  });

  if (updated instanceof Promise) {
    throw new Error('Demo controller updateNote should be synchronous in tests');
  }

  return (
    <div>
      {[
        created.title,
        created.headline ?? 'none',
        updated.title,
        updated.headline ?? 'none',
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

    expect(html).toContain(
      '3|6|1|Research Threads|hare|note/v1|Atmosphere|Atmosphere|topic-research-threads|live'
    );
  });

  it('supports headline through the shared notes sdk contract', () => {
    const html = renderToString(() => (
      <DemoProviders>
        <HeadlineSDKProbe />
      </DemoProviders>
    ));

    expect(html).toContain(
      'SDK Headline|SDK Headline|Updated SDK Headline|Updated SDK Headline'
    );
  });

  it('keeps the demo page as a thin Portal wrapper around the shared NotesOverlay', () => {
    const source = readFileSync(NOTES_PAGE_SOURCE, 'utf-8');

    expect(source).toContain("import { Portal } from 'solid-js/web';");
    expect(source).toContain("import { NotesOverlay } from '@floegence/floe-webapp-core/notes';");
    expect(source).toContain(
      "import { useNotesDemoController } from './createNotesDemoController';"
    );
    expect(source).toContain('const controller = useNotesDemoController();');
    expect(source).toContain('<Portal>');
    expect(source).toContain(
      '<NotesOverlay open controller={controller} onClose={props.onRequestClose} />'
    );
  });

  it('keeps the Vite workspace aliases in sync with the demo notes subpath import', () => {
    const source = readFileSync(DEMO_VITE_CONFIG_SOURCE, 'utf-8');

    expect(source).toContain("find: '@floegence/floe-webapp-core/notes'");
    expect(source).toContain("replacement: resolve(repoRoot, 'packages/core/src/notes.ts')");
  });

  it('loads notes overlay styles in workspace dev mode', () => {
    const source = readFileSync(DEMO_WORKSPACE_TAILWIND_SOURCE, 'utf-8');

    expect(source).toContain("@import '../../../packages/core/src/components/notes/notes.css';");
  });
});
