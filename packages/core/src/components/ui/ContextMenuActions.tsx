import { useResizeObserver } from '../../hooks/useResizeObserver';
import {
  createContext,
  createMemo,
  createSignal,
  For,
  Show,
  onCleanup,
  onMount,
  useContext,
  type JSX,
} from 'solid-js';
import { SurfaceFloatingLayer } from './SurfaceFloatingLayer';
import { handleMenuKeyboardNavigation } from './menuUtils';

export interface ContextMenuRequest {
  target: HTMLElement;
  x: number;
  y: number;
  selection: string;
}
export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: () => JSX.Element;
  onSelect: () => void;
  disabled?: boolean;
}
export type ContextMenuActionRequest = {
  origin: ContextMenuRequest;
  actions: readonly ContextMenuAction[];
};
const ActionsContext = createContext<{
  claim: () => ContextMenuActionRequest | undefined;
  resolve: (request: ContextMenuRequest) => readonly ContextMenuAction[];
}>();
/** Explicit adapter boundary for editors and model-owned menus. */
export const useContextMenuActions = () => useContext(ActionsContext);

/** Composite icons must never determine the menu's intrinsic size. */
export function ContextMenuActionIcon(props: { icon?: () => JSX.Element; class?: string }) {
  return (
    <Show when={props.icon}>
      {(icon) => (
        <span class={`floe-context-action-icon ${props.class ?? ''}`} aria-hidden="true">
          {icon()()}
        </span>
      )}
    </Show>
  );
}

/** One document owner. Capture before focus changes; local menus retain priority. */
export function ContextMenuActions(props: {
  label: string;
  actions: (request: ContextMenuRequest) => readonly ContextMenuAction[];
  enabled?: boolean;
  zIndex?: number;
  /** Only the fallback menu changes scope; contributed local menus keep their owner. */
  portalScope?: 'surface' | 'viewport';
  editing?: { labels: ContextMenuEditingLabels; onError: (error: unknown) => void };
  children: JSX.Element;
}) {
  let pending: ContextMenuActionRequest | undefined;
  let pendingEvent: Event | undefined;
  let pendingFallback: ContextMenuActionRequest | undefined;
  const cleanupTimers = new Set<ReturnType<typeof setTimeout>>();
  const [fallback, setFallback] = createSignal<ContextMenuActionRequest>();
  const claim = () => {
    const request = pending;
    pending = undefined;
    pendingEvent = undefined;
    pendingFallback = undefined;
    return request;
  };
  const capture = (event: MouseEvent | KeyboardEvent) => {
    if (props.enabled === false || event.defaultPrevented) return;
    if (
      event instanceof KeyboardEvent &&
      event.key !== 'ContextMenu' &&
      !(event.shiftKey && event.key === 'F10')
    )
      return;
    const target = event.composedPath().find((node) => node instanceof HTMLElement) as
      HTMLElement | undefined;
    if (
      !target ||
      target.closest('[inert], [hidden], [role="menu"], [data-floe-context-menu-native]')
    )
      return;
    const rect = target.getBoundingClientRect();
    const pointer = event instanceof MouseEvent && (event.clientX !== 0 || event.clientY !== 0);
    const selection =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        ? target instanceof HTMLInputElement && target.type === 'password'
          ? ''
          : target.value.slice(target.selectionStart ?? 0, target.selectionEnd ?? 0)
        : (() => {
            const selected = document.getSelection();
            return selected?.rangeCount && selected.getRangeAt(0).intersectsNode(target)
              ? selected.toString()
              : '';
          })();
    const origin = {
      target,
      x: pointer ? event.clientX : rect.left + 8,
      y: pointer ? event.clientY : rect.bottom,
      selection,
    };
    const actions = props.actions(origin);
    const request = { origin, actions };
    const fallbackRequest = {
      origin,
      actions: [
        ...actions,
        ...(props.editing
          ? editingActions(origin, props.editing.labels, props.editing.onError)
          : []),
      ],
    };
    if (!request.actions.length) return;
    pending = request;
    pendingEvent = event;
    pendingFallback = fallbackRequest;
    // Native event dispatch may run microtasks between listeners. Keep the
    // snapshot through the whole dispatch, including Solid delegated handlers.
    const timer = setTimeout(() => {
      if (pending === request) {
        pending = undefined;
        pendingEvent = undefined;
        pendingFallback = undefined;
      }
      cleanupTimers.delete(timer);
    }, 0);
    cleanupTimers.add(timer);
  };
  // Browser defaults must be cancelled synchronously, after local handlers.
  const finish = (event: Event) => {
    if (pending && pendingEvent === event && !event.defaultPrevented) {
      event.preventDefault();
      setFallback(pendingFallback);
      claim();
    }
  };
  onMount(() => {
    document.addEventListener('contextmenu', capture, true);
    document.addEventListener('keydown', capture, true);
    window.addEventListener('contextmenu', finish);
    window.addEventListener('keydown', finish);
    onCleanup(() => {
      cleanupTimers.forEach(clearTimeout);
      pending = undefined;
      pendingEvent = undefined;
      pendingFallback = undefined;
      document.removeEventListener('contextmenu', capture, true);
      document.removeEventListener('keydown', capture, true);
      window.removeEventListener('contextmenu', finish);
      window.removeEventListener('keydown', finish);
    });
  });
  return (
    <ActionsContext.Provider
      value={{
        claim,
        resolve: (request) => (props.enabled === false ? [] : props.actions(request)),
      }}
    >
      {props.children}
      <Show when={fallback()} keyed>
        {(request) => (
          <FallbackMenu
            request={request}
            label={props.label}
            zIndex={props.zIndex}
            portalScope={props.portalScope}
            onClose={() => setFallback(undefined)}
          />
        )}
      </Show>
    </ActionsContext.Provider>
  );
}

