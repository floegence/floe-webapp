import { ThemeProvider } from '../../src/context/ThemeContext';
import { CodeEditor } from '../../src/components/editor/CodeEditor';
import { createSignal, Show } from 'solid-js';
import { Portal, render } from 'solid-js/web';
import { ContextMenuActions, ContextMenuActionItems, SurfaceFloatingLayer } from '../../src/ui';
import '../../src/styles/globals.css';
render(() => {
  const [local, setLocal] = createSignal<{ x: number; y: number }>();
  const [result, setResult] = createSignal('');
  const viewport = new URLSearchParams(location.search).has('viewport');
  return (
    <ContextMenuActions
      label="Actions"
      portalScope={viewport ? 'viewport' : undefined}
      zIndex={5100}
      actions={(request) => [
        {
          id: 'ask',
          label: 'Ask assistant',
          icon: () => (
            <span style={{ display: 'inline-flex' }}>
              <svg viewBox="0 0 24 24" style={{ width: '84%', height: '84%' }}>
                <circle cx="12" cy="12" r="10" fill="currentColor" />
              </svg>
            </span>
          ),
          onSelect: () =>
            setResult(JSON.stringify({ target: request.target.id, selection: request.selection })),
        },
      ]}
      editing={{
        labels: {
          undo: 'Undo',
          redo: 'Redo',
          cut: 'Cut',
          copy: 'Copy',
          paste: 'Paste',
          selectAll: 'Select all',
          openLink: 'Open link',
          copyLink: 'Copy link',
        },
        onError: (error) => {
          throw error;
        },
      }}
    >
      <main
        data-floe-dialog-surface-host={viewport ? 'true' : undefined}
        style={{
          isolation: 'isolate',
          padding: '32px',
          height: '100vh',
          background: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <section id="blank" tabIndex={0} style={{ height: '120px' }}>
          Blank surface
        </section>
        <div id="independent-scroll" style={{ height: '24px', overflow: 'auto' }}>
          <div style={{ height: '160px' }}>Independent content</div>
        </div>
        <p id="reading">Selected document context</p>
        <textarea id="editor" aria-label="Editor" value="Existing input" />
        <section
          id="local"
          style={{ height: '100px' }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setLocal({ x: event.clientX, y: event.clientY });
          }}
        >
          Local menu
        </section>
        <section
          id="remote"
          style={{ height: '100px' }}
          onContextMenu={(event) => event.preventDefault()}
        >
          Remote input owner
        </section>
        <Show when={new URLSearchParams(location.search).has('editor')}>
          <div id="monaco-source" style={{ height: '220px' }}>
            <ThemeProvider>
              <CodeEditor
                style={{ height: '220px' }}
                path="menu.ts"
                language="typescript"
                value="const selected = true;"
              />
            </ThemeProvider>
          </div>
        </Show>
        <button id="outside">Outside</button>
        <output id="result">{result()}</output>
        <Show when={local()} keyed>
          {(point) => (
            <SurfaceFloatingLayer
              position={point}
              role="menu"
              class="floe-context-actions"
              estimatedSize={{ width: 208, height: 68 }}
            >
              <ContextMenuActionItems
                itemClass="custom-menu-item"
                onClose={() => setLocal(undefined)}
              />
              <button
                role="menuitem"
                class="floe-context-action"
                onClick={() => {
                  setResult('original');
                  setLocal(undefined);
                }}
              >
                Original action
              </button>
            </SurfaceFloatingLayer>
          )}
        </Show>
      </main>
      <Show when={viewport}>
        <Portal>
          <div
            id="global-prompt"
            style={{
              position: 'fixed',
              left: '20px',
              top: '100px',
              width: '300px',
              height: '200px',
              'z-index': 1000,
              background: 'var(--background)',
            }}
          >
            Existing prompt
          </div>
        </Portal>
      </Show>
    </ContextMenuActions>
  );
}, document.getElementById('root')!);
