import { createSignal, onMount, onCleanup } from 'solid-js';
import type { WidgetProps } from '../context/WidgetRegistry';
import { cn } from '../utils/cn';

/**
 * Sample metrics display widget
 */
export function MetricsWidget(props: WidgetProps) {

  // Simulated live metrics
  const [cpuUsage, setCpuUsage] = createSignal(Math.random() * 100);
  const [memoryUsage, setMemoryUsage] = createSignal(Math.random() * 100);
  const [networkIn, setNetworkIn] = createSignal(Math.random() * 1000);
  const [networkOut, setNetworkOut] = createSignal(Math.random() * 500);

  let interval: number | undefined;

  onMount(() => {
    if (props.isEditMode) return;

    interval = window.setInterval(() => {
      setCpuUsage((prev) => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 10)));
      setMemoryUsage((prev) => Math.max(0, Math.min(100, prev + (Math.random() - 0.5) * 5)));
      setNetworkIn(Math.random() * 1000);
      setNetworkOut(Math.random() * 500);
    }, 2000);
  });

  onCleanup(() => {
    if (interval) clearInterval(interval);
  });

  const getColorClass = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'text-destructive';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div class={cn('h-full p-3', props.isEditMode && 'pointer-events-none')}>
      <div class="grid grid-cols-2 gap-3 h-full">
        {/* CPU */}
        <MetricCard
          label="CPU"
          value={cpuUsage().toFixed(1)}
          unit="%"
          colorClass={getColorClass(cpuUsage(), { warning: 60, danger: 80 })}
        />

        {/* Memory */}
        <MetricCard
          label="Memory"
          value={memoryUsage().toFixed(1)}
          unit="%"
          colorClass={getColorClass(memoryUsage(), { warning: 70, danger: 90 })}
        />

        {/* Network In */}
        <MetricCard
          label="Network In"
          value={networkIn().toFixed(0)}
          unit="KB/s"
          colorClass="text-blue-500"
        />

        {/* Network Out */}
        <MetricCard
          label="Network Out"
          value={networkOut().toFixed(0)}
          unit="KB/s"
          colorClass="text-purple-500"
        />
      </div>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; unit: string; colorClass: string }) {
  return (
    <div class="bg-muted/30 rounded-md p-2 flex flex-col justify-center">
      <div class="text-xs text-muted-foreground mb-1">{props.label}</div>
      <div class="flex items-baseline gap-1">
        <span class={cn('text-lg font-semibold tabular-nums', props.colorClass)}>{props.value}</span>
        <span class="text-xs text-muted-foreground">{props.unit}</span>
      </div>
    </div>
  );
}
