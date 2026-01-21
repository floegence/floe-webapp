import { Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { SnakeLoader } from './SnakeLoader';

export interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullscreen?: boolean;
  class?: string;
}

/**
 * Full screen or container loading overlay
 */
export function LoadingOverlay(props: LoadingOverlayProps) {
  const content = (
    <div
      class={cn(
        'flex flex-col items-center justify-center gap-4',
        'bg-background/80 backdrop-blur-sm',
        props.fullscreen ? 'fixed inset-0 z-50' : 'absolute inset-0',
        'animate-in fade-in',
        props.class
      )}
    >
      <SnakeLoader size="lg" />
      <Show when={props.message}>
        <p class="text-sm text-muted-foreground">{props.message}</p>
      </Show>
    </div>
  );

  return (
    <Show when={props.visible}>
      <Show when={props.fullscreen} fallback={content}>
        <Portal>{content}</Portal>
      </Show>
    </Show>
  );
}
