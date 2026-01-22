import { Show, type JSX, createSignal, createEffect, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { X, Maximize, Restore } from '../icons';

export interface FloatingWindowProps {
  /** Whether the window is open */
  open: boolean;
  /** Callback when window open state changes */
  onOpenChange: (open: boolean) => void;
  /** Window title */
  title?: string;
  /** Window content */
  children: JSX.Element;
  /** Optional footer content */
  footer?: JSX.Element;
  /** Default position (centered if not provided) */
  defaultPosition?: { x: number; y: number };
  /** Default size */
  defaultSize?: { width: number; height: number };
  /** Minimum window size */
  minSize?: { width: number; height: number };
  /** Maximum window size */
  maxSize?: { width: number; height: number };
  /** Whether the window can be resized */
  resizable?: boolean;
  /** Whether the window can be dragged */
  draggable?: boolean;
  /** Additional CSS class */
  class?: string;
  /** z-index for the window */
  zIndex?: number;
}

// 拖拽手柄位置类型
type ResizeHandle =
  | 'n'
  | 's'
  | 'e'
  | 'w'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw';

/**
 * Floating window component with drag, resize, maximize/restore functionality
 */
export function FloatingWindow(props: FloatingWindowProps) {
  const resizable = () => props.resizable ?? true;
  const draggable = () => props.draggable ?? true;
  const minSize = () => props.minSize ?? { width: 200, height: 150 };
  const maxSize = () => props.maxSize ?? { width: Infinity, height: Infinity };
  const zIndex = () => props.zIndex ?? 100;

  // 窗口状态
  const [position, setPosition] = createSignal(
    props.defaultPosition ?? { x: 0, y: 0 }
  );
  const [size, setSize] = createSignal(
    props.defaultSize ?? { width: 400, height: 300 }
  );
  const [isMaximized, setIsMaximized] = createSignal(false);
  const [isDragging, setIsDragging] = createSignal(false);
  const [isResizing, setIsResizing] = createSignal(false);

  // 保存最大化前的状态
  const [preMaximizeState, setPreMaximizeState] = createSignal<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  // 拖拽状态
  let dragStartPos = { x: 0, y: 0 };
  let dragStartWindowPos = { x: 0, y: 0 };

  // 调整大小状态
  let resizeStartPos = { x: 0, y: 0 };
  let resizeStartSize = { width: 0, height: 0 };
  let resizeStartWindowPos = { x: 0, y: 0 };
  let resizeHandle: ResizeHandle = 'se';

  // 初始化窗口位置（居中）
  onMount(() => {
    if (!props.defaultPosition) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const currentSize = size();
      setPosition({
        x: Math.max(0, (windowWidth - currentSize.width) / 2),
        y: Math.max(0, (windowHeight - currentSize.height) / 2),
      });
    }
  });

  // Escape 键关闭窗口
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

  // 拖拽处理
  const handleDragStart = (e: MouseEvent) => {
    if (!draggable() || isMaximized()) return;
    e.preventDefault();

    setIsDragging(true);
    dragStartPos = { x: e.clientX, y: e.clientY };
    dragStartWindowPos = { ...position() };

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging()) return;

    const deltaX = e.clientX - dragStartPos.x;
    const deltaY = e.clientY - dragStartPos.y;

    const newX = Math.max(0, Math.min(window.innerWidth - size().width, dragStartWindowPos.x + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - size().height, dragStartWindowPos.y + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  // 调整大小处理
  // eslint-disable-next-line solid/reactivity -- This returns an event handler
  const handleResizeStart = (handle: ResizeHandle) => (e: MouseEvent) => {
    if (!resizable() || isMaximized()) return;
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    resizeHandle = handle;
    resizeStartPos = { x: e.clientX, y: e.clientY };
    resizeStartSize = { ...size() };
    resizeStartWindowPos = { ...position() };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing()) return;

    const deltaX = e.clientX - resizeStartPos.x;
    const deltaY = e.clientY - resizeStartPos.y;

    let newWidth = resizeStartSize.width;
    let newHeight = resizeStartSize.height;
    let newX = resizeStartWindowPos.x;
    let newY = resizeStartWindowPos.y;

    // 根据拖拽手柄方向计算新的尺寸和位置
    if (resizeHandle.includes('e')) {
      newWidth = Math.max(minSize().width, Math.min(maxSize().width, resizeStartSize.width + deltaX));
    }
    if (resizeHandle.includes('w')) {
      const possibleWidth = resizeStartSize.width - deltaX;
      if (possibleWidth >= minSize().width && possibleWidth <= maxSize().width) {
        newWidth = possibleWidth;
        newX = resizeStartWindowPos.x + deltaX;
      }
    }
    if (resizeHandle.includes('s')) {
      newHeight = Math.max(minSize().height, Math.min(maxSize().height, resizeStartSize.height + deltaY));
    }
    if (resizeHandle.includes('n')) {
      const possibleHeight = resizeStartSize.height - deltaY;
      if (possibleHeight >= minSize().height && possibleHeight <= maxSize().height) {
        newHeight = possibleHeight;
        newY = resizeStartWindowPos.y + deltaY;
      }
    }

    // 确保窗口不超出视口
    newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
    newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));

    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: newX, y: newY });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // 最大化/还原
  const toggleMaximize = () => {
    if (isMaximized()) {
      // 还原
      const prevState = preMaximizeState();
      if (prevState) {
        setPosition(prevState.position);
        setSize(prevState.size);
      }
      setIsMaximized(false);
    } else {
      // 最大化
      setPreMaximizeState({
        position: position(),
        size: size(),
      });
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

  // 双击标题栏最大化/还原
  const handleTitleBarDoubleClick = () => {
    toggleMaximize();
  };

  // 获取调整大小手柄的样式
  const getResizeHandleClass = (handle: ResizeHandle) => {
    const baseClass = 'absolute z-10';
    const cursorMap: Record<ResizeHandle, string> = {
      n: 'cursor-ns-resize top-0 left-2 right-2 h-1',
      s: 'cursor-ns-resize bottom-0 left-2 right-2 h-1',
      e: 'cursor-ew-resize right-0 top-2 bottom-2 w-1',
      w: 'cursor-ew-resize left-0 top-2 bottom-2 w-1',
      ne: 'cursor-nesw-resize top-0 right-0 w-2 h-2',
      nw: 'cursor-nwse-resize top-0 left-0 w-2 h-2',
      se: 'cursor-nwse-resize bottom-0 right-0 w-2 h-2',
      sw: 'cursor-nesw-resize bottom-0 left-0 w-2 h-2',
    };
    return cn(baseClass, cursorMap[handle]);
  };

  return (
    <Show when={props.open}>
      <Portal>
        {/* Window container */}
        <div
          class={cn(
            'fixed bg-card text-card-foreground rounded-md shadow-xl',
            'border border-border',
            'flex flex-col',
            'animate-in fade-in zoom-in-95',
            isMaximized() && 'rounded-none',
            (isDragging() || isResizing()) && 'select-none',
            props.class
          )}
          style={{
            left: `${position().x}px`,
            top: `${position().y}px`,
            width: `${size().width}px`,
            height: `${size().height}px`,
            'z-index': zIndex(),
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title ? 'floating-window-title' : undefined}
        >
          {/* Title bar */}
          <div
            class={cn(
              'flex items-center justify-between h-9 px-3',
              'border-b border-border',
              'bg-muted/50',
              isMaximized() ? 'rounded-none' : 'rounded-t-md',
              draggable() && !isMaximized() && 'cursor-move'
            )}
            onMouseDown={handleDragStart}
            onDblClick={handleTitleBarDoubleClick}
          >
            {/* Title */}
            <div class="flex-1 min-w-0">
              <Show when={props.title}>
                <h2
                  id="floating-window-title"
                  class="text-sm font-medium truncate select-none"
                >
                  {props.title}
                </h2>
              </Show>
            </div>

            {/* Window controls */}
            <div class="flex items-center gap-0.5 -mr-1">
              {/* Maximize/Restore button */}
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  toggleMaximize();
                }}
                aria-label={isMaximized() ? 'Restore' : 'Maximize'}
              >
                <Show when={isMaximized()} fallback={<Maximize class="w-3 h-3" />}>
                  <Restore class="w-3 h-3" />
                </Show>
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 hover:bg-error hover:text-error-foreground"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation();
                  props.onOpenChange(false);
                }}
                aria-label="Close"
              >
                <X class="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-auto p-3">{props.children}</div>

          {/* Footer */}
          <Show when={props.footer}>
            <div class="flex items-center justify-end gap-2 p-3 border-t border-border">
              {props.footer}
            </div>
          </Show>

          {/* Resize handles */}
          <Show when={resizable() && !isMaximized()}>
            {/* Edge handles */}
            <div class={getResizeHandleClass('n')} onMouseDown={handleResizeStart('n')} />
            <div class={getResizeHandleClass('s')} onMouseDown={handleResizeStart('s')} />
            <div class={getResizeHandleClass('e')} onMouseDown={handleResizeStart('e')} />
            <div class={getResizeHandleClass('w')} onMouseDown={handleResizeStart('w')} />

            {/* Corner handles */}
            <div class={getResizeHandleClass('ne')} onMouseDown={handleResizeStart('ne')} />
            <div class={getResizeHandleClass('nw')} onMouseDown={handleResizeStart('nw')} />
            <div class={getResizeHandleClass('se')} onMouseDown={handleResizeStart('se')} />
            <div class={getResizeHandleClass('sw')} onMouseDown={handleResizeStart('sw')} />
          </Show>
        </div>
      </Portal>
    </Show>
  );
}
