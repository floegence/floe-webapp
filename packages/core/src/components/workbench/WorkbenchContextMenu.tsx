import { For, type Component } from 'solid-js';
import { cn } from '../../utils/cn';
import { WORKBENCH_CONTEXT_MENU_ATTR } from './workbenchContextMenuDismiss';

type WorkbenchContextMenuActionItem = Readonly<{
  id: string;
  kind: 'action';
  label: string;
  icon: Component<{ class?: string }>;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}>;

type WorkbenchContextMenuSeparatorItem = Readonly<{
  id: string;
  kind: 'separator';
}>;

export type WorkbenchContextMenuItem =
  | WorkbenchContextMenuActionItem
  | WorkbenchContextMenuSeparatorItem;

export interface WorkbenchContextMenuProps {
  x: number;
  y: number;
  items: readonly WorkbenchContextMenuItem[];
}

function isActionItem(item: WorkbenchContextMenuItem): item is WorkbenchContextMenuActionItem {
  return item.kind === 'action';
}

export function WorkbenchContextMenu(props: WorkbenchContextMenuProps) {
  return (
    <div
      role="menu"
      class="workbench-context-menu"
      data-floe-workbench-boundary="true"
      {...{ [WORKBENCH_CONTEXT_MENU_ATTR]: 'true' }}
      style={{ left: `${props.x}px`, top: `${props.y}px` }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <For each={props.items}>
        {(item) => {
          if (!isActionItem(item)) {
            return (
              <div
                role="separator"
                aria-orientation="horizontal"
                class="workbench-context-menu__separator"
              />
            );
          }

          const Icon = item.icon;

          return (
            <button
              type="button"
              role="menuitem"
              class={cn(
                'workbench-context-menu__item',
                item.destructive && 'is-destructive'
              )}
              onClick={item.onSelect}
              disabled={item.disabled}
            >
              <span class="workbench-context-menu__icon" aria-hidden="true">
                <Icon class="workbench-context-menu__icon-svg" />
              </span>
              <span class="workbench-context-menu__label">{item.label}</span>
            </button>
          );
        }}
      </For>
    </div>
  );
}
