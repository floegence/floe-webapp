import { createSignal, For } from 'solid-js';
import type { WidgetProps } from '../context/WidgetRegistry';
import { cn } from '../utils/cn';

interface TerminalLine {
  id: number;
  type: 'input' | 'output' | 'error';
  content: string;
}

/**
 * Terminal widget
 */
export function TerminalWidget(props: WidgetProps) {
  const [lines, setLines] = createSignal<TerminalLine[]>([
    { id: 1, type: 'output', content: 'Welcome to Floe Terminal' },
    { id: 2, type: 'output', content: 'Type "help" for available commands' },
    { id: 3, type: 'input', content: '$ ' },
  ]);
  const [inputValue, setInputValue] = createSignal('');
  let inputRef: HTMLInputElement | undefined;
  let nextId = 4;

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const value = inputValue().trim();
    if (!value) return;

    const newLines: TerminalLine[] = [
      { id: nextId++, type: 'input', content: `$ ${value}` },
    ];

    // Simple command handling
    if (value === 'help') {
      newLines.push({ id: nextId++, type: 'output', content: 'Available commands: help, clear, date, echo <text>' });
    } else if (value === 'clear') {
      setLines([{ id: nextId++, type: 'input', content: '$ ' }]);
      setInputValue('');
      return;
    } else if (value === 'date') {
      newLines.push({ id: nextId++, type: 'output', content: new Date().toString() });
    } else if (value.startsWith('echo ')) {
      newLines.push({ id: nextId++, type: 'output', content: value.slice(5) });
    } else {
      newLines.push({ id: nextId++, type: 'error', content: `Command not found: ${value}` });
    }

    newLines.push({ id: nextId++, type: 'input', content: '$ ' });

    setLines((prev) => [...prev.slice(0, -1), ...newLines]);
    setInputValue('');
  };

  const focusInput = () => {
    inputRef?.focus();
  };

  return (
    <div
      class={cn(
        'h-full bg-zinc-900 text-zinc-100 font-mono text-xs overflow-hidden flex flex-col',
        props.isEditMode && 'pointer-events-none'
      )}
      onClick={focusInput}
    >
      {/* Terminal content */}
      <div class="flex-1 overflow-y-auto p-2">
        <For each={lines().slice(0, -1)}>
          {(line) => (
            <div
              class={cn(
                'whitespace-pre-wrap break-all',
                line.type === 'error' && 'text-red-400',
                line.type === 'input' && 'text-green-400'
              )}
            >
              {line.content}
            </div>
          )}
        </For>

        {/* Input line */}
        <div class="flex items-center">
          <span class="text-green-400">$ </span>
          <form onSubmit={handleSubmit} class="flex-1">
            <input
              ref={inputRef}
              type="text"
              class="w-full bg-transparent outline-none text-zinc-100"
              value={inputValue()}
              onInput={(e) => setInputValue(e.currentTarget.value)}
              disabled={props.isEditMode}
            />
          </form>
        </div>
      </div>
    </div>
  );
}
