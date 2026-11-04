import { cn } from '../../utils/cn';
import { Tabs, type TabsProps } from './Tabs';

/** Compact document identity for a window header. Hosts own documents and close policy. */
export function WindowTabs(props: TabsProps) {
  return <Tabs
    {...props}
    size="sm"
    class={cn('h-full min-h-0 min-w-0 flex-1 pr-8 select-none', props.class)}
    features={{ containerBorder: false, indicator: { mode: 'none' }, ...props.features }}
    slotClassNames={{
      ...props.slotClassNames,
      scrollContainer: cn('min-w-0 !bg-transparent !border-0 !shadow-none', props.slotClassNames?.scrollContainer),
      tab: cn('h-6 min-w-0 max-w-full shrink-0 !text-xs !px-2', props.slotClassNames?.tab),
      closeButton: cn('!ml-0.5 !size-4', props.slotClassNames?.closeButton),
    }}
  />;
}
