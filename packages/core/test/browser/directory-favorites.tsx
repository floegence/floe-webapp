import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { DirectoryPicker } from '../../src/components/ui/DirectoryPicker';
import { DirectoryInput } from '../../src/components/ui/DirectoryInput';
import { FileOpenPicker } from '../../src/components/ui/FileOpenPicker';
import { FileSavePicker } from '../../src/components/ui/FileSavePicker';
import { DialogPlacementProvider } from '../../src/components/ui/DialogPlacementContext';
import '../../src/styles/globals.css';
function Fixture() {
  const [open, setOpen] = createSignal(false);
  const [fileOpen, setFileOpen] = createSignal(false);
  const [saveOpen, setSaveOpen] = createSignal(false);
  const [paths, setPaths] = createSignal<readonly string[]>(['/srv/alpha', '/srv/beta']);
  const [pending, setPending] = createSignal<readonly string[]>([]);
  const [selected, setSelected] = createSignal('');
  const [scale, setScale] = createSignal('1');
  const favorites = {
    get paths() { return paths(); }, editable: true,
    get pendingPaths() { return pending(); }, onRefresh: async () => {},
    onSetFavorite: async (path: string, favorite: boolean) => {
      setPending([path]); await new Promise(resolve => setTimeout(resolve, 250));
      setPaths(current => favorite ? [path, ...current.filter(item => item !== path)] : current.filter(item => item !== path)); setPending([]);
    },
  };
  const props = {
    directoryFavorites: favorites,
    loadPathContext: async () => ({ homePathAbs: '/home/alice', defaultRootId: 'home', roots: [
      { id: 'home', label: 'Home', pathAbs: '/home/alice' }, { id: 'root', label: 'Root', pathAbs: '/' },
    ] }),
    loadDirectory: async (path: string) => {
      if (path === '/srv/missing') throw new Error('Directory not found');
      return [{ id: path + '/child', name: 'child', type: 'folder' as const, path: path + '/child' },
        { id: path + '/report.txt', name: 'report.txt', type: 'file' as const, path: path + '/report.txt' }];
    },
  };
  return <main class="min-h-screen bg-background p-4 text-foreground">
    <div class="flex flex-wrap gap-4"><button onClick={() => setOpen(true)}>Choose directory</button><button onClick={() => setFileOpen(true)}>Open files</button><button onClick={() => setSaveOpen(true)}>Save file</button>
      <label>Scale<select value={scale()} onChange={event => setScale(event.currentTarget.value)}><option>1</option><option>0.65</option><option>1.3</option></select></label></div>
    <output data-selected>{selected()}</output>
    <DirectoryPicker {...props} open={open()} onOpenChange={setOpen} title="Working directory" confirmText="Choose" suggestedPaths={Array.from({ length: 10 }, (_, index) => '/srv/recent-' + index)} suggestedPathsLabel="Recently used" onSelect={setSelected} />
    <FileOpenPicker {...props} open={fileOpen()} onOpenChange={setFileOpen} selectionMode="multiple" maxSelections={2} onSelect={paths => setSelected(paths.join(','))} />
    <FileSavePicker {...props} open={saveOpen()} onOpenChange={setSaveOpen} initialFileName="draft.txt" onSave={(dir, name) => setSelected(dir + '/' + name)} />
    <div class="relative mt-8 h-[600px]" data-floe-surface-portal-layer="true"><div data-floe-dialog-surface-host="true" class="relative w-[480px] max-w-full border p-3" style={{ transform: 'scale(' + scale() + ')', 'transform-origin': 'top left' }}>
      <DialogPlacementProvider mode="surface"><DirectoryInput {...props} value="/home/alice" /></DialogPlacementProvider>
    </div></div>
  </main>;
}
render(() => <Fixture />, document.getElementById('root')!);
