import { createSignal, For, onMount, onCleanup, Show } from 'solid-js';
import { builtInShellThemePresets, useTheme } from '@floegence/floe-webapp-core';
import {
  Button,
  Card,
  CardContent,
  Dropdown,
  FloatingWindow,
  Textarea,
} from '@floegence/floe-webapp-core/ui';

/** Packed public components over repeatable non-modal backgrounds. */
export function WindowMaterialStudy() {
  const theme = useTheme();
  const params = new URLSearchParams(location.search);
  const [scene, setScene] = createSignal(params.get('scene') ?? 'files');
  const [open, setOpen] = createSignal([true, params.get('scene') === 'overlap', false]);
  const [front, setFront] = createSignal(params.get('scene') === 'overlap' ? 1 : 0);
  const [draft, setDraft] = createSignal(
    'Keep the reading surface quiet. Changes remain here while switching themes and windows.'
  );
  const show = (index: number, value: boolean) =>
    setOpen((items) => items.map((item, i) => (i === index ? value : item)));
  const selectTheme = (name: string) => {
    const preset = builtInShellThemePresets.find((item) => item.name === name);
    if (!preset) return;
    theme.selectShellTheme(preset.mode === 'dark' ? 'dark' : 'light', name);
  };
  onMount(() => {
    if (params.get('theme')) selectTheme(params.get('theme')!);
    // The fixture host supplies stacking through FloatingWindow's public zIndex.
    const activate = (event: PointerEvent) => {
      const root = (event.target as Element)?.closest?.(
        '[data-floe-geometry-surface="floating-window"]'
      );
      const index = [0, 1, 2].find((id) => root?.querySelector(`.window-study-window-${id}`));
      if (index !== undefined) setFront(index);
    };
    document.addEventListener('pointerdown', activate, true);
    onCleanup(() => document.removeEventListener('pointerdown', activate, true));
  });
  return (
    <div class="window-study" data-window-study>
      <header class="window-study-toolbar">
        <div>
          <span class="eyebrow">WORKSPACE</span>
          <h1>Project files</h1>
        </div>
        <div class="controls">
          <select
            aria-label="Window study theme"
            value={theme.shellPreset()?.name ?? 'classic-light'}
            onChange={(event) => selectTheme(event.currentTarget.value)}
          >
            <For each={builtInShellThemePresets}>
              {(preset) => <option value={preset.name}>{preset.displayName}</option>}
            </For>
          </select>
          <select
            aria-label="Window study background"
            value={scene()}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setScene(value);
              if (value === 'overlap') {
                show(1, true);
                setFront(1);
              }
            }}
          >
            <option value="files">File list</option>
            <option value="cards">Cards</option>
            <option value="overlap">Overlapping windows</option>
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              show(0, true);
              setFront(0);
            }}
          >
            Open preview
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              show(1, true);
              setFront(1);
            }}
          >
            Open notes
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              show(2, true);
              setFront(2);
            }}
          >
            Third window
          </Button>
        </div>
      </header>
      <Show
        when={scene() === 'cards'}
        fallback={
          <div class="window-study-files" data-study-background>
            <div>
              <span>Name</span>
              <span>Modified</span>
              <span>Size</span>
            </div>
            <For
              each={[
                'architecture.md',
                'src',
                'packages',
                'design-tokens.ts',
                'package.json',
                'README.md',
                'screenshots',
                'release-notes.md',
                'tests',
                'workspace.json',
                'changelog.md',
                'assets',
              ]}
            >
              {(name, index) => (
                <div classList={{ selected: index() === 0 }}>
                  <span>{name}</span>
                  <span>Today, 09:41</span>
                  <span>{index() % 3 ? '—' : '12 KB'}</span>
                </div>
              )}
            </For>
          </div>
        }
      >
        <div class="window-study-cards" data-study-background>
          <For
            each={[
              'Design system',
              'Recent activity',
              'Workspace notes',
              'Build output',
              'Files',
              'Connections',
            ]}
          >
            {(name) => (
              <Card>
                <CardContent>
                  <h2>{name}</h2>
                  <p>A calm surface for everyday work.</p>
                  <p>Updated just now</p>
                </CardContent>
              </Card>
            )}
          </For>
        </div>
      </Show>
      <For each={[0, 1, 2]}>
        {(index) => (
          <FloatingWindow
            open={open()[index]}
            onOpenChange={(value) => show(index, value)}
            title={['architecture.md', 'Workspace notes', 'Review checklist'][index]}
            defaultPosition={{ x: 210 + index * 210, y: 175 + index * 88 }}
            defaultSize={{ width: index === 0 ? 760 : 430, height: index === 0 ? 600 : 330 }}
            viewportInsets={{ top: 126, bottom: 28, left: 12, right: 12 }}
            zIndex={front() === index ? 110 : 100 + index}
            class={`window-study-window window-study-window-${index}`}
          >
            <div class="window-study-content">
              <div class="window-study-document-toolbar">
                <span>{index === 0 ? 'docs / architecture.md' : 'Personal workspace'}</span>
                <Dropdown
                  trigger={<span>Actions</span>}
                  triggerAriaLabel={`Window ${index + 1} actions`}
                  items={[{ id: 'copy', label: 'Copy reference' }]}
                  onSelect={() => undefined}
                />
              </div>
              <Show
                when={index === 0}
                fallback={
                  <div class="window-study-notes">
                    <p>Keep useful context nearby while working.</p>
                    <Textarea
                      aria-label={`Window ${index + 1} draft`}
                      value={draft()}
                      onInput={(event) => setDraft(event.currentTarget.value)}
                    />
                  </div>
                }
              >
                <article class="window-study-document">
                  <p class="eyebrow">ENGINEERING / WORKSPACE</p>
                  <h1>A clear space for focused work</h1>
                  <p class="window-study-lead">
                    Readable documents, responsive tools, and a workspace that stays within reach.
                  </p>
                  <h2>One workspace, several perspectives</h2>
                  <p>
                    A floating preview belongs above the workspace without hiding it. You can read
                    this document, select text, and return to the file list at any time.
                  </p>
                  <blockquote>
                    Keep the content sharp and the surrounding controls quiet. Depth should help you
                    find the window, then let you focus on the work.
                  </blockquote>
                  <h2>Implementation notes</h2>
                  <p>
                    Each window retains its own position and size. The title bar identifies its
                    purpose while the reading surface remains steady during interaction.
                  </p>
                  <p>
                    Open another window to compare surfaces, or switch themes without losing the
                    draft in your notes.
                  </p>
                </article>
              </Show>
            </div>
          </FloatingWindow>
        )}
      </For>
    </div>
  );
}
