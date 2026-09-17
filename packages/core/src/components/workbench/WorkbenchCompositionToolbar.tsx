import {
  For,
  Show,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  type JSX,
} from 'solid-js';
import { Check, ChevronDown } from '../../icons';
import { resolveSurfacePortalHost } from '../ui/surfacePortalScope';
import { resolveFloatingBoundary } from '../ui/surfaceFloatingBoundary';
import { LOCAL_INTERACTION_SURFACE_ATTR } from '../ui/localInteractionSurface';
import {
  useWorkbenchCompositionText,
  type WorkbenchCompositionMessageKey,
} from './workbenchCompositionMessages';

export function CompositionIcon(props: {
  name: 'edit' | 'text' | 'left' | 'center' | 'copy' | 'trash';
}) {
  const paths = {
    edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z',
    copy: 'M16 8V4H4v12h4',
    trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    text: 'M4 5h16M12 5v15M8 20h8M4 5v3m16-3v3',
    left: 'M4 5h16M4 10h11M4 15h16M4 20h11',
    center: 'M4 5h16M7 10h10M4 15h16M7 20h10',
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.65"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <Show when={props.name === 'copy'}>
        <rect x="8" y="8" width="12" height="12" rx="2" />
      </Show>
      <path d={paths[props.name]} />
    </svg>
  );
}

export function CompositionDivider() {
  return <span class="workbench-composition-divider" aria-hidden="true" />;
}

