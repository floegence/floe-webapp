import { createSignal, Show } from 'solid-js';
import { render } from 'solid-js/web';
import { FloeConfigProvider } from '../../src/context/FloeConfigContext';
import {
  FileBrowserProvider,
  useFileBrowser,
} from '../../src/components/file-browser/FileBrowserContext';
import { FileListView } from '../../src/components/file-browser/FileListView';
import { FileGridView } from '../../src/components/file-browser/FileGridView';
import { FileBrowserStatusBar } from '../../src/components/file-browser/FileBrowserStatusBar';
import type { FileItem } from '../../src/components/file-browser/types';
import '../../src/styles/globals.css';

const [initializing, setInitializing] = createSignal(true);
const [files, setFiles] = createSignal<FileItem[]>([]);
const mode = new URLSearchParams(location.search).get('mode');
function Fixture() {
  const browser = useFileBrowser();
  browser.setListColumnRatios({ name: 0.5, modifiedAt: 0.3, size: 0.2 });
  Object.assign(window, {
    fileLoading: {
      complete(empty = false) {
        setFiles(
          empty
            ? []
            : Array.from({ length: 12 }, (_, i) => ({
                id: String(i),
                name: `file-${String(i).padStart(2, '0')}.txt`,
                path: `/file-${i}.txt`,
                type: 'file' as const,
                modifiedAt: new Date(0),
                size: 2048,
              }))
        );
        setInitializing(false);
      },
    },
  });
  return (
    <div data-files class="flex h-full flex-col">
      <div class="min-h-0 flex-1">
        <Show when={mode === 'list'} fallback={<FileGridView initializing={initializing()} />}>
          <FileListView initializing={initializing()} />
        </Show>
      </div>
      <FileBrowserStatusBar initializing={initializing()} />
    </div>
  );
}
render(
  () => (
    <FloeConfigProvider config={{ storage: { enabled: false } }}>
      <div style={{ height: '600px', padding: '16px' }}>
        <FileBrowserProvider files={files()} initialPath="/">
          <Fixture />
        </FileBrowserProvider>
      </div>
    </FloeConfigProvider>
  ),
  document.getElementById('root')!
);
