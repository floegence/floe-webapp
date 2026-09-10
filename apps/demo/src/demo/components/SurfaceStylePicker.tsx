import { useTheme } from '@floegence/floe-webapp-core';
import { Button } from '@floegence/floe-webapp-core/ui';

export const surfaceStyleCopy = {
  title: 'Surface style',
  standard: 'Standard',
  soft: 'Soft neumorphic',
  softCompact: 'Soft',
  description: 'Gentle depth on controls and workspace shells. Content stays clear and flat.',
};

export function SurfaceStylePicker(props: { compact?: boolean }) {
  const theme = useTheme();
  const isSoft = () => theme.surfaceStyle() === 'soft-neumorphic';
  return (
    <Button
      size="sm"
      variant="outline"
      class="shrink-0 whitespace-nowrap"
      aria-label={`${surfaceStyleCopy.title}: ${isSoft() ? surfaceStyleCopy.soft : surfaceStyleCopy.standard}`}
      aria-pressed={isSoft()}
      title={surfaceStyleCopy.description}
      onClick={() => theme.setSurfaceStyle(isSoft() ? 'standard' : 'soft-neumorphic')}
    >
      {!props.compact && <span>{surfaceStyleCopy.title}: </span>}
      {isSoft()
        ? props.compact
          ? surfaceStyleCopy.softCompact
          : surfaceStyleCopy.soft
        : surfaceStyleCopy.standard}
    </Button>
  );
}
