import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { DirectoryPicker } from '../../src/components/ui/DirectoryPicker';
import '../../src/styles/globals.css';
function Fixture() {
  const [open, setOpen] = createSignal(false);
  const [selected, setSelected] = createSignal('');
  const [calls, setCalls] = createSignal(0);
  const paths = new Set<string>();
  const props = {
    pathContext: { homePathAbs: '/home/alice', defaultRootId: 'home', roots: [{ id: 'home', label: 'Home', pathAbs: '/home/alice' }, { id: 'root', label: 'Root', pathAbs: '/' }] },
    loadDirectory: async (path: string) => [...paths].filter(item => item.slice(0, item.lastIndexOf('/')) === path).map(item => ({ id: item, name: item.split('/').at(-1)!, path: item, type: 'folder' as const })),
    onCreateFolder: async (parent: string, name: string) => {
      setCalls(count => count + 1);
      await new Promise(resolve => setTimeout(resolve, 300));
      if (name === 'denied') throw new Error('Write permission denied');
      const path = (parent === '/' ? '' : parent) + '/' + name;
      if (paths.has(path)) throw new Error('Folder already exists');
      paths.add(path);
    },
  };
  return <main class="min-h-screen bg-background p-4 text-foreground"><button onClick={() => setOpen(true)}>Choose directory</button><output data-selected>{selected()}</output><output data-calls>{calls()}</output>
    <DirectoryPicker {...props} open={open()} onOpenChange={setOpen} title="Working directory" confirmText="Choose" onSelect={setSelected} />
  </main>;
}
render(() => <Fixture />, document.getElementById('root')!);
