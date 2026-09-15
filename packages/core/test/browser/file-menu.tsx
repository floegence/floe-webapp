import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import {
  FileBrowserProvider,
  useFileBrowser,
} from '../../src/components/file-browser/FileBrowserContext';
import { FileContextMenu } from '../../src/components/file-browser/FileContextMenu';
import { createLongPressContextMenuHandlers } from '../../src/components/file-browser/longPressContextMenu';
import type { ContextMenuItem } from '../../src/components/file-browser/types';
import '../../src/styles/globals.css';

const file = { id: 'a', name: 'alpha.txt', path: '/alpha.txt', type: 'file' as const };
const mode = new URLSearchParams(location.search).get('mode');
function Fixture() {
  const browser = useFileBrowser();
  const [boundary, setBoundary] = createSignal<HTMLDivElement>();
  const [action, setAction] = createSignal('');
  let trigger!: HTMLButtonElement;
  const longPress = createLongPressContextMenuHandlers(browser, file);
  const items: ContextMenuItem[] = [
    {
      id: 'new',
      label: 'New',
      type: 'custom',
      children: [
        { id: 'file', label: 'New file', type: 'custom', onAction: () => setAction('new-file') },
        {
          id: 'folder',
          label: 'New folder',
          type: 'custom',
          onAction: () => setAction('new-folder'),
        },
      ],
    },
    ...Array.from({ length: mode === 'short' ? 18 : 5 }, (_, i) => ({
      id: `copy-${i}`,
      label: `Copy item ${i}`,
      type: 'custom' as const,
      onAction: () => setAction(`copy-${i}`),
    })),
    { id: 'delete', label: 'Delete', type: 'delete' },
  ];
  return (
    <>
      <div
        data-floe-surface-portal-layer={mode === 'projected' ? 'true' : undefined}
        style={{ position: 'relative', height: '100dvh', width: '100%' }}
      >
        <div
          data-floe-dialog-surface-host={
            mode === 'projected' || mode === 'scaled' ? 'true' : undefined
          }
          style={{
            position: 'absolute',
            inset: '40px 12px 100px',
            transform:
              mode === 'projected' || mode === 'scaled'
                ? 'translate(30px, 20px) scale(0.65)'
                : undefined,
          }}
        >
          <div
            ref={setBoundary}
            data-files
            style={{
              position: 'absolute',
              inset: '0',
              border: '1px solid gray',
              height: mode === 'short' ? '220px' : undefined,
            }}
          >
            <button
              ref={trigger}
              data-trigger
              style={{ position: 'absolute', right: '8px', bottom: '8px', height: '44px' }}
              onPointerDown={longPress.onPointerDown}
              onPointerMove={longPress.onPointerMove}
              onPointerUp={longPress.onPointerUp}
              onPointerCancel={longPress.onPointerCancel}
              onClick={(event) => {
                if (!longPress.consumeClickSuppression(event)) setAction('open-file');
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                browser.showContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  items: [file],
                  targetKind: 'item',
                  source: 'grid',
                  directory: null,
                });
              }}
            >
              alpha.txt
            </button>
            <FileContextMenu
              boundary={boundary()}
              owner={trigger}
              overrideItems={items}
              callbacks={{ onDelete: () => setAction('delete') }}
            />
          </div>
        </div>
      </div>
      <footer
        data-bottom
        style={{
          position: 'fixed',
          bottom: '0',
          height: '80px',
          width: '100%',
          background: 'silver',
          'z-index': 2000,
        }}
      >
        Flower status
      </footer>
      <output data-action style={{ position: 'fixed', top: '0' }}>
        {action()}
      </output>
    </>
  );
}
render(
  () => (
    <FileBrowserProvider files={[file]} initialPath="/">
      <Fixture />
    </FileBrowserProvider>
  ),
  document.getElementById('root')!
);
