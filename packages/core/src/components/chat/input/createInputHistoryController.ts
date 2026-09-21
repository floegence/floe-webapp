export interface InputHistoryEntry {
  readonly id: string;
  readonly text: string;
}

export interface InputHistoryContext {
  readonly scope: string;
  readonly value: string;
  /** Changes on every host draft mutation, including writes of the same text. */
  readonly revision: unknown;
  /** Oldest first. IDs are unique within the scope. Empty text is skipped. */
  readonly entries: readonly InputHistoryEntry[];
  readonly enabled: boolean;
}

export interface InputHistoryState {
  /** One means the newest entry in the current browsing session. */
  readonly position: number;
  readonly total: number;
}

export interface InputHistoryOptions {
  readonly read: () => InputHistoryContext;
  /** Commit to the controlled editor synchronously; never submit the text. */
  readonly write: (text: string) => void;
  readonly onChange?: (state: InputHistoryState | null, reason: 'navigate' | 'reset') => void;
}

export type InputHistoryEditor = Pick<HTMLTextAreaElement,
  'value' | 'selectionStart' | 'selectionEnd' | 'disabled' | 'readOnly' | 'setSelectionRange'
>;

export interface InputHistoryController {
  readonly state: () => InputHistoryState | null;
  /** Call when the controlled draft, scope, eligibility or candidates change. */
  readonly synchronize: () => void;
  /** Call on input, paste, pointer selection, composition start, blur and hide. */
  readonly reset: () => void;
  /** Invoke after higher-priority menus. True means the event was consumed. */
  readonly handleKeyDown: (event: KeyboardEvent, editor: InputHistoryEditor) => boolean;
}

interface Session {
  scope: string;
  entries: readonly InputHistoryEntry[];
  index: number;
  value: string;
  revision: unknown;
}

/** Terminal-style recall for a host-owned controlled textarea. No persistence. */
export function createInputHistoryController(options: InputHistoryOptions): InputHistoryController {
  let session: Session | null = null;
  let writing = false;
  const state = (): InputHistoryState | null => session
    ? { position: session.entries.length - session.index, total: session.entries.length }
    : null;
  const reset = () => {
    if (!session) return;
    session = null;
    options.onChange?.(null, 'reset');
  };
  const synchronize = () => {
    if (!session || writing) return;
    const current = options.read();
    if (!current.enabled || current.scope !== session.scope
      || current.value !== session.value || !Object.is(current.revision, session.revision)) {
      reset();
      return;
    }
    const entries = new Map(current.entries.map((entry) => [entry.id, entry.text]));
    if (session.entries.some((entry) => entries.get(entry.id) !== entry.text)) reset();
  };
  const navigate = (index: number, editor: InputHistoryEditor) => {
    const active = session!;
    const text = active.entries[index]?.text ?? '';
    writing = true;
    try {
      options.write(text);
    } finally {
      writing = false;
    }
    const current = options.read();
    if (!current.enabled || current.scope !== active.scope || current.value !== text) {
      reset();
      return;
    }
    session = index < active.entries.length
      ? { ...active, index, value: text, revision: current.revision }
      : null;
    editor.setSelectionRange(text.length, text.length);
    options.onChange?.(state(), 'navigate');
  };
  const handleKeyDown = (event: KeyboardEvent, editor: InputHistoryEditor): boolean => {
    synchronize();
    const current = options.read();
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
      || !current.enabled || !current.scope || editor.disabled || editor.readOnly
      || editor.selectionStart !== editor.selectionEnd || editor.value !== current.value) {
      reset();
      return false;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'Escape') {
      // Selection and editing keys accept the recalled text as an ordinary draft.
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) reset();
      return false;
    }
    if (!session) {
      if (event.key !== 'ArrowUp' || current.value.length !== 0) return false;
      const entries = current.entries.filter((entry) => entry.text.length > 0)
        .map((entry) => ({ id: entry.id, text: entry.text }));
      if (!entries.length) return false;
      session = { scope: current.scope, entries, index: entries.length, value: '', revision: current.revision };
    }
    const index = event.key === 'Escape' ? session.entries.length
      : Math.max(0, Math.min(session.entries.length, session.index + (event.key === 'ArrowUp' ? -1 : 1)));
    event.preventDefault();
    event.stopPropagation();
    if (index !== session.index) navigate(index, editor);
    return true;
  };
  return { state, synchronize, reset, handleKeyDown };
}
