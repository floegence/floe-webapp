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
  const accentVariable = () => props.isValid !== false ? '--info' : '--error';

  return (
    <div
      data-floe-deck-drop-preview="true"
      class={cn(
        'pointer-events-none rounded-md relative z-20',
        'border-2 border-dashed',
        props.isValid !== false ? 'border-info/60 bg-info/10 ring-1 ring-inset ring-info/25' : 'border-error/60 bg-error/10 ring-1 ring-inset ring-error/25',
        // Subtle animation
        'animate-in fade-in duration-150'
      )}
      style={{
        'grid-area': gridArea(),
        'box-shadow': `0 4px 16px color-mix(in srgb, var(${accentVariable()}) 18%, transparent)`,
      }}
    >
      {/* Inner gradient for depth */}
      <div
        class="absolute inset-0 rounded-md"
        style={{
          background: `linear-gradient(
            135deg,
            color-mix(in srgb, var(${accentVariable()}) 18%, transparent) 0%,
            transparent 55%,
            color-mix(in srgb, var(${accentVariable()}) 10%, var(--card)) 100%
          )`,
        }}
      />
    </div>
  );
}
