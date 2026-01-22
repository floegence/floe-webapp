import { cn } from '../../utils/cn';
import { positionToGridArea } from '../../utils/gridLayout';
import type { GridPosition } from '../../utils/gridCollision';

export interface DropZonePreviewProps {
  position: GridPosition;
  isValid?: boolean;
}

/**
 * Visual preview showing where a widget will be dropped
 * Uses theme-adaptive colors: darker in light mode, lighter in dark mode
 */
export function DropZonePreview(props: DropZonePreviewProps) {
  const gridArea = () => positionToGridArea(props.position);

  return (
    <div
      class={cn(
        'pointer-events-none rounded-md relative',
        'border-2 border-dashed',
        // Theme-adaptive colors
        props.isValid !== false
          ? [
              // Light mode: darker colors for contrast
              'border-slate-400 bg-slate-200/60',
              // Dark mode: lighter colors for contrast
              'dark:border-slate-400 dark:bg-slate-600/40',
            ]
          : [
              'border-red-400 bg-red-200/60',
              'dark:border-red-400 dark:bg-red-500/30',
            ],
        // Theme-adaptive shadow
        'shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
        'dark:shadow-[0_4px_16px_rgba(255,255,255,0.08)]',
        // Subtle animation
        'animate-in fade-in duration-150'
      )}
      style={{ 'grid-area': gridArea() }}
    >
      {/* Inner gradient for depth */}
      <div
        class={cn(
          'absolute inset-0 rounded-md',
          props.isValid !== false
            ? [
                // Light mode: subtle dark gradient
                'bg-gradient-to-br from-slate-300/40 via-transparent to-slate-400/20',
                // Dark mode: subtle light gradient
                'dark:from-slate-400/20 dark:via-transparent dark:to-slate-300/10',
              ]
            : [
                'bg-gradient-to-br from-red-300/40 via-transparent to-red-400/20',
                'dark:from-red-400/20 dark:via-transparent dark:to-red-300/10',
              ]
        )}
      />
    </div>
  );
}
