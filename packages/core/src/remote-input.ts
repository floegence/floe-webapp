/** Client-owned editing for a remote surface. No document contents are mirrored. */
export interface RemoteInputKey {
  key: string;
  code: string;
  pressed: boolean;
  repeat: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  location: number;
}

export interface RemoteInputOptions<T> {
  surface: HTMLElement;
  label: string;
  commitText(text: string, target: T): void;
  sendKey(key: RemoteInputKey, target: T): void;
  release(target: T): void;
  /** Existing clipboard transport may own a shortcut; never submit it twice. */
  clipboard?: (event: KeyboardEvent, target: T) => boolean;
  onKeyboardVisibilityChange?: (visible: boolean) => void;
}

export interface RemoteInputController<T> {
  readonly element: HTMLTextAreaElement;
  bindTarget(target: T | null): void;
  setAnchor(clientX: number, clientY: number): void;
  focus(): void;
  setKeyboardVisible(visible: boolean): void;
  release(): void;
  reset(): void;
  dispose(): void;
}

/**
 * The caller gives this controller exclusive keyboard/editing ownership of its
 * surface. Pointer transport and clipboard synchronization remain caller-owned.
 * Targets are immutable identity tokens; bind a new token when ownership changes.
 */
export function createRemoteInput<T>(options: RemoteInputOptions<T>): RemoteInputController<T> {
  const { surface } = options;
  const doc = surface.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error('Remote input requires an attached document');
  const element = doc.createElement('textarea');
  element.className = 'floe-remote-input';
  element.setAttribute('aria-label', options.label);
  element.setAttribute('autocorrect', 'off');
  element.autocomplete = 'off';
  element.autocapitalize = 'off';
  element.spellcheck = false;
  element.wrap = 'off';
  element.disabled = true;
  element.tabIndex = -1;
  doc.body.append(element);

  let target: T | null = null;
  let epoch = 0;
  let disposed = false;
  let keyboardVisible = false;
  let composition: { epoch: number; committed: boolean; cancelled: boolean } | null = null;
  // A post-composition input without a new editing intent belongs to that same
  // transaction. A new key/beforeinput starts a new intent, even for equal text.
  let compositionTail = false;
  let printable: RemoteInputKey | null = null;
  const held = new Set<string>();
  const imeKeys = new Set<string>();
  let anchor: { x: number; y: number } | null = null;
  const cleanup: (() => void)[] = [];

  function listen<E extends Event>(owner: EventTarget, type: string, callback: (event: E) => void) {
    const listener = callback as EventListener;
    owner.addEventListener(type, listener);
    cleanup.push(() => owner.removeEventListener(type, listener));
  }
  const identity = (event: KeyboardEvent) => event.code || event.key;
  const key = (event: KeyboardEvent, pressed: boolean): RemoteInputKey => ({
    key: event.key, code: event.code, pressed, repeat: event.repeat, location: event.location,
    shiftKey: event.shiftKey, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey,
  });
  function keyboardState(visible: boolean) {
    if (keyboardVisible === visible) return;
    keyboardVisible = visible;
    options.onKeyboardVisibilityChange?.(visible);
  }
  function position() {
    const rect = surface.getBoundingClientRect();
    const viewport = win!.visualViewport;
    const left = Math.max(rect.left, viewport?.offsetLeft ?? 0);
    const top = Math.max(rect.top, viewport?.offsetTop ?? 0);
    const right = Math.min(rect.right, (viewport?.offsetLeft ?? 0) + (viewport?.width ?? win!.innerWidth));
    const bottom = Math.min(rect.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? win!.innerHeight));
    const width = Math.max(1, Math.min(320, right - left - 8));
    element.style.maxWidth = `${width}px`;
    const size = element.getBoundingClientRect();
    const x = anchor?.x ?? left + 12;
    const y = anchor?.y ?? top + 12;
    element.style.left = `${Math.max(left, Math.min(x, right - size.width - 4))}px`;
    element.style.top = `${Math.max(top, Math.min(y, bottom - size.height - 4))}px`;
  }
  function clearBuffer() {
    element.value = '';
    delete element.dataset.composing;
    printable = null;
  }
  function release() {
    const previous = target;
    const pressed = held.size > 0;
    held.clear();
    if (previous !== null && pressed) options.release(previous);
  }
  function reset() {
    epoch++;
    if (composition) composition.cancelled = true;
    compositionTail = true;
    clearBuffer();
    release();
    // End the native editing context as well as our transaction. Merely emptying
    // its value leaves the OS composing into the next target on mobile browsers.
    if (composition && doc.activeElement === element) element.blur();
  }
  function commit(text: string) {
    if (!text || target === null || disposed) return;
    options.commitText(text, target);
  }
  function stroke(name: string) {
    if (target === null) return;
    const packet: RemoteInputKey = {key:name,code:name,pressed:true,repeat:false,shiftKey:false,ctrlKey:false,altKey:false,metaKey:false,location:0};
    const bound = target;
    options.sendKey(packet, bound);
    if (target === bound) options.sendKey({...packet,pressed:false}, bound);
  }
  function finishInput(event: InputEvent) {
    if (target === null || disposed) { clearBuffer(); return; }
    if (composition?.cancelled || (composition && composition.epoch !== epoch)) { clearBuffer(); return; }
    if (event.isComposing) {
      composition ??= {epoch,committed:false,cancelled:false};
      element.dataset.composing = 'true'; position(); return;
    }
    if (composition) {
      if (!composition.committed && element.value) {
        composition.committed = true;
        commit(element.value);
      }
      clearBuffer(); return;
    }
    if (compositionTail || event.inputType === 'insertFromComposition') {
      compositionTail = false; clearBuffer(); return;
    }
    const value = element.value;
    // Preserve physical key semantics for ordinary direct typing, including
    // application shortcuts outside editable controls. Dead keys, AltGraph and
    // software keyboard input use the confirmed text, never guessed keycodes.
    if (printable && value === printable.key && !printable.altKey && value.length === 1) {
      const packet = printable;
      held.add(packet.code || packet.key);
      options.sendKey(packet, target);
    } else commit(value);
    clearBuffer();
  }

  listen<KeyboardEvent>(element, 'keydown', event => {
    if (target === null || disposed) return;
    event.stopPropagation();
    if (composition?.cancelled && !event.isComposing && event.key !== 'Process' && event.keyCode !== 229) composition = null;
    if (event.isComposing || composition || event.key === 'Process' || event.keyCode === 229) {
      imeKeys.add(identity(event)); printable = null; return;
    }
    // A newly pressed key cannot be the release of an abandoned IME key.
    imeKeys.delete(identity(event));
    compositionTail = false;
    if (options.clipboard?.(event, target)) { printable = null; return; }
    if (event.key === 'Dead' || event.key === 'Unidentified') { printable = null; return; }
    if (Array.from(event.key).length === 1 && !event.metaKey && (!event.ctrlKey || event.getModifierState('AltGraph'))) {
      printable = key(event, true); return;
    }
    event.preventDefault();
    held.add(identity(event));
    options.sendKey(key(event, true), target);
  });
  listen<KeyboardEvent>(element, 'keyup', event => {
    event.stopPropagation();
    printable = null;
    if (imeKeys.delete(identity(event))) return;
    if (target !== null && held.delete(identity(event))) options.sendKey(key(event, false), target);
  });
  listen<InputEvent>(element, 'beforeinput', event => {
    if (target === null || disposed) { event.preventDefault(); return; }
    if (event.isComposing || composition || event.inputType === 'insertCompositionText' || event.inputType === 'deleteCompositionText') return;
    if (event.inputType === 'insertFromComposition') return;
    compositionTail = false;
    const special: Record<string, string> = {deleteContentBackward:'Backspace',deleteContentForward:'Delete',insertLineBreak:'Enter',insertParagraph:'Enter'};
    const name = special[event.inputType];
    if (name) { event.preventDefault(); clearBuffer(); stroke(name); }
  });
  listen<InputEvent>(element, 'input', finishInput);
  listen<CompositionEvent>(element, 'compositionstart', () => {
    composition = {epoch,committed:false,cancelled:target === null};
    compositionTail = false; printable = null;
    element.dataset.composing = 'true'; position();
  });
  listen<CompositionEvent>(element, 'compositionend', event => {
    const previous = composition;
    composition = null;
    compositionTail = true;
    clearBuffer();
    if (previous && !previous.cancelled && !previous.committed && previous.epoch === epoch) commit(event.data);
  });
  listen(element, 'blur', () => { reset(); keyboardState(false); });
  listen(win, 'blur', reset);
  listen(win, 'pagehide', reset);
  listen(win, 'resize', position);
  if (win.visualViewport) {
    listen(win.visualViewport, 'resize', position);
    listen(win.visualViewport, 'scroll', position);
  }
  position();
  return {
    element,
    bindTarget(next) {
      if (disposed || Object.is(target, next)) return;
      reset(); target = next;
      element.disabled = next === null;
    },
    setAnchor(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      anchor = {x,y}; position();
    },
    focus() {
      if (target === null || disposed) return;
      element.focus({preventScroll:true}); position();
    },
    setKeyboardVisible(visible) {
      if (visible && target !== null && !disposed) {
        element.focus({preventScroll:true}); keyboardState(true); position();
      } else { element.blur(); keyboardState(false); }
    },
    release,
    reset,
    dispose() {
      if (disposed) return;
      reset(); disposed = true; target = null;
      for (const remove of cleanup) remove();
      element.remove(); keyboardState(false);
    },
  };
}
