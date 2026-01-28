import { Show, createUniqueId, type JSX, createEffect, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { X } from '../icons';
import { lockBodyStyle } from '../../utils/bodyStyleLock';
import { useResolvedFloeConfig } from '../../context/FloeConfigContext';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: JSX.Element;
  footer?: JSX.Element;
  class?: string;
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(',');

  return Array.from(root.querySelectorAll(selector)).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

/**
 * Modal dialog component
 */
export function Dialog(props: DialogProps) {
  const baseId = createUniqueId();
  const titleId = () => `dialog-${baseId}-title`;
  const descriptionId = () => `dialog-${baseId}-description`;
  let dialogRef: HTMLDivElement | undefined;

  // Close on escape + basic focus management (trap within dialog while open).
  createEffect(() => {
    if (!props.open) return;
    if (typeof document === 'undefined') return;

    const prevActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusFirst = () => {
      const root = dialogRef;
      if (!root) return;

      const focusables = getFocusableElements(root);
      const target = focusables[0] ?? root;
      target.focus();
    };

    // Defer focus to ensure DOM nodes are mounted.
    setTimeout(focusFirst, 0);

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onOpenChange(false);
        return;
      }

      if (e.key !== 'Tab') return;

      const root = dialogRef;
      if (!root) return;

      const focusables = getFocusableElements(root);
      if (!focusables.length) {
        e.preventDefault();
        root.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      // Keep tabbing within the dialog.
      if (e.shiftKey) {
        if (active === first || !active || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeydown, true);
    onCleanup(() => document.removeEventListener('keydown', handleKeydown, true));
    onCleanup(() => prevActive?.focus());
  });

  // Prevent body scroll when open
  createEffect(() => {
    if (!props.open) return;
    const unlock = lockBodyStyle({ overflow: 'hidden' });
    onCleanup(unlock);
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
                class="h-6 w-6 -mr-1"
                onClick={() => props.onOpenChange(false)}
                aria-label="Close"
              >
                <X class="w-3.5 h-3.5" />
              </Button>
            </div>
          </Show>

          {/* Content */}
          <div class="flex-1 overflow-auto p-3">{props.children}</div>

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
