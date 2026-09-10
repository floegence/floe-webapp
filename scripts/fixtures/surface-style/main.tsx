import { WindowMaterialStudy } from './WindowMaterialStudy';
import { SurfaceComponentGallery } from './SurfaceComponentGallery';
import { createSignal, Show, For, onMount, onCleanup } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeProvider } from '@floegence/floe-webapp-core/app';
import { useTheme, builtInShellThemePresets } from '@floegence/floe-webapp-core';
import { Shell } from '@floegence/floe-webapp-core/layout';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  NumberInput,
  AffixInput,
  Dialog,
  Dropdown,
  FloatingWindow,
  CANVAS_WHEEL_INTERACTIVE_ATTR,
  WORKBENCH_TEXT_SELECTION_SURFACE_ATTR,
} from '@floegence/floe-webapp-core/ui';
import { ChatProvider, ChatInput } from '@floegence/floe-webapp-core/chat';
import {
  WorkbenchSurface,
  createWorkbenchFilterState,
  type WorkbenchState,
  type WorkbenchWidgetDefinition,
} from '@floegence/floe-webapp-core/workbench';
import './entry.css';

const params = new URLSearchParams(location.search);
const lifecycle = { mounts: 0, cleanups: 0 };
const [componentProgress, setComponentProgress] = createSignal(64);
const [output, setOutput] = createSignal('Ready for streaming output.');
const definitions: readonly WorkbenchWidgetDefinition[] = ['canvas', 'projected'].map((mode) => ({
  type: mode,
  label: mode,
  icon: () => null,
  defaultTitle: mode === 'canvas' ? 'Workspace notes' : 'Build output',
  defaultSize: { width: 400, height: 250 },
  renderMode: mode === 'projected' ? 'projected_surface' : 'canvas_scaled',
  body: (props) => {
    onMount(() => lifecycle.mounts++);
    onCleanup(() => lifecycle.cleanups++);
    return (
      <div class="widget-content" data-body={props.widgetId}>
        <Input aria-label={`${mode} editor`} value="Selection and editing stay here" />
        <p {...{ [WORKBENCH_TEXT_SELECTION_SURFACE_ATTR]: 'true' }}>
          A readable workspace keeps native text selection and copy available.
        </p>
        <pre {...{ [CANVAS_WHEEL_INTERACTIVE_ATTR]: props.selected ? 'true' : undefined }}>
          {output()}
        </pre>
        <Dropdown
          trigger={<span>Widget actions</span>}
          triggerAriaLabel={`${mode} actions`}
          items={[{ id: 'copy', label: 'Copy reference' }]}
          onSelect={() => undefined}
        />
      </div>
    );
  },
}));
const initialState: WorkbenchState = {
  version: 1,
  theme: 'default',
  locked: false,
  viewport: { x: 0, y: 0, scale: 1 },
  selectedWidgetId: null,
  filters: createWorkbenchFilterState(definitions),
  widgets: definitions.map((definition, i) => ({
    id: `widget-${i}`,
    type: definition.type,
    title: definition.defaultTitle,
    x: 32 + i * 440,
    y: 35 + i * 28,
    width: 400,
    height: 250,
    z_index: i + 1,
    created_at_unix_ms: i + 1,
  })),
};

