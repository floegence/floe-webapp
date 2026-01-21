import { For, type Accessor } from 'solid-js';
import { SidebarSection, SidebarItem, Files } from '@floegence/floe-webapp-core';
import type { DemoFile } from '../workspace';

export interface FileExplorerProps {
  files: DemoFile[];
  activeFileId: Accessor<string>;
  onSelectFile: (id: string) => void;
}

function fileName(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

export function FileExplorer(props: FileExplorerProps) {
  const demoFiles = () => props.files.filter((f) => f.path.startsWith('apps/demo/'));
  const docsFiles = () => props.files.filter((f) => f.path.startsWith('docs/') || f.path === 'README.md');
  const coreFiles = () => props.files.filter((f) => f.path.startsWith('packages/core/'));
  const protocolFiles = () => props.files.filter((f) => f.path.startsWith('packages/protocol/'));

  const render = (files: DemoFile[]) => (
    <For each={files}>
      {(file) => (
        <SidebarItem
          icon={<Files class="w-4 h-4" />}
          active={props.activeFileId() === file.id}
          onClick={() => props.onSelectFile(file.id)}
        >
          {fileName(file.path)}
        </SidebarItem>
      )}
    </For>
  );

  return (
    <div>
      <SidebarSection title="Demo">{render(demoFiles())}</SidebarSection>
      <SidebarSection title="Docs">{render(docsFiles())}</SidebarSection>
      <SidebarSection title="Core">{render(coreFiles())}</SidebarSection>
      <SidebarSection title="Protocol">{render(protocolFiles())}</SidebarSection>
    </div>
  );
}

