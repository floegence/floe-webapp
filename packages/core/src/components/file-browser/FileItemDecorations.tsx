import { Show } from 'solid-js';
import { cn } from '../../utils/cn';
import type { FileItem, FileItemDecorationTone } from './types';

const DECORATION_TONES: FileItemDecorationTone[] = [
  'default',
  'primary',
  'info',
  'success',
  'warning',
  'error',
  'muted',
];

const BADGE_TONE_CLASSES: Record<FileItemDecorationTone, string> = {
  default: 'bg-foreground text-background',
  primary: 'bg-primary text-primary-foreground',
  info: 'bg-info text-info-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
  error: 'bg-error text-error-foreground',
  muted: 'bg-muted text-muted-foreground',
};

const NAME_TONE_CLASSES: Record<FileItemDecorationTone, string> = {
  default: '',
  primary: 'text-primary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  muted: 'text-muted-foreground',
};

type FileItemDecorationBadgeSize = 'xs' | 'sm' | 'md';

const BADGE_SIZE_CLASSES: Record<FileItemDecorationBadgeSize, string> = {
  xs: '-left-0.5 -top-0.5 h-2 min-w-2 px-[1px] text-[5px] ring-[0.5px]',
  sm: '-left-1 -top-1 h-3.5 min-w-3.5 px-[3px] text-[7px] ring-1 shadow-sm',
  md: '-left-1 -top-1 h-4 min-w-4 px-1 text-[8px] ring-1 shadow-sm',
};

function normalizeDecorationTone(tone: string | undefined): FileItemDecorationTone {
  const normalized = String(tone ?? '').trim();
  return DECORATION_TONES.includes(normalized as FileItemDecorationTone)
    ? normalized as FileItemDecorationTone
    : 'default';
}

function badgeLabel(item: FileItem): string {
  return String(item.decoration?.badge?.label ?? '').trim().slice(0, 2).toUpperCase();
}

export function fileItemDecorationNameClass(item: FileItem): string {
  const tone = normalizeDecorationTone(item.decoration?.nameTone);
  return NAME_TONE_CLASSES[tone];
}

export function FileItemDecorationBadge(props: { item: FileItem; size?: FileItemDecorationBadgeSize; class?: string }) {
  const label = () => badgeLabel(props.item);
  const tone = () => normalizeDecorationTone(props.item.decoration?.badge?.tone);
  const title = () => String(props.item.decoration?.badge?.title ?? '').trim() || undefined;
  const size = () => props.size ?? 'sm';

  return (
    <Show when={label()}>
      {(visibleLabel) => (
        <span
          aria-hidden="true"
          title={title()}
          data-file-browser-decoration-badge={tone()}
          class={cn(
            'pointer-events-none absolute z-10 inline-flex items-center justify-center rounded-full ring-background/90',
            'font-black leading-none',
            BADGE_SIZE_CLASSES[size()],
            BADGE_TONE_CLASSES[tone()],
            props.class,
          )}
        >
          {visibleLabel()}
        </span>
      )}
    </Show>
  );
}
