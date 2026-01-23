import { For, Show, createMemo } from 'solid-js';
import { cn } from '../../utils/cn';
import { useFileBrowser } from './FileBrowserContext';
import { ChevronRight } from '../icons';

export interface BreadcrumbProps {
  class?: string;
}

interface BreadcrumbSegment {
  name: string;
  path: string;
}

/**
 * Breadcrumb navigation showing current path
 */
export function Breadcrumb(props: BreadcrumbProps) {
  const ctx = useFileBrowser();

  const segments = createMemo<BreadcrumbSegment[]>(() => {
    const path = ctx.currentPath();
    if (path === '/' || path === '') {
      return [{ name: 'Root', path: '/' }];
    }

    const parts = path.split('/').filter(Boolean);
    const result: BreadcrumbSegment[] = [{ name: 'Root', path: '/' }];

    let currentPath = '';
    for (const part of parts) {
      currentPath += '/' + part;
      result.push({ name: part, path: currentPath });
    }

    return result;
  });

  const handleClick = (segment: BreadcrumbSegment) => {
    ctx.setCurrentPath(segment.path);
  };

  return (
    <nav class={cn('flex items-center gap-1 min-w-0', props.class)} aria-label="Breadcrumb">
      <For each={segments()}>
        {(segment, index) => (
          <>
            <Show when={index() > 0}>
              <ChevronRight class="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            </Show>
            <BreadcrumbItem
              segment={segment}
              isLast={index() === segments().length - 1}
              onClick={() => handleClick(segment)}
            />
          </>
        )}
      </For>
    </nav>
  );
}

interface BreadcrumbItemProps {
  segment: BreadcrumbSegment;
  isLast: boolean;
  onClick: () => void;
}

function BreadcrumbItem(props: BreadcrumbItemProps) {
  return (
    <button
      type="button"
      onClick={() => props.onClick()}
      disabled={props.isLast}
      class={cn(
        'text-xs px-1.5 py-0.5 rounded cursor-pointer',
        'transition-all duration-100',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        props.isLast
          ? 'font-medium text-foreground cursor-default'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <span class="truncate max-w-[120px] block">{props.segment.name}</span>
    </button>
  );
}
