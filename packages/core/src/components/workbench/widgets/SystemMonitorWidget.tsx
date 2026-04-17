import { For, createSignal, onCleanup, onMount, type Component } from 'solid-js';
import { Activity, Cpu, Database } from '../../../icons';

interface Metric {
  value: number;
  history: number[];
}

const HISTORY_LEN = 28;
const TICK_MS = 900;

function nudge(current: number, min: number, max: number, volatility: number): number {
  const delta = (Math.random() - 0.5) * volatility;
  return Math.min(max, Math.max(min, current + delta));
}

export function SystemMonitorWidget() {
  const seedCpu = () => Array.from({ length: HISTORY_LEN }, () => 30 + Math.random() * 30);
  const seedMem = () => Array.from({ length: HISTORY_LEN }, () => 55 + Math.random() * 18);
  const seedDisk = () => Array.from({ length: HISTORY_LEN }, () => 25 + Math.random() * 10);

  const [cpu, setCpu] = createSignal<Metric>({ value: 42, history: seedCpu() });
  const [mem, setMem] = createSignal<Metric>({ value: 67, history: seedMem() });
  const [disk, setDisk] = createSignal<Metric>({ value: 31, history: seedDisk() });

  let timer: number | undefined;

  const tick = () => {
    setCpu((prev) => {
      const value = nudge(prev.value, 12, 92, 14);
      return { value, history: [...prev.history.slice(1), value] };
    });
    setMem((prev) => {
      const value = nudge(prev.value, 42, 88, 5);
      return { value, history: [...prev.history.slice(1), value] };
    });
    setDisk((prev) => {
      const value = nudge(prev.value, 18, 64, 2.4);
      return { value, history: [...prev.history.slice(1), value] };
    });
  };

  onMount(() => {
    timer = window.setInterval(tick, TICK_MS);
  });

  onCleanup(() => {
    if (timer !== undefined) window.clearInterval(timer);
  });

  const rows: ReadonlyArray<{
    key: 'cpu' | 'memory' | 'disk';
    label: string;
    icon: Component<{ class?: string }>;
    metric: () => Metric;
  }> = [
    { key: 'cpu', label: 'CPU', icon: Cpu, metric: cpu },
    { key: 'memory', label: 'Memory', icon: Activity, metric: mem },
    { key: 'disk', label: 'Disk', icon: Database, metric: disk },
  ];

  return (
    <div class="workbench-widget-sysmon">
      <For each={rows}>
        {(row) => {
          const Icon = row.icon;
          return (
            <div class="workbench-widget-sysmon__row">
              <div class="workbench-widget-sysmon__label">
                <Icon class="w-3.5 h-3.5" />
                <span>{row.label}</span>
              </div>
              <Sparkline points={row.metric().history} variant={row.key} />
              <div class="workbench-widget-sysmon__bar">
                <div
                  class={`workbench-widget-sysmon__fill workbench-widget-sysmon__fill--${row.key}`}
                  style={{ width: `${row.metric().value.toFixed(1)}%` }}
                />
              </div>
              <span class="workbench-widget-sysmon__value">{Math.round(row.metric().value)}%</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}

interface SparklineProps {
  points: readonly number[];
  variant: 'cpu' | 'memory' | 'disk';
}

function Sparkline(props: SparklineProps) {
  const width = 72;
  const height = 22;
  const path = () => {
    const pts = props.points;
    if (pts.length === 0) return '';
    const step = width / Math.max(1, pts.length - 1);
    return pts
      .map((v, i) => {
        const x = i * step;
        const y = height - (v / 100) * height;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };
  return (
    <svg
      class={`workbench-widget-sysmon__spark workbench-widget-sysmon__spark--${props.variant}`}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={path()} fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
    </svg>
  );
}
