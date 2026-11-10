import { ThemeProvider } from '../../src/context/ThemeContext';
import { CodeEditor } from '../../src/components/editor/CodeEditor';
import { createSignal, Show } from 'solid-js';
import { Portal, render } from 'solid-js/web';
import {
  ContextMenuActions,
  ContextMenuActionItems,
  SurfaceFloatingLayer,
  FloatingWindow,
  PromptCard,
} from '../../src/ui';
import '../../src/styles/globals.css';
render(() => {
  const [local, setLocal] = createSignal<{ x: number; y: number }>();
  const [result, setResult] = createSignal('');
  const [promptOpen, setPromptOpen] = createSignal(false);
  const [draft, setDraft] = createSignal('');
  const [closed, setClosed] = createSignal(0);
  const [invocations, setInvocations] = createSignal(0);
  const params = new URLSearchParams(location.search);
  const longDocument = params.has('long');
  const editorValue = longDocument
    ? 'module example.test/preview\n\ngo 1.26\n\nrequire (\n' +
      Array.from(
        { length: 70 },
        (_, index) =>
          `\texample.test/dependency-${String(index + 1).padStart(2, '0')} v1.2.${index}\n`
      ).join('') +
      ')\n'
    : '  const selected = true;\n  const untouched = false;';
  const viewport = new URLSearchParams(location.search).has('viewport');
  const [selection, setSelection] = createSignal('');
  const editor = () => (
    <ThemeProvider>
      <CodeEditor
        onSelectionChange={setSelection}
        options={{ smoothScrolling: false }}
        style={{ height: longDocument ? '600px' : '220px' }}
        path={longDocument ? 'go.mod' : 'menu.ts'}
        language={longDocument ? 'go' : 'typescript'}
        value={editorValue}
      />
    </ThemeProvider>
  );
  return (
    <ContextMenuActions
      label="Actions"
      portalScope={viewport ? 'viewport' : undefined}
      zIndex={5100}
      actions={(request) => [
        {
          id: 'ask',
          label: 'Ask assistant',
          disabled: params.has('disabled'),
          icon: () => (
            <span style={{ display: 'inline-flex' }}>
              <svg viewBox="0 0 24 24" style={{ width: '84%', height: '84%' }}>
                <circle cx="12" cy="12" r="10" fill="currentColor" />
              </svg>
            </span>
          ),
          onSelect: () => {
            setInvocations((count) => count + 1);
            setResult(JSON.stringify({ target: request.target.id, selection: request.selection }));
            setPromptOpen(true);
          },
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
            <Show when={new URLSearchParams(location.search).has('floating')} fallback={editor()}>
              <FloatingWindow
                open
                title="Editor preview"
                onOpenChange={() => {}}
                defaultSize={{ width: 640, height: longDocument ? 700 : 420 }}
              >
                {editor()}
              </FloatingWindow>
            </Show>
          </div>
        </Show>
        <button id="outside">Outside</button>
        <output id="selection">{selection()}</output>
        <output id="result">{result()}</output>
        <output id="invocations">{invocations()}</output>
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
      <Show when={new URLSearchParams(location.search).has('prompt')}>
        <PromptCard
          open={promptOpen()}
          portalScope="viewport"
          title="Ask"
          closeLabel="Close"
          value={draft()}
          onValueChange={setDraft}
          inputLabel="Question"
          submitLabel="Send"
          anchor={{ x: 850, y: 500 }}
          zIndex={5000}
          onSubmit={() => {}}
          onClose={() => {
            setPromptOpen(false);
            setClosed((count) => count + 1);
          }}
          containsTarget={(target) =>
            target instanceof Element && Boolean(target.closest('[role="menu"]'))
          }
        />
        <output id="closed">{closed()}</output>
      </Show>
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
