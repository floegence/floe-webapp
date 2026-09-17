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

/** One panel owns both its compact row and its expanding material previews. */
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
  const [more, setMore] = createSignal(false);
  const panelId = createUniqueId();
  let root: HTMLDivElement | undefined;
  const close = () => {
    setOpen(false);
    setMore(false);
    props.onMoreClose?.();
  };
  const styleOpen = open;
  createEffect(() => {
    if (!open() && !more() && !props.moreOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', dismiss, true);
    onCleanup(() => document.removeEventListener('pointerdown', dismiss, true));
  });
  return (
    <div
      ref={root}
      class={`workbench-composition-toolbar workbench-${props.kind === 'sticky' ? 'sticky__actions' : props.kind === 'region' ? 'background-region__toolbar' : 'text-annotation__toolbar'}`}
      data-kind={props.kind}
      role="toolbar"
      aria-label={t('treatment')}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (open() || more() || props.moreOpen)) {
          event.stopPropagation();
          close();
          root?.querySelector<HTMLButtonElement>('.workbench-treatment-trigger')?.focus();
        }
      }}
    >
      <Show when={styleOpen() && props.materials}>
        <div id={panelId} class="workbench-treatment-panel">
          <div class="workbench-picker-heading">
            {t('treatment')}
            <Show when={props.more} fallback={<span>{t('treatmentHint')}</span>}>
              <button
                type="button"
                class="workbench-picker-more"
                aria-label={t('more')}
                title={t('more')}
                onClick={() => {
                  setMore(!more());
                }}
              >
                {t('treatmentHint')}
              </button>
            </Show>
          </div>
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
                  onClick={() => props.onMaterial?.(material)}
                >
                  {props.preview?.(material, true)}
                  <span class="workbench-treatment-label">
                    {t(material)}
                    <Check />
                  </span>
                  <small>{t(`${material}Description` as WorkbenchCompositionMessageKey)}</small>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
      <Show when={more() || props.moreOpen}>
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
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              setOpen(!styleOpen());
              setMore(false);
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
