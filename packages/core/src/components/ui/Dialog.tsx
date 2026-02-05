import { Show, createUniqueId, type JSX } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { X } from '../icons';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';
import { useOverlayMask } from '../../hooks/useOverlayMask';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dialog title - can be a string or JSX element for custom headers */
  title?: string | JSX.Element;
  description?: string;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
}

/**
 * Modal dialog component
 */
export function Dialog(props: DialogProps) {
  const baseId = createUniqueId();
  const titleId = () => `dialog-${baseId}-title`;
  const descriptionId = () => `dialog-${baseId}-description`;
  let dialogRef: HTMLDivElement | undefined;

  useOverlayMask({
    open: () => props.open,
    root: () => dialogRef,
    onClose: () => props.onOpenChange(false),
    lockBodyScroll: true,
    trapFocus: true,
    closeOnEscape: true,
    blockHotkeys: true,
    // Block scroll bleed outside the dialog while keeping the dialog content scrollable.
    blockWheel: 'outside',
    blockTouchMove: 'outside',
    restoreFocus: true,
  });

  return (
    <Show when={props.open}>
      <Portal>
        {/* Backdrop */}
        <div
          class="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in cursor-pointer"
          onClick={() => props.onOpenChange(false)}
        />

        {/* Dialog */}
        <div
          ref={dialogRef}
          class={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md max-h-[85vh]',
            'bg-card text-card-foreground rounded-md shadow-lg',
            'border border-border',
            'animate-in fade-in zoom-in-95',
            'flex flex-col',
            props.class
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title ? titleId() : undefined}
          aria-describedby={props.description ? descriptionId() : undefined}
          tabIndex={-1}
        >
          {/* Header */}
          <Show when={props.title || props.description}>
            <div class="flex items-start justify-between p-3 border-b border-border">
              <div>
                <Show when={props.title}>
                  <h2 id={titleId()} class="text-sm font-semibold">
                    {props.title}
                  </h2>
                </Show>
                <Show when={props.description}>
                  <p id={descriptionId()} class="mt-0.5 text-xs text-muted-foreground">
                    {props.description}
                  </p>
                </Show>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 -mr-1 bg-transparent text-muted-foreground hover:bg-red-500 hover:text-white"
                onClick={() => props.onOpenChange(false)}
                aria-label="Close"
              >
                <X class="w-3.5 h-3.5" />
              </Button>
            </div>
          </Show>

          {/* Content */}
          <div class="flex-1 overflow-auto overscroll-contain p-3">{props.children}</div>

          {/* Footer */}
          <Show when={props.footer}>
            <div class="flex items-center justify-end gap-2 p-3 border-t border-border">
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
  /** Description displayed under title (header area). Use children for content area. */
  description?: string;
  /** Custom content in the dialog body. If not provided, an empty placeholder is used. */
  children?: JSX.Element;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const floe = useResolvedFloeConfig();
  return (
    <Dialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.title}
      description={props.description}
      footer={
        <>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)} disabled={props.loading}>
            {props.cancelText ?? floe.config.strings.confirmDialog.cancel}
          </Button>
          <Button
            variant={props.variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={props.onConfirm}
            loading={props.loading}
          >
            {props.confirmText ?? floe.config.strings.confirmDialog.confirm}
          </Button>
        </>
      }
    >
      {props.children ?? <div />}
    </Dialog>
  );
}
