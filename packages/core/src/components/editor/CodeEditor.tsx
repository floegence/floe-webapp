import { useContextMenuActions, type ContextMenuAction } from '../ui/ContextMenuActions';
import { createEffect, onCleanup, onMount, type JSX } from 'solid-js';
import type * as Monaco from 'monaco-editor/editor';
import { useTheme } from '../../context/ThemeContext';
import { useResizeObserver } from '../../hooks/useResizeObserver';

import { resolveCodeEditorLanguageSpec } from './languages';
import { applyFloeMonacoTheme } from './monacoTheme';
import { ensureMonacoEnvironment } from './monacoEnvironment';
import { loadMonacoEditorApi, type CodeEditorRuntimeOptions } from './monacoStandaloneRuntime';

import { ensureFloeMonacoHover } from './monacoHover';

type MonacoEditorApi = typeof import('monaco-editor/editor');
type MonacoEditorOptions = Monaco.editor.IStandaloneEditorConstructionOptions;
type MonacoStandaloneCodeEditor = Monaco.editor.IStandaloneCodeEditor;
type MonacoTextModel = Monaco.editor.ITextModel;
type MonacoModelContentChangedEvent = Monaco.editor.IModelContentChangedEvent;
type MonacoDisposable = Monaco.IDisposable;

const DEFAULT_EDITOR_OPTIONS: MonacoEditorOptions = {
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
  options?: MonacoEditorOptions;
  runtimeOptions?: CodeEditorRuntimeOptions;
  class?: string;
  style?: JSX.CSSProperties;
  onReady?: (api: CodeEditorApi) => void;
  onContentChange?: (e: MonacoModelContentChangedEvent, api: CodeEditorApi) => void;
  onSelectionChange?: (selectionText: string, api: CodeEditorApi) => void;
  onChange?: (value: string) => void;
}

export interface CodeEditorApi {
  editor: MonacoStandaloneCodeEditor;
  model: MonacoTextModel;
  getValue: () => string;
  getSelectedText: () => string;
  focus: () => void;
}

function createModelUri(monaco: MonacoEditorApi, instanceId: number, path: string) {
  return monaco.Uri.parse(`inmemory://model/${instanceId}/${encodeURIComponent(path)}`);
}

function readSelectedText(
  editor: MonacoStandaloneCodeEditor | undefined,
  model: MonacoTextModel | undefined
): string {
  if (!editor || !model) return '';
  const selection = editor.getSelection();
  if (!selection || selection.isEmpty()) return '';
  return model.getValueInRange(selection);
}

export function CodeEditor(props: CodeEditorProps) {
  const theme = useTheme();
  const sharedContextActions = useContextMenuActions();
  let container: HTMLDivElement | undefined;
  const instanceId = ++codeEditorInstanceId;

  let monaco: MonacoEditorApi | undefined;
  let editor: MonacoStandaloneCodeEditor | undefined;
  let model: MonacoTextModel | undefined;
  let rafId: number | undefined;
  let lastReadyModelUri: string | null = null;
  let modelRequestSeq = 0;

  const size = useResizeObserver(() => container);

  const applyTheme = () => {
    const resolvedTheme = theme.resolvedTheme();
    const shellPreset = theme.shellPreset();
    if (!monaco) return;
    applyFloeMonacoTheme(monaco.editor, resolvedTheme, shellPreset);
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
    if (!editor || !monaco) return;

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

    const uri = createModelUri(monaco, instanceId, props.path);

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
    let contentDisposable: MonacoDisposable | undefined;
    let selectionDisposable: MonacoDisposable | undefined;
    let removeContextMenu: (() => void) | undefined;
    let actionDisposables: MonacoDisposable[] = [];
    let contextActions: readonly ContextMenuAction[] = [];

    const initializeEditor = async () => {
      if (!container) return;

      ensureMonacoEnvironment();
      ensureFloeMonacoHover();
      monaco = await loadMonacoEditorApi(props.runtimeOptions);
      if (cancelled || !container) return;

      editor = monaco.editor.create(container, {
        model: null,
        ...DEFAULT_EDITOR_OPTIONS,
        ...(props.options ?? {}),
      });

      // Monaco owns its menu, selection and clipboard. Contribute through its API.
      // Register menu metadata before Monaco builds its cached menu. Each
      // invocation replaces only callbacks with the newly frozen request.
      const contextMenuOwner = container;
      const bounds = contextMenuOwner.getBoundingClientRect();
      const descriptors =
        sharedContextActions?.resolve({
          target: contextMenuOwner,
          x: bounds.left,
          y: bounds.top,
          selection: '',
        }) ?? [];
      actionDisposables = descriptors.map((descriptor) =>
        editor!.addAction({
          id: descriptor.id,
          label: descriptor.label,
          contextMenuGroupId: 'navigation',
          contextMenuOrder: 0,
          run: () => {
            const action = contextActions.find((action) => action.id === descriptor.id);
            if (action && !action.disabled) action.onSelect();
          },
        })
      );
      const prepareContextMenu = (event: MouseEvent | KeyboardEvent) => {
        if (
          event instanceof KeyboardEvent &&
          event.key !== 'ContextMenu' &&
          !(event.shiftKey && event.key === 'F10')
        )
          return;
        if (event instanceof MouseEvent && event.type === 'pointerdown' && event.button !== 2)
          return;
        const pending = sharedContextActions?.claim();
        const rect = contextMenuOwner.getBoundingClientRect();
        contextActions =
          pending?.actions ??
          sharedContextActions?.resolve({
            target: contextMenuOwner,
            x: event instanceof MouseEvent ? event.clientX : rect.left + 8,
            y: event instanceof MouseEvent ? event.clientY : rect.top + 24,
            selection: readSelectedText(editor, model),
          }) ??
          [];
      };
      contextMenuOwner.addEventListener('pointerdown', prepareContextMenu, true);
      contextMenuOwner.addEventListener('contextmenu', prepareContextMenu, true);
      contextMenuOwner.addEventListener('keydown', prepareContextMenu, true);
      removeContextMenu = () => {
        contextActions = [];
        contextMenuOwner.removeEventListener('pointerdown', prepareContextMenu, true);
        contextMenuOwner.removeEventListener('contextmenu', prepareContextMenu, true);
        contextMenuOwner.removeEventListener('keydown', prepareContextMenu, true);
      };
      applyTheme();
      await ensureModel();
      if (cancelled || !editor) return;

      const onContentChange = props.onContentChange;
      const onChange = props.onChange;
      const onSelectionChange = props.onSelectionChange;
      contentDisposable = editor.onDidChangeModelContent(
        (event: MonacoModelContentChangedEvent) => {
          const api = getApi();
          if (!api) return;
          onContentChange?.(event, api);
          if (onChange) {
            onChange(api.getValue());
          }
        }
      );
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
      removeContextMenu?.();
      actionDisposables.forEach((action) => action.dispose());
      if (rafId) cancelAnimationFrame(rafId);
      editor?.dispose();
      model?.dispose();
      monaco = undefined;
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

  return <div ref={container} class={`floe-code-editor${props.class ? ` ${props.class}` : ''}`} style={props.style} />;
}
