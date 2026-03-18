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
      class={cn(
        'pointer-events-none rounded-md relative',
        'border-2 border-dashed',
        props.isValid !== false ? 'border-info/50 bg-info/10' : 'border-error/50 bg-error/10',
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
