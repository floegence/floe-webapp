import { For, type Component } from 'solid-js';
import { cn } from '../../utils/cn';

export const NOTES_CONTEXT_MENU_WIDTH_PX = 188;

const NOTES_CONTEXT_MENU_VERTICAL_PADDING_PX = 16;
const NOTES_CONTEXT_MENU_ACTION_HEIGHT_PX = 32;
const NOTES_CONTEXT_MENU_SEPARATOR_HEIGHT_PX = 9;

type NotesContextMenuActionItem = Readonly<{
  id: string;
  kind: 'action';
  label: string;
  icon: Component<{ class?: string }>;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}>;

type NotesContextMenuSeparatorItem = Readonly<{
  id: string;
  kind: 'separator';
}>;

export type NotesContextMenuItem = NotesContextMenuActionItem | NotesContextMenuSeparatorItem;

export interface NotesContextMenuProps {
  x: number;
  y: number;
  items: readonly NotesContextMenuItem[];
  menuRef?: (el: HTMLDivElement) => void;
}

function isActionItem(item: NotesContextMenuItem): item is NotesContextMenuActionItem {
  return item.kind === 'action';
}

export function estimateNotesContextMenuHeight(actionCount: number, separatorCount = 0): number {
  return NOTES_CONTEXT_MENU_VERTICAL_PADDING_PX
    + Math.max(1, actionCount) * NOTES_CONTEXT_MENU_ACTION_HEIGHT_PX
    + Math.max(0, separatorCount) * NOTES_CONTEXT_MENU_SEPARATOR_HEIGHT_PX;
}

export function NotesContextMenu(props: NotesContextMenuProps) {
  return (
    <div
      ref={props.menuRef}
      role="menu"
      class="notes-context-menu notes-menu"
      style={{ left: `${props.x}px`, top: `${props.y}px` }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <For each={props.items}>
        {(item) => {
          if (!isActionItem(item)) {
            return <div role="separator" aria-orientation="horizontal" class="notes-context-menu__separator" />;
          }

          const Icon = item.icon;

          return (
            <button
              type="button"
              role="menuitem"
              class={cn('notes-context-menu__item notes-menu__item', item.destructive && 'is-destructive is-danger')}
              onClick={item.onSelect}
              disabled={item.disabled}
            >
              <Icon class="h-3.5 w-3.5" />
              <span class="notes-context-menu__label">{item.label}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