function Content() {
  const theme = useTheme();
  const [state, setState] = createSignal(initialState);
  const [dialog, setDialog] = createSignal(false);
  const [windows, setWindows] = createSignal(false);
  const surfaceTheme = theme as typeof theme & { setSurfaceStyle?: (style: string) => void };
  onMount(() => {
    surfaceTheme.setSurfaceStyle?.(params.get('surface') ?? 'standard');
    Object.assign(window, {
      surfaceFixture: {
        theme,
        state,
        setState,
        setOutput,
        setComponentProgress,
        setWindows,
        lifecycle,
        themes: builtInShellThemePresets,
      },
    });
  });
  return (
    <Shell
      topBarActions={
        <div class="controls surface-controls">
          <Button variant="ghost" title="Toggle color mode" onClick={() => theme.toggleTheme()}>
            Theme
          </Button>
          <Button variant="secondary" onClick={() => surfaceTheme.setSurfaceStyle?.('standard')}>
            Standard
          </Button>
          <Button
            variant="secondary"
            onClick={() => surfaceTheme.setSurfaceStyle?.('soft-neumorphic')}
          >
            Soft neumorphic
          </Button>
        </div>
      }
    >
      <Show
        when={params.get('panel') === 'windows'}
        fallback={
          <>
            <Show
              when={params.get('panel') === 'components'}
              fallback={
                <div class="acceptance-page" data-scroll>
                  <header>
                    <p class="eyebrow">FLOE / SURFACE STUDY</p>
                    <h1>A quieter place to work.</h1>
                    <p>Familiar controls. Gentle depth. Your workspace stays yours.</p>
                  </header>
                  <div class="cards">
                    <Card data-case="card">
                      <CardHeader>
                        <CardTitle>Workspace details</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <label>
                          Workspace name
                          <Input aria-label="Workspace name" value="Studio workspace" />
                        </label>
                        <label>
                          Description
                          <Textarea
                            aria-label="Description"
                            value="A focused environment for thoughtful work."
                          />
                        </label>
                        <div class="controls">
                          <Button data-case="primary">Save changes</Button>
                          <Button variant="secondary" data-case="secondary">
                            Duplicate
                          </Button>
                          <Button variant="outline">Export</Button>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>Connection preferences</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <label>
                          Endpoint
                          <AffixInput
                            aria-label="Endpoint"
                            prefix="https://"
                            value="workspace.example"
                          />
                        </label>
                        <label>
                          Concurrent sessions
                          <NumberInput value={3} onChange={() => undefined} />
                        </label>
                        <div class="controls">
                          <Button variant="secondary" onClick={() => setWindows((v) => !v)}>
                            Open windows
                          </Button>
                          <Button variant="outline" onClick={() => setDialog(true)}>
                            Review settings
                          </Button>
                          <Dropdown
                            trigger={<span>More actions</span>}
                            triggerAriaLabel="More actions"
                            items={[
                              { id: 'rename', label: 'Rename workspace' },
                              { id: 'archive', label: 'Archive workspace' },
                            ]}
                            onSelect={() => undefined}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <section class="chat-panel">
                      <p class="eyebrow">ASSISTANT</p>
                      <p data-chat-output>{output()}</p>
                      <ChatProvider config={{ allowAttachments: false }}>
                        <ChatInput />
                      </ChatProvider>
                    </section>
                  </div>
                  <section class="workbench-frame" data-floe-surface-divider>
                    <WorkbenchSurface
                      state={state}
                      setState={setState}
                      widgetDefinitions={definitions}
                    />
                  </section>
                  <div class="controls">
                    <Card variant="glass" data-case="glass">
                      <CardContent>Explicit glass</CardContent>
                    </Card>
                    <Card variant="hover-lift" data-case="lift">
                      <CardContent>Explicit hover lift</CardContent>
                    </Card>
                    <Card data-floe-surface="flat" data-case="flat">
                      <CardContent>Flat content</CardContent>
                    </Card>
                  </div>
                  <section class="long-list" data-list data-floe-surface-divider>
                    <For each={Array.from({ length: 600 }, (_, i) => i)}>
                      {(i) => (
                        <div data-floe-surface-divider>
                          <span>workspace / module-{String(i).padStart(3, '0')}.ts</span>
                          <span>Ready</span>
                        </div>
                      )}
                    </For>
                  </section>
                  <Dialog open={dialog()} onOpenChange={setDialog} title="Review settings">
                    <Input aria-label="Review name" value="Studio workspace" />
                    <Button onClick={() => setDialog(false)}>Done</Button>
                  </Dialog>
                </div>
              }
            >
              <div class="acceptance-page" data-scroll>
                <SurfaceComponentGallery
                  progress={params.get('dense') === 'true' ? componentProgress() : undefined}
                  dense={params.get('dense') === 'true'}
                />
              </div>
            </Show>
            <For each={[0, 1]}>
              {(i) => (
                <FloatingWindow
                  open={windows()}
                  onOpenChange={setWindows}
                  title={`Session ${i + 1}`}
                  defaultPosition={{ x: 130 + i * 460, y: 160 + i * 40 }}
                  defaultSize={{ width: 420, height: 280 }}
                >
                  <div class="widget-content">
                    <Input aria-label={`Session ${i + 1} input`} value="Persistent draft" />
                    <pre>{output()}</pre>
                  </div>
                </FloatingWindow>
              )}
            </For>
          </>
        }
      >
        <WindowMaterialStudy />
      </Show>
    </Shell>
  );
}

render(
  () => (
    <FloeProvider
      config={{
        storage: { enabled: false },
        theme: {
          defaultTheme: params.get('mode') === 'dark' ? 'dark' : 'light',
          shellPresets: builtInShellThemePresets,
        },
        layout: { sidebar: { defaultCollapsed: true } },
      }}
    >
      <Content />
    </FloeProvider>
  ),
  document.getElementById('root')!
);
