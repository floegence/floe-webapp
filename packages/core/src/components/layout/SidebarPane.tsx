import { Show, type JSX } from 'solid-js';
import { useLayout } from '../../context/LayoutContext';
import { cn } from '../../utils/cn';
import { ResizeHandle } from './ResizeHandle';

export interface SidebarPaneProps {
  children: JSX.Element;
  title?: JSX.Element;
  headerActions?: JSX.Element;
  width?: number;
  open?: boolean;
  resizable?: boolean;
  onResize?: (delta: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  onClose?: () => void;
  mobileOverlay?: boolean;
  mobileBackdrop?: boolean;
  ariaLabel?: string;
  class?: string;
  innerClass?: string;
  bodyClass?: string;
  backdropClass?: string;
  bodyRef?: (el: HTMLDivElement) => void;
}

export function SidebarPane(props: SidebarPaneProps) {
  const layout = useLayout();

  const isMobile = () => layout.isMobile();
  const width = () => props.width ?? 240;
  const open = () => props.open ?? true;
  const showMobileOverlay = () => isMobile() && props.mobileOverlay !== false && open();
  const showCloseButton = () => showMobileOverlay() && typeof props.onClose === 'function';
  const showBackdrop = () => showMobileOverlay() && props.mobileBackdrop !== false && typeof props.onClose === 'function';
  const showResizer = () => props.resizable && open() && !isMobile() && typeof props.onResize === 'function';

  return (
    <>
      <aside
        data-floe-geometry-surface="sidebar-pane"
        class={cn(
          'flex-shrink-0 border-r border-border bg-sidebar relative',
          'transition-[width,transform,box-shadow] duration-200 ease-out',
          'overflow-hidden',
          showMobileOverlay() && 'absolute inset-y-0 left-0 z-10 shadow-lg',
          props.class
        )}
        style={{ width: open() ? `${width()}px` : '0px' }}
        role={showMobileOverlay() ? 'dialog' : undefined}
        aria-modal={showMobileOverlay() ? 'true' : undefined}
        aria-label={props.ariaLabel}
      >
        <div
          class={cn('h-full flex flex-col', props.innerClass)}
          style={{ width: `${width()}px` }}
        >
          <div class="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{props.title}</span>
            <Show when={props.headerActions || showCloseButton()}>
              <div class="flex min-w-0 items-center gap-1.5">
                <Show when={props.headerActions}>
                  <div class="min-w-0 flex items-center gap-1.5">{props.headerActions}</div>
                </Show>
                <Show when={showCloseButton()}>
                  <button
                    type="button"
                    onClick={() => props.onClose?.()}
                    class="flex items-center justify-center w-5 h-5 rounded cursor-pointer hover:bg-sidebar-accent/80 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring focus-visible:ring-inset"
                    aria-label="Close sidebar"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="w-3.5 h-3.5"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </Show>
              </div>
            </Show>
          </div>

          <div
            ref={(el) => props.bodyRef?.(el)}
            class={cn('flex-1 min-h-0 overflow-auto', props.bodyClass)}
          >
            {props.children}
          </div>
        </div>

        <Show when={showResizer()}>
          <ResizeHandle
            direction="horizontal"
            onResize={(delta) => props.onResize?.(delta)}
            onResizeStart={props.onResizeStart}
            onResizeEnd={props.onResizeEnd}
          />
        </Show>
      </aside>

      <Show when={showBackdrop()}>
        <div
          class={cn('absolute inset-0 bg-background/60 backdrop-blur-sm z-[9]', props.backdropClass)}
          onClick={() => props.onClose?.()}
        />
      </Show>
    </>
  );
}
