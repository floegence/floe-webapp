import { For } from 'solid-js';
import { FileBrowser, FileItemIcon, type FileItem } from '@floegence/floe-webapp-core/file-browser';
import { Button, Input, SegmentedControl } from '@floegence/floe-webapp-core/ui';

const items: FileItem[] = [
  'src',
  'settings.json',
  'config.yaml',
  'Cargo.toml',
  'Main.swift',
  'Cover.psd',
  'Proposal.docx',
  'Budget.xlsx',
  'Pitch.pptx',
  'Report.wps',
  'Data.et',
  'Slides.dps',
  'App.dmg',
  'App.deb',
  'main.py',
  'index.ts',
  'app.js',
  'photo.png',
  'movie.mp4',
  'song.mp3',
  'archive.zip',
  'styles.css',
].map((name, index) => ({
  id: name,
  name,
  path: `/${name}`,
  type: index === 0 ? 'folder' : 'file',
  extension: name.split('.').at(-1),
  ...(index === 0 ? { children: [] } : {}),
}));

export function FileAppearanceStudy() {
  return (
    <div class="acceptance-page" data-file-study>
      <div class="controls">
        <Button variant="outline">Refresh files</Button>
        <Input aria-label="Filter files" placeholder="Filter files" />
        <SegmentedControl
          value="list"
          onChange={() => undefined}
          options={[
            { value: 'list', label: 'List' },
            { value: 'grid', label: 'Grid' },
          ]}
        />
      </div>
      <div
        style={{
          display: 'grid',
          'grid-template-columns': 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '20px',
          padding: '24px 0',
        }}
      >
        <For each={items}>
          {(item) => (
            <div
              data-file-sample={item.name}
              style={{
                display: 'flex',
                'align-items': 'center',
                'flex-direction': 'column',
                gap: '12px',
              }}
            >
              <FileItemIcon item={item} size={40} class="w-10 h-10" />
              <span>{item.name}</span>
              <div style={{ display: 'flex', gap: '12px', 'align-items': 'center' }}>
                <FileItemIcon item={item} size={16} />
                <FileItemIcon item={item} size={20} />
              </div>
            </div>
          )}
        </For>
      </div>
      <div style={{ height: '520px' }}>
        <FileBrowser files={items} initialPath="/" initialViewMode="grid" />
      </div>
    </div>
  );
}
