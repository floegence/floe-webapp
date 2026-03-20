import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import { useTheme } from '../../context/ThemeContext';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

import 'monaco-editor/min/vs/editor/editor.main.css';

import { resolveCodeEditorLanguageSpec } from './languages';
import { ensureMonacoEnvironment } from './monacoEnvironment';
import { ensureMonacoStandaloneRuntime } from './monacoStandaloneRuntime';

const DEFAULT_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  readOnly: true,
  automaticLayout: false,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 12,
  lineHeight: 18,
  tabSize: 2,
  fontFamily: 'var(--font-mono)',
};

let codeEditorInstanceId = 0;

export interface CodeEditorProps {
  path: string;
  language?: string;
  value: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  class?: string;
  style?: JSX.CSSProperties;
  onReady?: (api: CodeEditorApi) => void;
  onContentChange?: (e: monaco.editor.IModelContentChangedEvent, api: CodeEditorApi) => void;
  onSelectionChange?: (selectionText: string, api: CodeEditorApi) => void;
  onChange?: (value: string) => void;
}

export interface CodeEditorApi {
  editor: monaco.editor.IStandaloneCodeEditor;
  model: monaco.editor.ITextModel;
  getValue: () => string;
  getSelectedText: () => string;
  focus: () => void;
}

function createModelUri(instanceId: number, path: string) {
  return monaco.Uri.parse(`inmemory://model/${instanceId}/${encodeURIComponent(path)}`);
}

function readSelectedText(
  editor: monaco.editor.IStandaloneCodeEditor | undefined,
  model: monaco.editor.ITextModel | undefined,
): string {
  if (!editor || !model) return '';
  const selection = editor.getSelection();
  if (!selection || selection.isEmpty()) return '';
  return model.getValueInRange(selection);
}

export function CodeEditor(props: CodeEditorProps) {
  const theme = useTheme();
  let container: HTMLDivElement | undefined;
  const instanceId = ++codeEditorInstanceId;

  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  let model: monaco.editor.ITextModel | undefined;
  let rafId: number | undefined;
  let lastReadyModelUri: string | null = null;
  let modelRequestSeq = 0;

  const size = useResizeObserver(() => container);

  const applyTheme = () => {
    monaco.editor.setTheme(theme.resolvedTheme() === 'dark' ? 'vs-dark' : 'vs');
  };

  const getApi = (): CodeEditorApi | null => {
    if (!editor || !model) return null;
    return {
      editor,
      model,
      getValue: () => editor!.getValue(),
      getSelectedText: () => readSelectedText(editor, model),
      focus: () => editor!.focus(),
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

  const notifySelectionChange = () => {
    const api = getApi();
    if (!api) return;
    props.onSelectionChange?.(api.getSelectedText(), api);
  };

  const ensureModel = async () => {
    if (!editor) return;

    const requestSeq = ++modelRequestSeq;
    const spec = resolveCodeEditorLanguageSpec(props.language);
    let languageId = spec.id;

    try {
      await spec.load?.();
    } catch {
      if (requestSeq !== modelRequestSeq) return;
      languageId = 'plaintext';
    }

    if (!editor || requestSeq !== modelRequestSeq) return;

    const uri = createModelUri(instanceId, props.path);

    if (model && model.uri.toString() === uri.toString()) {
      if (model.getLanguageId() !== languageId) {
        monaco.editor.setModelLanguage(model, languageId);
      }
      if (model.getValue() !== props.value) {
        model.setValue(props.value);
      }
      notifyReadyIfNeeded();
      notifySelectionChange();
      return;
    }

    const nextModel = monaco.editor.createModel(props.value, languageId, uri);
    model?.dispose();
    model = nextModel;
    editor.setModel(model);
    notifyReadyIfNeeded();
    notifySelectionChange();
  };

  onMount(() => {
    let cancelled = false;
    let contentDisposable: monaco.IDisposable | undefined;
    let selectionDisposable: monaco.IDisposable | undefined;

    const initializeEditor = async () => {
      if (!container) return;

      ensureMonacoEnvironment();
      await ensureMonacoStandaloneRuntime();
      if (cancelled || !container) return;

      editor = monaco.editor.create(container, {
        model: null,
        ...DEFAULT_EDITOR_OPTIONS,
        ...(props.options ?? {}),
      });

      applyTheme();
      await ensureModel();
      if (cancelled || !editor) return;

      const onContentChange = props.onContentChange;
      const onChange = props.onChange;
      const onSelectionChange = props.onSelectionChange;
      contentDisposable = editor.onDidChangeModelContent((event: monaco.editor.IModelContentChangedEvent) => {
        const api = getApi();
        if (!api) return;
        onContentChange?.(event, api);
        if (onChange) {
          onChange(api.getValue());
        }
      });
      selectionDisposable = editor.onDidChangeCursorSelection(() => {
        const api = getApi();
        if (!api) return;
        onSelectionChange?.(api.getSelectedText(), api);
      });
    };

    void initializeEditor().catch((error) => {
      console.error('Failed to initialize Monaco editor runtime', error);
    });

    onCleanup(() => {
      cancelled = true;
      contentDisposable?.dispose();
      selectionDisposable?.dispose();
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
      ...DEFAULT_EDITOR_OPTIONS,
      ...(props.options ?? {}),
    });
  });

  createEffect(() => {
    void props.path;
    void props.language;
    void props.value;
    void ensureModel();
  });

  createEffect(() => {
    const next = size();
    if (!next || !editor) return;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      editor?.layout({ width: next.width, height: next.height });
    });
  });

  return <div ref={container} class={props.class} style={props.style} />;
}
