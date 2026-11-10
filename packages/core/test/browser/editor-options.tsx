import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { CodeEditor } from '../../src/components/editor/CodeEditor';
import '../../src/styles/globals.css';

render(() => {
  const [readOnly, setReadOnly] = createSignal(false);
  const [value, setValue] = createSignal('initial');
  const [ready, setReady] = createSignal(false);
  return <ThemeProvider>
    <button id="permission" disabled={!ready()} aria-pressed={readOnly()} onClick={() => setReadOnly(!readOnly())}>Toggle read-only</button>
    <output id="value">{value()}</output>
    <CodeEditor path="options.txt" language="plaintext" value={value()} onChange={setValue}
      options={{ readOnly: readOnly() }} onReady={() => setReady(true)}
      style={{ height: '360px', width: 'calc(100vw - 32px)', margin: '16px' }} />
  </ThemeProvider>;
}, document.getElementById('root')!);
