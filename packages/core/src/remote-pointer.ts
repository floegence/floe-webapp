/** Viewport CSS coordinates and browser modifiers, independent of image density. */
export interface RemotePointerPosition {
  clientX: number;
  clientY: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  pointerType: string;
}

export type RemotePointerCommand = RemotePointerPosition & (
  | {kind: 'move'}
  | {kind: 'down' | 'up'; button: number; clicks: number}
  | {kind: 'scroll'; dx: number; dy: number}
);

export interface RemotePointerOptions<T> {
  /** Stable owner; resolveTarget excludes local chrome and unpainted content. */
  surface: HTMLElement;
  resolveTarget(event: MouseEvent): T | null;
  isTargetValid(target: T): boolean;
  sendPointer(command: RemotePointerCommand, target: T): void | boolean;
  /** Clear platform scroll remainder; never release keyboard input here. */
  release(target: T): void;
  /** Called before a deliberate button press, never for touch scrolling. */
  onActivate?(position: RemotePointerPosition, target: T): void;
  onHoldChange?(position: (RemotePointerPosition & {target: T}) | null): void;
}

export interface RemotePointerController {
  /** Preserve ordering before the consumer delivers a later key/text command. */
  flush(): void;
  reset(): void;
  dispose(): void;
}

const SLOP = 8;
const HOLD_MS = 450;
const DOUBLE_MS = 350;
const DOUBLE_DISTANCE = 16;

/**
 * Own remote content pointer events once. Mark its content elements with
 * data-floe-remote-pointer and load remote-pointer.css before interaction.
 * Keyboard, local window decorations and transport remain separate owners.
 */
