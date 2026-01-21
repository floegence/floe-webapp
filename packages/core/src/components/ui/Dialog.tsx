import { Show, type JSX, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { X } from '../icons';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
}

/**
 * Modal dialog component
 */
export function Dialog(props: DialogProps) {
  // Close on escape
  createEffect(() => {
    if (!props.open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    onCleanup(() => document.removeEventListener('keydown', handleEscape));
  });

  // Prevent body scroll when open
  createEffect(() => {
    if (props.open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    onCleanup(() => {
      document.body.style.overflow = '';
    });
  });

  return (
    <Show when={props.open}>
      <Portal>
        {/* Backdrop */}
        <div
          class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => props.onOpenChange(false)}
        />

        {/* Dialog */}
        <div
          class={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg max-h-[85vh]',
            'bg-card text-card-foreground rounded-lg shadow-lg',
            'border border-border',
            'animate-in fade-in zoom-in-95',
            'flex flex-col',
            props.class
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title ? 'dialog-title' : undefined}
          aria-describedby={props.description ? 'dialog-description' : undefined}
        >
          {/* Header */}
          <Show when={props.title || props.description}>
            <div class="flex items-start justify-between p-4 border-b border-border">
              <div>
                <Show when={props.title}>
                  <h2 id="dialog-title" class="text-lg font-semibold">
                    {props.title}
                  </h2>
                </Show>
                <Show when={props.description}>
                  <p id="dialog-description" class="mt-1 text-sm text-muted-foreground">
                    {props.description}
                  </p>
                </Show>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 -mr-2"
                onClick={() => props.onOpenChange(false)}
                aria-label="Close"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
          </Show>

          {/* Content */}
          <div class="flex-1 overflow-auto p-4">{props.children}</div>

          {/* Footer */}
          <Show when={props.footer}>
            <div class="flex items-center justify-end gap-2 p-4 border-t border-border">
              {props.footer}
            </div>
          </Show>
        </div>
      </Portal>
    </Show>
  );
}

/**
 * Confirm dialog helper
 */
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>
            {props.cancelText ?? 'Cancel'}
          </Button>
          <Button
            variant={props.variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={props.onConfirm}
            loading={props.loading}
          >
            {props.confirmText ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <div />
    </Dialog>
  );
}
