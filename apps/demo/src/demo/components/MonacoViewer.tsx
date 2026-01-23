import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { useResizeObserver, useTheme } from '@floegence/floe-webapp-core';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { isCancellationError } from 'monaco-editor/esm/vs/base/common/errors.js';
import { ConsoleLogger } from 'monaco-editor/esm/vs/platform/log/common/log.js';
import { LogService } from 'monaco-editor/esm/vs/platform/log/common/logService.js';

import 'monaco-editor/min/vs/editor/editor.main.css';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js';
import 'monaco-editor/esm/vs/language/typescript/monaco.contribution.js';

import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
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
      if (label === 'typescript' || label === 'javascript') return new TsWorker();
      return new EditorWorker();
    },
  };
}

// On Safari/WebKit, Monaco's clipboard workaround cancels the previous DeferredPromise on each
// user gesture. This is expected, but the default logService prints it as an error
// ("ERR Canceled: Canceled"). Override logService to filter CancellationError noise.
const monacoLogService = (() => {
  const service = new LogService(new ConsoleLogger());
  const originalError = service.error.bind(service);

  service.error = (message: unknown, ...args: unknown[]) => {
    if (isCancellationError(message)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return originalError(message as any, ...(args as any[]));
  };

  return service;
})();

export interface MonacoViewerProps {
  path: string;
  language: string;
  value: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  class?: string;
  style?: JSX.CSSProperties;
  /**
   * Called when the editor/model are ready (and whenever the model is switched for a new path).
   * Avoid doing heavy work in this callback.
   */
  onReady?: (api: MonacoViewerApi) => void;
  /**
   * Called on every model content change. Prefer this over `onChange` to avoid
   * pulling the full editor value on every keystroke.
   */
  onContentChange?: (e: monaco.editor.IModelContentChangedEvent, api: MonacoViewerApi) => void;
  onChange?: (value: string) => void;
}

export interface MonacoViewerApi {
  editor: monaco.editor.IStandaloneCodeEditor;
  model: monaco.editor.ITextModel;
  getValue: () => string;
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
  let lastReadyModelUri: string | null = null;

  const size = useResizeObserver(() => container);

  const applyTheme = () => {
    monaco.editor.setTheme(theme.resolvedTheme() === 'dark' ? 'vs-dark' : 'vs');
  };

  const getApi = (): MonacoViewerApi | null => {
    if (!editor || !model) return null;
    return {
      editor,
      model,
      getValue: () => editor!.getValue(),
    };
  };

  const notifyReadyIfNeeded = () => {
    const api = getApi();
    if (!api) return;
    const uri = api.model.uri.toString();
    if (uri === lastReadyModelUri) return;
    lastReadyModelUri = uri;
    props.onReady?.(api);
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
    notifyReadyIfNeeded();
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
    }, { logService: monacoLogService });

    applyTheme();
    ensureModel();

    // Listen for content changes
    const onContentChange = props.onContentChange;
    const onChange = props.onChange;
    const disposable = editor.onDidChangeModelContent((e: monaco.editor.IModelContentChangedEvent) => {
      const api = getApi();
      if (!api) return;
      onContentChange?.(e, api);
      // Fallback API: only compute full text when requested.
      if (onChange) {
        onChange(api.getValue());
      }
    });

    onCleanup(() => {
      disposable.dispose();
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
