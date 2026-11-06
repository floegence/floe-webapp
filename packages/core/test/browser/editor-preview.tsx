import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { CodeEditor } from '../../src/components/editor/CodeEditor';
import { RetainedPanel } from '../../src/components/ui/RetainedPanel';
import '../../src/styles/globals.css';

render(() => {
  const [active, setActive] = createSignal(true);
  return <ThemeProvider>
    <button id="switch" onClick={() => setActive(!active())}>Switch document</button>
    <div style={{ position: 'relative', height: '480px', width: 'min(800px, calc(100vw - 32px))', margin: '60px 16px', transform: 'translate3d(0, 0, 0)', overflow: 'hidden' }}>
      <RetainedPanel active={active()} id="editor-panel">
        <CodeEditor path="LICENSE" value={'MIT License\nCopyright Floegence\nLicense terms'} class="editor-fixture" style={{ height: '100%', position: 'relative' }}
          onReady={api => { api.editor.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 3, endColumn: 14 }); api.focus(); void api.editor.getAction('actions.find')?.run(); }} />
        <div id="explicit-visible" style={{ visibility: 'visible', position: 'absolute', bottom: '0' }}>Retained widget</div>
      </RetainedPanel>
      <RetainedPanel active={!active()}><h1>Other document</h1></RetainedPanel>
    </div>
  </ThemeProvider>;
}, document.getElementById('root')!);
