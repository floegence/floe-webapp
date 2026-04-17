import { Motion } from 'solid-motionone';
import { duration, easing } from '../../utils/animations';
import { Lock, Unlock } from '../../icons';

export interface WorkbenchLockButtonProps {
  locked: boolean;
  onToggle: () => void;
  shortcutLabel?: string;
}

export function WorkbenchLockButton(props: WorkbenchLockButtonProps) {
  const label = () =>
    props.locked ? 'Unlock canvas' : 'Lock canvas';

  return (
    <button
      type="button"
      class="workbench-lock-button"
      classList={{ 'is-locked': props.locked }}
      aria-label={props.shortcutLabel ? `${label()} (${props.shortcutLabel})` : label()}
      aria-pressed={props.locked}
      data-floe-canvas-interactive="true"
      onClick={() => props.onToggle()}
    >
      <span class="workbench-lock-button__icon">
        <Motion.span
          class="workbench-lock-button__icon-swap"
          animate={{ rotate: props.locked ? 0 : -14 }}
          transition={{ duration: duration.fast, easing: easing.easeOut }}
        >
          {props.locked ? <Lock class="w-4 h-4" /> : <Unlock class="w-4 h-4" />}
        </Motion.span>
      </span>
      {props.shortcutLabel ? (
        <span class="workbench-lock-button__kbd">{props.shortcutLabel}</span>
      ) : null}
    </button>
  );
}
