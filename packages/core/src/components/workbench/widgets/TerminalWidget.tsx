import { For, createSignal, onCleanup, onMount } from 'solid-js';

interface TerminalLine {
  id: string;
  kind: 'prompt' | 'output' | 'muted';
  text: string;
}

const SCRIPT: ReadonlyArray<{ prompt: string; outputs: readonly string[] }> = [
  {
    prompt: 'pnpm dev',
    outputs: [
      'VITE v7.3.2 ready in 342 ms',
      '➜  Local:   http://localhost:5173/',
      '➜  Network: http://192.168.1.12:5173/',
    ],
  },
  {
    prompt: 'git status',
    outputs: [
      'On branch feat-workbench',
      'Changes not staged for commit:',
      '  modified:   apps/demo/src/App.tsx',
    ],
  },
  {
    prompt: 'curl -s https://api.floe.dev/health | jq .status',
    outputs: ['"ok"'],
  },
];

const TYPE_INTERVAL_MS = 42;
const OUTPUT_INTERVAL_MS = 160;
const PAUSE_BETWEEN_COMMANDS_MS = 1400;

export function TerminalWidget() {
  const [lines, setLines] = createSignal<TerminalLine[]>([]);
  const [typing, setTyping] = createSignal<string>('');
  let cycleIndex = 0;
  let charIndex = 0;
  let timer: number | undefined;
  let cancelled = false;

  const runScript = () => {
    if (cancelled) return;
    const entry = SCRIPT[cycleIndex % SCRIPT.length]!;
    charIndex = 0;
    setTyping('');

    const typeNext = () => {
      if (cancelled) return;
      charIndex += 1;
      setTyping(entry.prompt.slice(0, charIndex));
      if (charIndex < entry.prompt.length) {
        timer = window.setTimeout(typeNext, TYPE_INTERVAL_MS);
      } else {
        timer = window.setTimeout(pushOutputs, OUTPUT_INTERVAL_MS);
      }
    };

    const pushOutputs = () => {
      if (cancelled) return;
      setLines((prev) => [
        ...prev.slice(-6),
        { id: `${Date.now()}-prompt`, kind: 'prompt', text: entry.prompt },
      ]);
      setTyping('');

      let i = 0;
      const nextOutput = () => {
        if (cancelled) return;
        if (i >= entry.outputs.length) {
          cycleIndex += 1;
          timer = window.setTimeout(runScript, PAUSE_BETWEEN_COMMANDS_MS);
          return;
        }
        const text = entry.outputs[i]!;
        setLines((prev) => [
          ...prev.slice(-6),
          { id: `${Date.now()}-${i}`, kind: 'muted', text },
        ]);
        i += 1;
        timer = window.setTimeout(nextOutput, OUTPUT_INTERVAL_MS);
      };
      nextOutput();
    };

    typeNext();
  };

  onMount(() => {
    timer = window.setTimeout(runScript, 300);
  });

  onCleanup(() => {
    cancelled = true;
    if (timer !== undefined) window.clearTimeout(timer);
  });

  return (
    <div class="workbench-widget-terminal">
      <div class="workbench-widget-terminal__toolbar">
        <span class="workbench-widget-terminal__dot workbench-widget-terminal__dot--red" />
        <span class="workbench-widget-terminal__dot workbench-widget-terminal__dot--yellow" />
        <span class="workbench-widget-terminal__dot workbench-widget-terminal__dot--green" />
        <span class="workbench-widget-terminal__path">~/projects/floe-webapp</span>
      </div>
      <div class="workbench-widget-terminal__body">
        <For each={lines()}>
          {(line) => (
            <div
              class="workbench-widget-terminal__line"
              classList={{ 'workbench-widget-terminal__line--muted': line.kind === 'muted' }}
            >
              {line.kind === 'prompt' ? (
                <span class="workbench-widget-terminal__prompt">$</span>
              ) : null}
              <span>{line.text}</span>
            </div>
          )}
        </For>
        <div class="workbench-widget-terminal__line">
          <span class="workbench-widget-terminal__prompt">$</span>
          <span>{typing()}</span>
          <span class="workbench-widget-terminal__cursor" />
        </div>
      </div>
    </div>
  );
}