export function createRemotePointer<T>(options: RemotePointerOptions<T>): RemotePointerController {
  const {surface} = options;
  const doc = surface.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error('Remote pointer requires an attached document');
  type Bound = {target: T; command: RemotePointerCommand};
  type Gesture = {
    id: number; target: T; origin: RemotePointerPosition; last: RemotePointerPosition;
    mode: 'pending' | 'hold' | 'scroll' | 'drag' | 'direct';
  };
  let gesture: Gesture | null = null;
  let pending: Bound | null = null;
  let wheelTarget: T | null = null;
  let tap: {target: T; position: RemotePointerPosition; time: number} | null = null;
  let frame = 0;
  let holdTimer = 0;
  let holding = false;
  let disposed = false;
  let epoch = 0;
  let blocked = false;
  const contacts = new Set<number>();
  const captures = new Set<number>();
  const held = new Map<number, Bound>();
  const cleanup: (() => void)[] = [];
  const valid = (target: T) => !disposed && options.isTargetValid(target);
  const distance = (a: RemotePointerPosition, b: RemotePointerPosition) => Math.hypot(a.clientX-b.clientX, a.clientY-b.clientY);
  const position = (e: MouseEvent | RemotePointerPosition): RemotePointerPosition => ({
    clientX:e.clientX, clientY:e.clientY, shiftKey:e.shiftKey, ctrlKey:e.ctrlKey,
    altKey:e.altKey, metaKey:e.metaKey, pointerType:'pointerType' in e ? String(e.pointerType) : 'mouse',
  });
  function listen<E extends Event>(owner: EventTarget, type: string, handler: (e: E) => void, capture = false) {
    const listener = handler as EventListener;
    owner.addEventListener(type, listener, {capture, passive:false});
    cleanup.push(() => owner.removeEventListener(type, listener, capture));
  }
  function deliver(command: RemotePointerCommand, target: T) {
    const sent = valid(target) && options.sendPointer(command, target) !== false;
    if (sent && command.kind === 'move') {
      for (const item of held.values()) if (item.target === target) item.command = {...item.command,...position(command)};
    }
    return sent;
  }
  function endHold() {
    win!.clearTimeout(holdTimer); holdTimer = 0;
    if (holding) { holding = false; options.onHoldChange?.(null); }
  }
  function uncapture(id: number) {
    captures.delete(id);
    if (surface.hasPointerCapture?.(id)) surface.releasePointerCapture(id);
  }
  function capture(id: number) {
    surface.setPointerCapture?.(id); captures.add(id);
  }
  function flush() {
    if (frame) win!.cancelAnimationFrame(frame);
    frame = 0;
    const next = pending; pending = null;
    if (next && !deliver(next.command, next.target)) reset();
  }
  function queue(command: RemotePointerCommand, target: T) {
    if (pending && (pending.target !== target || pending.command.kind !== command.kind)) flush();
    if (!valid(target)) return;
    if (command.kind === 'scroll' && pending?.command.kind === 'scroll') {
      command = {...command, dx:pending.command.dx+command.dx, dy:pending.command.dy+command.dy};
    }
    pending = {target, command};
    if (!frame) {
      const mine = epoch;
      const request = win!.requestAnimationFrame(() => {
        if (mine === epoch && frame === request) flush();
      });
      frame = request;
    }
  }
  function button(pressed: boolean, at: RemotePointerPosition, target: T, number: number, clicks = 1) {
    const previous = held.get(number);
    if (!pressed && !previous) return;
    if (!pressed) held.delete(number);
    const command: RemotePointerCommand = {...at, kind:pressed ? 'down' : 'up', button:number, clicks};
    if (deliver(command, target) && pressed) held.set(number, {target, command});
  }
  function activate(at: RemotePointerPosition, target: T) {
    const mine = epoch;
    options.onActivate?.(at, target);
    return mine === epoch && valid(target);
  }
  function click(at: RemotePointerPosition, target: T, number: number, clicks = 1) {
    if (!activate(at, target)) return;
    button(true, at, target, number, clicks); button(false, at, target, number, clicks);
  }
  function reset() {
    epoch++;
    endHold();
    if (frame) win!.cancelAnimationFrame(frame);
    frame = 0;
    const targets = new Set<T>();
    if (gesture) targets.add(gesture.target);
    if (pending) targets.add(pending.target);
    if (wheelTarget !== null) targets.add(wheelTarget);
    pending = null; gesture = null; wheelTarget = null; tap = null;
    blocked = contacts.size > 0;
    for (const [number, item] of held) {
      targets.add(item.target);
      button(false, item.command, item.target, number);
    }
    for (const target of targets) options.release(target);
    for (const id of [...captures]) uncapture(id);
  }
  function finishContact(id: number) {
    contacts.delete(id); uncapture(id);
    if (!contacts.size) blocked = false;
  }
  function advanceTouch(e: PointerEvent) {
    const current = gesture;
    if (!current || current.id !== e.pointerId) return;
    if (!valid(current.target)) { reset(); return; }
    const at = position(e);
    if ((current.mode === 'pending' || current.mode === 'hold') && distance(current.origin, at) > SLOP) {
      const drag = current.mode === 'hold';
      endHold(); tap = null;
      current.mode = drag ? 'drag' : 'scroll';
      if (drag && activate(current.origin, current.target)) button(true, current.origin, current.target, 0);
      if (gesture !== current) return;
    }
    if (current.mode === 'scroll') {
      // Keep the start hit-test point while fingers move across nested panels.
      const from = current.last;
      const dx = from.clientX-at.clientX, dy = from.clientY-at.clientY;
      if (dx || dy) queue({...current.origin, kind:'scroll', dx, dy}, current.target);
      current.last = at;
    } else if (current.mode === 'drag') {
      queue({...at, kind:'move'}, current.target); current.last = at;
    }
  }
  listen<PointerEvent>(surface, 'pointerdown', e => {
    const target = options.resolveTarget(e);
    if (target === null || !valid(target)) return;
    const at = position(e);
    if (e.pointerType === 'touch') {
      contacts.add(e.pointerId);
      if (contacts.size > 1 || blocked) { reset(); return; }
      if (gesture || held.size) reset();
      flush();
      if (wheelTarget !== null) { options.release(wheelTarget); wheelTarget = null; }
      blocked = false;
      gesture = {id:e.pointerId,target,origin:at,last:at,mode:'pending'};
      const started = gesture;
      holdTimer = win!.setTimeout(() => {
        holdTimer = 0;
        if (gesture !== started) return;
        if (!valid(target)) { reset(); return; }
        started.mode = 'hold'; holding = true;
        options.onHoldChange?.({...at,target});
      }, HOLD_MS);
    } else {
      if (contacts.size) { reset(); return; }
      if (gesture && (gesture.id !== e.pointerId || gesture.target !== target)) reset();
      flush();
      if (wheelTarget !== null) { options.release(wheelTarget); wheelTarget = null; }
      gesture = {id:e.pointerId,target,origin:at,last:at,mode:'direct'};
      const twice = e.button === 0 && tap?.target === target && win!.performance.now()-tap.time <= DOUBLE_MS && distance(tap.position,at) <= DOUBLE_DISTANCE;
      if (activate(at,target)) button(true,at,target,e.button,Math.max(1,e.detail,twice ? 2 : 1));
    }
    capture(e.pointerId);
    // Touch cannot also activate via compatibility mouse events. Direct mouse
    // movement remains available if window decorations later take ownership.
    if (e.pointerType === 'touch') e.preventDefault();
  });
  listen<PointerEvent>(surface, 'pointermove', e => {
    if (e.pointerType === 'touch') {
      advanceTouch(e); return;
    }
    if (blocked || contacts.size) return;
    const target = gesture?.target ?? options.resolveTarget(e);
    if (target === null || !valid(target)) { if (gesture) reset(); return; }
    const at = position(e);
    if (gesture) {
      gesture.last = at;
      // Additional mouse/barrel buttons change on pointermove, not pointerdown.
      for (const [number, mask] of [[0,1],[1,4],[2,2],[3,8],[4,16]]) {
        const pressed = Boolean(e.buttons & mask);
        if (pressed !== held.has(number)) {
          flush(); button(pressed,at,target,number);
        }
      }
    }
    queue({...at,kind:'move'},target);
  });
  listen<PointerEvent>(surface, 'pointerup', e => {
    const current = gesture;
    if (current?.id === e.pointerId && !blocked) {
      if (!valid(current.target)) reset();
      else if (e.pointerType === 'touch') {
        advanceTouch(e); endHold();
        const at = position(e);
        if (current.mode === 'pending') {
          const now = win!.performance.now();
          const twice = tap?.target === current.target && now-tap.time <= DOUBLE_MS && distance(tap.position,at) <= DOUBLE_DISTANCE;
          click(at,current.target,0,twice ? 2 : 1);
          tap = twice ? null : {target:current.target,position:at,time:now};
        } else if (current.mode === 'hold') {
          tap = null; click(at,current.target,2);
        } else {
          flush();
          if (current.mode === 'drag') button(false,at,current.target,0);
        }
        options.release(current.target);
        gesture = null;
      } else {
        if (pending?.command.kind === 'move') pending.command = {...position(e),kind:'move'};
        flush();
        const clicks = held.get(e.button)?.command;
        for (const number of [...held.keys()]) button(false,position(e),current.target,number,clicks && 'clicks' in clicks ? clicks.clicks : 1);
        tap = e.button === 0 && clicks && 'clicks' in clicks && clicks.clicks === 1 && distance(current.origin,position(e)) <= SLOP
          ? {target:current.target,position:position(e),time:win!.performance.now()} : null;
        if (!held.size) gesture = null;
      }
    }
    if (!gesture || gesture.id !== e.pointerId) finishContact(e.pointerId);
  });
  listen<PointerEvent>(surface, 'pointercancel', e => { reset(); finishContact(e.pointerId); });
  listen<PointerEvent>(surface, 'lostpointercapture', e => {
    if (captures.has(e.pointerId)) { reset(); finishContact(e.pointerId); }
  });
  // Observe releases outside the surface after an explicit cancellation. These
  // observers neither consume local controls nor deliver remote input.
  listen<PointerEvent>(doc, 'pointerup', e => {
    if (gesture?.id !== e.pointerId) finishContact(e.pointerId);
  });
  listen<PointerEvent>(doc, 'pointercancel', e => finishContact(e.pointerId));
  listen<PointerEvent>(doc, 'pointerdown', e => {
    if (!gesture) return;
    if (e.pointerType === 'touch' && e.pointerId !== gesture.id) { contacts.add(e.pointerId); reset(); }
    else if (!surface.contains(e.target as Node)) reset();
  }, true);
  listen<WheelEvent>(surface, 'wheel', e => {
    const target = options.resolveTarget(e);
    if (target === null || !valid(target)) return;
    e.preventDefault();
    if (gesture || contacts.size) return;
    tap = null;
    if (wheelTarget !== null && wheelTarget !== target) { flush(); options.release(wheelTarget); }
    wheelTarget = target;
    const unitX = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? surface.clientWidth || win!.innerWidth : 1;
    const unitY = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? surface.clientHeight || win!.innerHeight : 1;
    const dx = e.deltaX*unitX, dy = e.deltaY*unitY;
    if (Number.isFinite(dx) && Number.isFinite(dy) && (dx || dy)) queue({...position(e),kind:'scroll',dx,dy},target);
  });
  for (const type of ['mousedown','mouseup','click','dblclick','contextmenu','dragstart','selectstart']) {
    listen<MouseEvent>(surface,type,e => {
      if (options.resolveTarget(e) !== null) e.preventDefault();
    });
  }
  for (const type of ['blur','pagehide','resize','orientationchange']) listen(win,type,reset);
  listen(doc,'visibilitychange',() => { if (doc.hidden) reset(); });
  listen(win,'scroll',reset,true);
  if (win.visualViewport) {
    listen(win.visualViewport,'resize',reset); listen(win.visualViewport,'scroll',reset);
  }
  if (typeof ResizeObserver !== 'undefined') {
    let size = `${surface.clientWidth}:${surface.clientHeight}`;
    const observer = new ResizeObserver(() => {
      const next = `${surface.clientWidth}:${surface.clientHeight}`;
      if (next !== size) { size = next; reset(); }
    });
    observer.observe(surface); cleanup.push(() => observer.disconnect());
  }
  return {flush, reset, dispose() {
    if (disposed) return;
    reset(); disposed = true;
    for (const remove of cleanup) remove();
    contacts.clear();
  }};
}