/** Place inside a local context menu. The local menu still owns focus and dismissal. */
export function ContextMenuActionItems(props: {
  onClose: () => void;
  excludeIds?: readonly string[];
  itemClass?: string;
}) {
  const request = useContext(ActionsContext)?.claim();
  const actions = () =>
    request?.actions.filter((action) => !props.excludeIds?.includes(action.id)) ?? [];
  return (
    <For each={actions()}>
      {(action) => (
        <button
          type="button"
          role="menuitem"
          class={props.itemClass ?? 'floe-context-action'}
          data-context-action-id={action.id}
          disabled={action.disabled}
          onClick={() => {
            props.onClose();
            action.onSelect();
          }}
        >
          <ContextMenuActionIcon icon={action.icon} />
          <span>{action.label}</span>
        </button>
      )}
    </For>
  );
}

function FallbackMenu(props: {
  request: ContextMenuActionRequest;
  label: string;
  zIndex?: number;
  portalScope?: 'surface' | 'viewport';
  onClose: () => void;
}) {
  let menu!: HTMLDivElement;
  const measured = useResizeObserver(() => menu);
  const menuSize = createMemo(() => {
    if (!measured() || !menu) return { width: 208, height: 8 + props.request.actions.length * 30 };
    const rect = menu.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const close = (restore = false) => {
    props.onClose();
    if (restore && props.request.origin.target.isConnected)
      props.request.origin.target.focus({ preventScroll: true });
  };
  onMount(() => {
    menu
      .querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')
      ?.focus({ preventScroll: true });
    const outside = (event: Event) => {
      if (event.target instanceof Node && !menu.contains(event.target)) close();
    };
    const scroll = (event: Event) => {
      // Only scrolling the source's ancestry invalidates its frozen anchor.
      // Independent panes may keep streaming or animating while a menu is open.
      if (event.target instanceof Node && event.target.contains(props.request.origin.target))
        close();
    };
    const blur = () => close();
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside, true);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', blur);
    window.addEventListener('blur', blur);
    onCleanup(() => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside, true);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', blur);
      window.removeEventListener('blur', blur);
    });
  });
  return (
    <SurfaceFloatingLayer
      owner={props.request.origin.target}
      portalScope={props.portalScope}
      position={props.request.origin}
      estimatedSize={menuSize()}
      role="menu"
      aria-label={props.label}
      layerRef={(element) => {
        menu = element;
      }}
      class="floe-context-actions"
      style={{ 'z-index': props.zIndex }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) =>
        handleMenuKeyboardNavigation(event, {
          onActivate: (item) => item.click(),
          onDismiss: () => close(true),
          preventDefaultOnTab: true,
        })
      }
    >
      <For each={props.request.actions}>
        {(action) => (
          <button
            type="button"
            role="menuitem"
            class="floe-context-action"
            data-context-action-id={action.id}
            disabled={action.disabled}
            onClick={() => {
              close();
              action.onSelect();
            }}
          >
            <ContextMenuActionIcon icon={action.icon} />
            <span>{action.label}</span>
          </button>
        )}
      </For>
    </SurfaceFloatingLayer>
  );
}

export type ContextMenuEditingLabels = Readonly<
  Record<'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll' | 'openLink' | 'copyLink', string>
>;
/** Frozen native selection, with editing performed only after explicit menu selection. */
function editingActions(
  request: ContextMenuRequest,
  labels: ContextMenuEditingLabels,
  onError: (error: unknown) => void
): ContextMenuAction[] {
  const field = request.target.closest(
    'input, textarea, [contenteditable]:not([contenteditable="false"])'
  ) as HTMLElement | null;
  const input =
    field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement ? field : null;
  const range = document.getSelection()?.rangeCount
    ? document.getSelection()!.getRangeAt(0).cloneRange()
    : undefined;
  const start = input?.selectionStart;
  const end = input?.selectionEnd;
  const restore = () => {
    field?.focus({ preventScroll: true });
    if (input && start != null && end != null) input.setSelectionRange(start, end);
    else if (range) {
      const selection = document.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };
  const run = (action: () => void | Promise<void>) => () => {
    try {
      Promise.resolve(action()).catch(onError);
    } catch (error) {
      onError(error);
    }
  };
  const command = (id: 'undo' | 'redo' | 'cut' | 'paste' | 'selectAll'): ContextMenuAction => ({
    id: `edit.${id}`,
    label: labels[id],
    onSelect: run(async () => {
      restore();
      if (id === 'selectAll' && input) {
        input.select();
        return;
      }
      if (document.execCommand(id)) return;
      if (id !== 'paste') return;
      const text = await navigator.clipboard.readText();
      if (!field?.isConnected) return;
      restore();
      if (!document.execCommand('insertText', false, text))
        throw new Error('Clipboard insertion is unavailable.');
    }),
  });
  const actions: ContextMenuAction[] = [];
  if (field) actions.push(command('undo'), command('redo'), command('cut'));
  if (request.selection)
    actions.push({
      id: 'edit.copy',
      label: labels.copy,
      onSelect: run(() => navigator.clipboard.writeText(request.selection)),
    });
  if (field) actions.push(command('paste'), command('selectAll'));
  const link = request.target.closest<HTMLAnchorElement>('a[href]');
  if (link && ['http:', 'https:', 'mailto:'].includes(link.protocol)) {
    const url = link.href;
    actions.push({
      id: 'link.open',
      label: labels.openLink,
      onSelect: () => window.open(url, '_blank', 'noopener,noreferrer'),
    });
    actions.push({
      id: 'link.copy',
      label: labels.copyLink,
      onSelect: run(() => navigator.clipboard.writeText(url)),
    });
  }
  return actions;
}
