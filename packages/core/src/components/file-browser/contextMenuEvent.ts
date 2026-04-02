import type {
  ContextMenuDirectory,
  ContextMenuEvent,
  ContextMenuSource,
  FileItem,
} from './types';

type ItemContextMenuSource = Extract<ContextMenuSource, 'list' | 'grid' | 'tree'>;

function resolveDirectoryScope(triggerItem: FileItem, items: FileItem[]): ContextMenuDirectory | null {
  if (items.length !== 1 || triggerItem.type !== 'folder') return null;
  if (items[0]?.path !== triggerItem.path) return null;
  return {
    path: triggerItem.path,
    item: triggerItem,
  };
}

export function createItemContextMenuEvent(params: {
  x: number;
  y: number;
  triggerItem: FileItem;
  items: FileItem[];
  source: ItemContextMenuSource;
}): ContextMenuEvent {
  return {
    x: params.x,
    y: params.y,
    items: params.items,
    targetKind: 'item',
    source: params.source,
    directory: resolveDirectoryScope(params.triggerItem, params.items),
  };
}