/** Object tools keep their anchor when a material menu opens. */
export function CompositionToolbar(props: {
  kind: 'sticky' | 'region' | 'text';
  children: JSX.Element;
  palette?: JSX.Element;
  materials?: readonly WorkbenchCompositionMessageKey[];
  material?: WorkbenchCompositionMessageKey;
  preview?: (material: WorkbenchCompositionMessageKey, large: boolean) => JSX.Element;
  onMaterial?: (material: WorkbenchCompositionMessageKey) => void;
  materialLabel?: (material: WorkbenchCompositionMessageKey) => string;
  more?: JSX.Element;
  onMoreClose?: () => void;
  moreOpen?: boolean;
}) {
  const t = useWorkbenchCompositionText();
  const [open, setOpen] = createSignal(false);
  const [materialPanel, setMaterialPanel] = createSignal<HTMLDivElement>();
  const [menuPosition, setMenuPosition] = createSignal<{ x: number; y: number }>();
  const panelId = createUniqueId();
  let root: HTMLDivElement | undefined;
  let focusMaterialOnOpen = false;
  const close = () => {
    setOpen(false);
    props.onMoreClose?.();
  };
  const styleOpen = open;
  createEffect(() => {
    const panel = materialPanel();
    if (!open() || !panel || !root) {
      setMenuPosition(undefined);
      return;
    }
    const bounds = resolveFloatingBoundary(resolveSurfacePortalHost({ owner: root }));
    const trigger = root.querySelector('.workbench-treatment-trigger');
    if (!bounds || !trigger) return;
    // The menu is out of flow and hidden until this first measurement is committed.
    // Its size never feeds back into the object toolbar's placement calculation.
    const anchor = trigger.getBoundingClientRect();
    const parent = root.getBoundingClientRect();
    panel.style.maxHeight = `${Math.max(0, bounds.bottom - bounds.top - 24)}px`;
    const size = panel.getBoundingClientRect();
    const above = anchor.top - size.height - 10;
    const y = Math.max(
      bounds.top + 12,
      above >= bounds.top + 12
        ? above
        : Math.min(anchor.bottom + 10, bounds.bottom - size.height - 12)
    );
    const x = Math.max(bounds.left + 12, Math.min(anchor.left, bounds.right - size.width - 12));
    setMenuPosition({ x: x - parent.left, y: y - parent.top });
    if (focusMaterialOnOpen) {
      focusMaterialOnOpen = false;
      queueMicrotask(() => {
        if (panel.isConnected) {
          panel
            .querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
            ?.focus({ preventScroll: true });
        }
      });
    }
  });
  createEffect(() => {
    if (!open() && !props.moreOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', dismiss, true);
    onCleanup(() => document.removeEventListener('pointerdown', dismiss, true));
    if (props.materials) {
      const dismissOnWheel = (event: WheelEvent) => {
        if (event.target instanceof Node && !root?.contains(event.target)) close();
      };
      window.addEventListener('resize', close);
      document.addEventListener('wheel', dismissOnWheel, { capture: true, passive: true });
      onCleanup(() => {
        window.removeEventListener('resize', close);
        document.removeEventListener('wheel', dismissOnWheel, true);
      });
    }
  });
  return (
    <div
      ref={root}
      class={`workbench-composition-toolbar workbench-${props.kind === 'sticky' ? 'sticky__actions' : props.kind === 'region' ? 'background-region__toolbar' : 'text-annotation__toolbar'}`}
      data-kind={props.kind}
      {...{ [LOCAL_INTERACTION_SURFACE_ATTR]: 'true' }}
      role="toolbar"
      aria-label={t('treatment')}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (open() || props.moreOpen)) {
          event.stopPropagation();
          close();
          root
            ?.querySelector<HTMLButtonElement>('.workbench-treatment-trigger')
            ?.focus({ preventScroll: true });
        }
      }}
    >
      <Show when={styleOpen() && props.materials}>
        <div
          ref={setMaterialPanel}
          id={panelId}
          class="workbench-treatment-panel"
          onKeyDown={(event) => {
            if (
              !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) ||
              !(event.target instanceof Element) ||
              !event.target.closest('.workbench-treatment-options')
            )
              return;
            event.preventDefault();
            event.stopPropagation();
            const options = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '.workbench-treatment-options > button'
              )
            );
            const current = options.indexOf(document.activeElement as HTMLButtonElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? options.length - 1
                  : (current + (event.key === 'ArrowUp' ? -1 : 1) + options.length) %
                    options.length;
            options[next]?.focus({ preventScroll: true });
          }}
          style={{
            left: `${menuPosition()?.x ?? 0}px`,
            top: `${menuPosition()?.y ?? 0}px`,
            visibility: menuPosition() ? 'visible' : 'hidden',
          }}
        >
          <div
            class="workbench-treatment-options"
            role="group"
            aria-label={t(props.kind === 'region' ? 'regionMaterial' : 'stickyMaterial')}
          >
            <For each={props.materials}>
              {(material) => (
                <button
                  type="button"
                  aria-label={props.materialLabel?.(material)}
                  aria-pressed={props.material === material}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => {
                    props.onMaterial?.(material);
                    setOpen(false);
                    root
                      ?.querySelector<HTMLButtonElement>('.workbench-treatment-trigger')
                      ?.focus({ preventScroll: true });
                  }}
                >
                  {props.preview?.(material, true)}
                  <span class="workbench-treatment-label">
                    {t(material)}
                    <Check />
                  </span>
                </button>
              )}
            </For>
          </div>
          <Show when={props.more}>
            <div class="workbench-material-settings">{props.more}</div>
          </Show>
        </div>
      </Show>
      <Show when={!props.materials && props.moreOpen}>
        <div class="workbench-composition-more">{props.more}</div>
      </Show>
      <div class="workbench-toolbar-main">
        {props.palette}
        <Show when={props.material}>
          <CompositionDivider />
          <button
            type="button"
            class="workbench-treatment-trigger"
            aria-label={t('treatment')}
            aria-expanded={!!styleOpen()}
            aria-controls={panelId}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown') return;
              event.preventDefault();
              event.stopPropagation();
              if (open())
                materialPanel()
                  ?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
                  ?.focus({ preventScroll: true });
              else {
                focusMaterialOnOpen = true;
                setOpen(true);
              }
            }}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(!styleOpen());
            }}
          >
            {props.preview?.(props.material!, false)}
            <span>{t(props.material!)}</span>
            <ChevronDown />
          </button>
          <CompositionDivider />
        </Show>
        {props.children}
      </div>
    </div>
  );
}
