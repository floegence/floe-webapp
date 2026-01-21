import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { useResizeObserver, useTheme } from '@floegence/floe-webapp-core';
import * as monaco from 'monaco-editor';

import 'monaco-editor/min/vs/editor/editor.main.css';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import 'monaco-editor/esm/vs/language/css/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/html/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker.js?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker.js?worker';

type MonacoEnvironment = {
  getWorker: (workerId: string, label: string) => Worker;
};

const globalWithMonaco = globalThis as typeof globalThis & {
  MonacoEnvironment?: MonacoEnvironment;
};

if (!globalWithMonaco.MonacoEnvironment) {
  globalWithMonaco.MonacoEnvironment = {
    getWorker: (workerId, label) => {
      void workerId;
      if (label === 'json') return new JsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
      if (label === 'typescript' || label === 'javascript') return new TsWorker();
      return new EditorWorker();
    },
  };
}

export interface MonacoViewerProps {
  path: string;
  language: string;
  value: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  class?: string;
  style?: JSX.CSSProperties;
}

function createModelUri(path: string) {
  return monaco.Uri.parse(`inmemory://model/${encodeURIComponent(path)}`);
}

export default function MonacoViewer(props: MonacoViewerProps) {
  const theme = useTheme();
  let container: HTMLDivElement | undefined;

  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  let model: monaco.editor.ITextModel | undefined;
  let rafId: number | undefined;

  const size = useResizeObserver(() => container);

  const applyTheme = () => {
    monaco.editor.setTheme(theme.resolvedTheme() === 'dark' ? 'vs-dark' : 'vs');
  };

  const ensureModel = () => {
    if (!editor) return;

    const uri = createModelUri(props.path);
    const existing = monaco.editor.getModel(uri);

    if (model && model.uri.toString() === uri.toString()) {
      if (model.getLanguageId() !== props.language) {
        monaco.editor.setModelLanguage(model, props.language);
      }
      if (model.getValue() !== props.value) {
        model.setValue(props.value);
      }
      return;
    }

    model?.dispose();
    model = existing ?? monaco.editor.createModel(props.value, props.language, uri);
    editor.setModel(model);
  };

  onMount(() => {
    if (!container) return;

    editor = monaco.editor.create(container, {
      value: props.value,
      language: props.language,
      readOnly: true,
      automaticLayout: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 12,
      tabSize: 2,
      ...props.options,
    });

    applyTheme();
    ensureModel();

    onCleanup(() => {
      if (rafId) cancelAnimationFrame(rafId);
      editor?.dispose();
      model?.dispose();
      editor = undefined;
      model = undefined;
    });
  });

  createEffect(() => {
    applyTheme();
  });

  createEffect(() => {
    if (!editor) return;
    editor.updateOptions({
      readOnly: true,
      minimap: { enabled: false },
      ...(props.options ?? {}),
    });
  });

  createEffect(() => {
    ensureModel();
  });

  createEffect(() => {
    const next = size();
    if (!next || !editor) return;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      editor?.layout({ width: next.width, height: next.height });
    });
  });

  return (
    <div
      ref={container}
      class={props.class}
      style={props.style}
    />
  );
}
