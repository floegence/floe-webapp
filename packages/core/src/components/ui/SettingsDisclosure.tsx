import { Show, createMemo, createRenderEffect, createUniqueId, type JSX } from 'solid-js';
import { ChevronRight } from '../icons';
import { cn } from '../../utils/cn';
import { createControllableValue } from './controllable';
import { SettingsList } from './Settings';

export interface SettingsDisclosureProps {
  title: string;
  description?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  hidden?: boolean;
  class?: string;
  children: JSX.Element;
}

/** A retained settings group. Hosts still own draft and portalled-control authority. */
export function SettingsDisclosure(props: SettingsDisclosureProps) {
  const id = createUniqueId();
  const [open, setOpen] = createControllableValue({
    value: () => props.open,
    defaultValue: props.defaultOpen ?? false,
    onChange: (next) => props.onOpenChange?.(next),
  });
  // Mount expensive settings only after first use, then retain their owner/draft.
  const visited = createMemo((previous) => previous || open(), false);
  let trigger: HTMLButtonElement | undefined;
  let panel: HTMLDivElement | undefined;
  createRenderEffect(() => {
    if (!open() && panel?.contains(document.activeElement) && trigger?.getClientRects().length) {
      trigger.focus({ preventScroll: true });
    }
  });
  return (
    <SettingsList class={cn('floe-settings-disclosure', props.class)} hidden={props.hidden}
      data-open={open()}>
      <button ref={trigger} id={`${id}-trigger`} type="button" class="floe-settings-disclosure__trigger"
        aria-labelledby={`${id}-title`} aria-expanded={open()} aria-controls={`${id}-panel`} aria-describedby={props.description ? `${id}-description` : undefined}
        disabled={props.disabled} onClick={() => setOpen(!open())}>
        <span class="floe-settings-disclosure__heading"><span id={`${id}-title`}>{props.title}</span>
          <Show when={props.description}><span id={`${id}-description`} class="floe-settings-disclosure__description">{props.description}</span></Show>
        </span>
        <ChevronRight class="floe-settings-disclosure__chevron" aria-hidden="true" />
      </button>
      <div ref={panel} id={`${id}-panel`} class="floe-settings-disclosure__panel"
        aria-labelledby={`${id}-trigger`} aria-hidden={!open()} inert={!open()}>
        <div class="floe-settings-disclosure__clip"><Show when={visited()}>
          <div class="floe-settings-disclosure__content">{props.children}</div>
        </Show></div>
      </div>
    </SettingsList>
  );
}
