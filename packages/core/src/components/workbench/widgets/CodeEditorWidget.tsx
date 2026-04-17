import { For } from 'solid-js';

interface Token {
  kind: 'keyword' | 'string' | 'fn' | 'number' | 'attr' | 'plain' | 'comment';
  text: string;
}

interface Line {
  tokens: Token[];
}

const LINES: ReadonlyArray<Line> = [
  {
    tokens: [
      { kind: 'comment', text: '// workbench counter demo' },
    ],
  },
  {
    tokens: [
      { kind: 'keyword', text: 'import' },
      { kind: 'plain', text: ' { createSignal } ' },
      { kind: 'keyword', text: 'from' },
      { kind: 'string', text: " 'solid-js'" },
      { kind: 'plain', text: ';' },
    ],
  },
  { tokens: [] },
  {
    tokens: [
      { kind: 'keyword', text: 'export function ' },
      { kind: 'fn', text: 'Counter' },
      { kind: 'plain', text: '() {' },
    ],
  },
  {
    tokens: [
      { kind: 'plain', text: '  ' },
      { kind: 'keyword', text: 'const' },
      { kind: 'plain', text: ' [count, setCount] = ' },
      { kind: 'fn', text: 'createSignal' },
      { kind: 'plain', text: '(' },
      { kind: 'number', text: '0' },
      { kind: 'plain', text: ');' },
    ],
  },
  { tokens: [] },
  {
    tokens: [
      { kind: 'plain', text: '  ' },
      { kind: 'keyword', text: 'return' },
      { kind: 'plain', text: ' (' },
    ],
  },
  {
    tokens: [
      { kind: 'plain', text: '    <button ' },
      { kind: 'attr', text: 'onClick' },
      { kind: 'plain', text: '={() => setCount(c => c + ' },
      { kind: 'number', text: '1' },
      { kind: 'plain', text: ')}>' },
    ],
  },
  { tokens: [{ kind: 'plain', text: '      Count: {count()}' }] },
  { tokens: [{ kind: 'plain', text: '    </button>' }] },
  { tokens: [{ kind: 'plain', text: '  );' }] },
  { tokens: [{ kind: 'plain', text: '}' }] },
];

const ACTIVE_LINE_INDEX = 4;

export function CodeEditorWidget() {
  return (
    <div class="workbench-widget-codeeditor">
      <div class="workbench-widget-codeeditor__gutter">
        <For each={LINES}>
          {(_, index) => (
            <span classList={{ 'is-active': index() === ACTIVE_LINE_INDEX }}>
              {index() + 1}
            </span>
          )}
        </For>
      </div>
      <div class="workbench-widget-codeeditor__code">
        <For each={LINES}>
          {(line, index) => (
            <div
              class="workbench-widget-codeeditor__line"
              classList={{ 'is-active': index() === ACTIVE_LINE_INDEX }}
            >
              <For each={line.tokens}>
                {(token) => (
                  <span class={`workbench-widget-codeeditor__${token.kind}`}>{token.text}</span>
                )}
              </For>
              {index() === ACTIVE_LINE_INDEX ? (
                <span class="workbench-widget-codeeditor__caret" aria-hidden="true" />
              ) : null}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
