import { For, createSignal, type Component } from 'solid-js';
import { ChevronDown, ChevronRight, FileCode, Folder, FolderOpen } from '../../../icons';

interface TreeNode {
  id: string;
  label: string;
  kind: 'folder' | 'file';
  children?: TreeNode[];
}

const TREE: TreeNode = {
  id: 'root',
  label: 'floe-webapp',
  kind: 'folder',
  children: [
    {
      id: 'src',
      label: 'src',
      kind: 'folder',
      children: [
        {
          id: 'components',
          label: 'components',
          kind: 'folder',
          children: [
            { id: 'app-tsx', label: 'App.tsx', kind: 'file' },
            { id: 'notes-tsx', label: 'NotesBoard.tsx', kind: 'file' },
            { id: 'workbench-tsx', label: 'WorkbenchOverlay.tsx', kind: 'file' },
          ],
        },
        {
          id: 'utils',
          label: 'utils',
          kind: 'folder',
          children: [
            { id: 'animations', label: 'animations.ts', kind: 'file' },
            { id: 'cn', label: 'cn.ts', kind: 'file' },
          ],
        },
        { id: 'index', label: 'index.ts', kind: 'file' },
      ],
    },
    {
      id: 'public',
      label: 'public',
      kind: 'folder',
      children: [{ id: 'logo', label: 'logo.svg', kind: 'file' }],
    },
    { id: 'pkgjson', label: 'package.json', kind: 'file' },
    { id: 'tsconfig', label: 'tsconfig.json', kind: 'file' },
  ],
};

interface RowProps {
  node: TreeNode;
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

const Row: Component<RowProps> = (props) => {
  const isFolder = () => props.node.kind === 'folder';
  const isOpen = () => props.expanded.has(props.node.id);

  return (
    <>
      <button
        type="button"
        class="workbench-widget-filebrowser__row"
        classList={{
          'is-folder': isFolder(),
          'is-open': isFolder() && isOpen(),
        }}
        style={{ 'padding-left': `${props.depth * 14 + 8}px` }}
        onClick={() => {
          if (isFolder()) props.onToggle(props.node.id);
        }}
      >
        {isFolder() ? (
          <span class="workbench-widget-filebrowser__chev">
            {isOpen() ? (
              <ChevronDown class="w-3 h-3" />
            ) : (
              <ChevronRight class="w-3 h-3" />
            )}
          </span>
        ) : (
          <span class="workbench-widget-filebrowser__chev" aria-hidden="true" />
        )}
        <span class="workbench-widget-filebrowser__icon">
          {isFolder() ? (
            isOpen() ? (
              <FolderOpen class="w-3.5 h-3.5" />
            ) : (
              <Folder class="w-3.5 h-3.5" />
            )
          ) : (
            <FileCode class="w-3.5 h-3.5" />
          )}
        </span>
        <span class="workbench-widget-filebrowser__name">{props.node.label}</span>
      </button>
      {isFolder() && isOpen() && props.node.children ? (
        <For each={props.node.children}>
          {(child) => (
            <Row
              node={child}
              depth={props.depth + 1}
              expanded={props.expanded}
              onToggle={props.onToggle}
            />
          )}
        </For>
      ) : null}
    </>
  );
};

export function FileBrowserWidget() {
  const [expanded, setExpanded] = createSignal<Set<string>>(
    new Set(['root', 'src', 'components'])
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div class="workbench-widget-filebrowser">
      <div class="workbench-widget-filebrowser__toolbar">
        <span class="workbench-widget-filebrowser__path">~/projects/floe-webapp</span>
      </div>
      <div class="workbench-widget-filebrowser__tree">
        <Row node={TREE} depth={0} expanded={expanded()} onToggle={toggle} />
      </div>
    </div>
  );
}
