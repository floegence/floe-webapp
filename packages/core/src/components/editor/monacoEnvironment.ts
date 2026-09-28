import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker.js?worker';
import JsonWorker from 'monaco-editor/languages/features/json/json.worker.js?worker';
import HtmlWorker from 'monaco-editor/languages/features/html/html.worker.js?worker';
import CssWorker from 'monaco-editor/languages/features/css/css.worker.js?worker';

type MonacoEnvironmentShape = {
  getWorker: (workerId: string, label: string) => Worker;
};

const globalWithMonaco = globalThis as typeof globalThis & {
  MonacoEnvironment?: MonacoEnvironmentShape;
};

export function ensureMonacoEnvironment(): void {
  if (globalWithMonaco.MonacoEnvironment) return;

  globalWithMonaco.MonacoEnvironment = {
    getWorker: (workerId, label) => {
      void workerId;
      if (label === 'typescript' || label === 'javascript') return new TsWorker();
      if (label === 'json') return new JsonWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
      return new EditorWorker();
    },
  };
}
