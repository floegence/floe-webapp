import { For } from 'solid-js';
import { FileBrowser, FileItemIcon, type FileItem } from '@floegence/floe-webapp-core/file-browser';
import { Button, Input, SegmentedControl } from '@floegence/floe-webapp-core/ui';

const items: FileItem[] = ['src', 'README.md', 'main.py', 'index.ts', 'app.js', 'photo.png', 'movie.mp4', 'song.mp3', 'archive.zip', 'styles.css'].map((name, index) => ({
  id: name, name, path: `/${name}`, type: index === 0 ? 'folder' : 'file',
  extension: name.split('.').at(-1), ...(index === 0 ? { children: [] } : {}),
}));

export function FileAppearanceStudy() {
  return <div class="acceptance-page" data-file-study>
    <div class="controls">
      <Button variant="outline">Refresh files</Button>
      <Input aria-label="Filter files" placeholder="Filter files" />
      <SegmentedControl value="list" onChange={() => undefined} options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} />
    </div>
    <div class="controls">
      <For each={items}>{(item) => <div data-file-sample={item.name} style={{ width: '90px', padding: '12px' }}><FileItemIcon item={item} class="w-8 h-8" /><span>{item.name}</span></div>}</For>
    </div>
    <div style={{ height: '520px' }}><FileBrowser files={items} initialPath="/" initialViewMode="grid" /></div>
  </div>;
}
