import { For, createSignal, onCleanup, onMount } from 'solid-js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogLine {
  id: number;
  ts: string;
  level: LogLevel;
  message: string;
}

const MESSAGE_POOL: ReadonlyArray<{ level: LogLevel; message: string }> = [
  { level: 'info', message: 'Request GET /api/health 200 (12ms)' },
  { level: 'info', message: 'WebSocket ping/pong cycle OK (lat=38ms)' },
  { level: 'info', message: 'Scheduled job "rotate-keys" completed' },
  { level: 'debug', message: 'Cache hit workbench:viewport -> fresh' },
  { level: 'warn', message: 'Slow query detected (234ms) on notes.topics' },
  { level: 'warn', message: 'Retry #2 for upstream call /v1/sync' },
  { level: 'error', message: 'Connection timeout on retry 3' },
  { level: 'info', message: 'Reconnected successfully after backoff' },
  { level: 'info', message: 'Applied migration 0042_user_schema' },
  { level: 'debug', message: 'GC pause 14ms (young)' },
];

const TICK_MS = 1100;
const MAX_LINES = 10;

function formatTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function LogViewerWidget() {
  const seed = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const pool = MESSAGE_POOL[(i * 3) % MESSAGE_POOL.length]!;
      const stamp = new Date(now.getTime() - (6 - i) * 4200);
      return {
        id: stamp.getTime() + i,
        ts: formatTime(stamp),
        level: pool.level,
        message: pool.message,
      } satisfies LogLine;
    });
  })();

  const [lines, setLines] = createSignal<LogLine[]>(seed);
  let counter = seed.length;
  let timer: number | undefined;

  const appendLine = () => {
    const pool = MESSAGE_POOL[counter % MESSAGE_POOL.length]!;
    counter += 1;
    setLines((prev) => {
      const next = [
        ...prev,
        {
          id: counter,
          ts: formatTime(new Date()),
          level: pool.level,
          message: pool.message,
        },
      ];
      return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
    });
  };

  onMount(() => {
    timer = window.setInterval(appendLine, TICK_MS);
  });

  onCleanup(() => {
    if (timer !== undefined) window.clearInterval(timer);
  });

  return (
    <div class="workbench-widget-logviewer">
      <div class="workbench-widget-logviewer__lines">
        <For each={lines()}>
          {(line) => (
            <div class="workbench-widget-logviewer__line">
              <span class="workbench-widget-logviewer__ts">{line.ts}</span>
              <span
                class={`workbench-widget-logviewer__level workbench-widget-logviewer__level--${line.level}`}
              >
                {line.level.toUpperCase()}
              </span>
              <span class="workbench-widget-logviewer__msg">{line.message}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
