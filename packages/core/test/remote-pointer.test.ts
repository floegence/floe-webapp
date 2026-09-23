// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemotePointer, type RemotePointerCommand, type RemotePointerOptions } from '../src/remote-pointer';

let dispose: (() => void) | undefined;
beforeEach(() => vi.useFakeTimers());
afterEach(() => { dispose?.(); dispose = undefined; document.body.replaceChildren(); vi.useRealTimers(); });

function fixture(extra: Partial<RemotePointerOptions<object>> = {}) {
  const surface = document.createElement('div');
  const canvas = document.createElement('canvas');
  surface.append(canvas); document.body.append(surface);
  const captured = new Set<number>();
  surface.setPointerCapture = id => { captured.add(id); };
  surface.hasPointerCapture = id => captured.has(id);
  surface.releasePointerCapture = id => { captured.delete(id); };
  let target: object | null = {};
  const events: { command: RemotePointerCommand; target: object }[] = [];
  const activate = vi.fn();
  const hold = vi.fn();
  const release = vi.fn();
  const pointer = createRemotePointer({surface,
    resolveTarget: event => event.target === canvas ? target : null,
    isTargetValid: token => token === target,
    sendPointer: (command, token) => { events.push({command, target:token}); },
    release, onActivate:activate, onHoldChange:hold, ...extra,
  });
  dispose = pointer.dispose;
  function event(type: string, values: Partial<PointerEvent> = {}) {
    const e = new MouseEvent(type, {bubbles:true, cancelable:true, clientX:100, clientY:200, button:0, ...values});
    Object.defineProperties(e, {pointerType:{value:values.pointerType ?? 'touch'}, pointerId:{value:values.pointerId ?? 1}});
    canvas.dispatchEvent(e); return e;
  }
  return {surface, canvas, pointer, events, activate, hold, release, event,
    commands: () => events.map(e => e.command), target:() => target,
    replaceTarget: () => { target = {}; }, disable:() => { target = null; },
    frame: () => vi.advanceTimersByTime(20),
  };
}

describe('remote pointer ownership', () => {
  it('turns an upward touch swipe into positive scroll without a mouse press or activation', () => {
    const f = fixture(); f.event('pointerdown');
    f.event('pointermove', {clientY:170}); f.event('pointermove', {clientY:155});
    expect(f.events).toEqual([]); f.frame();
    expect(f.commands()).toEqual([expect.objectContaining({kind:'scroll',dx:0,dy:45,clientX:100,clientY:200})]);
    f.event('pointerup', {clientY:155}); f.frame();
    expect(f.events).toHaveLength(1); expect(f.activate).not.toHaveBeenCalled();
  });
  it('flushes final fractional scroll on release and never adds inertia', () => {
    const f = fixture(); f.event('pointerdown');
    f.event('pointermove', {clientX:110.25,clientY:188.75});
    f.event('pointerup', {clientX:110.5,clientY:188.5});
    expect(f.commands()).toEqual([expect.objectContaining({kind:'scroll',dx:-10.5,dy:11.5})]);
    vi.advanceTimersByTime(3000); expect(f.events).toHaveLength(1);
  });
  it('delivers taps once and sends the first tap immediately', () => {
    const f = fixture(); f.event('pointerdown');
    f.event('pointermove', {clientX:108}); expect(f.events).toEqual([]);
    f.event('pointerup', {clientX:108});
    expect(f.commands().map(e => [e.kind, 'clicks' in e ? e.clicks : 0])).toEqual([['down',1],['up',1]]);
    vi.advanceTimersByTime(350); f.event('pointerdown'); f.event('pointerup');
    expect(f.commands().slice(2).map(e => 'clicks' in e && e.clicks)).toEqual([2,2]);
    expect(f.event('mousedown').defaultPrevented).toBe(true);
    f.event('mouseup'); f.event('click'); f.event('dblclick');
    expect(f.events).toHaveLength(4);
  });
  it('does not combine taps across targets, distance or the double-click deadline', () => {
    const f = fixture();
    const tap = (x=100) => { f.event('pointerdown',{clientX:x}); f.event('pointerup',{clientX:x}); };
    tap(); vi.advanceTimersByTime(351); tap(); tap(140); f.replaceTarget(); tap(140);
    expect(f.commands().filter(e => e.kind==='down').map(e => e.clicks)).toEqual([1,1,1,1]);
  });
  it('arms long press without sending input, then right clicks only on release', () => {
    const f = fixture(); f.event('pointerdown'); vi.advanceTimersByTime(449);
    expect(f.hold).not.toHaveBeenCalled(); vi.advanceTimersByTime(1);
    expect(f.hold).toHaveBeenCalledWith(expect.objectContaining({clientX:100,clientY:200}));
    expect(f.events).toEqual([]); f.event('pointerup');
    expect(f.commands().map(e => [e.kind, 'button' in e && e.button])).toEqual([['down',2],['up',2]]);
    expect(f.hold).toHaveBeenLastCalledWith(null);
  });
  it('starts a held drag at its original position and flushes its newest position before up', () => {
    const f = fixture(); f.event('pointerdown'); vi.advanceTimersByTime(450);
    f.event('pointermove',{clientX:120}); f.event('pointermove',{clientX:140});
    f.event('pointerup',{clientX:150});
    expect(f.commands().map(e => [e.kind,e.clientX])).toEqual([['down',100],['move',150],['up',150]]);
  });
  it.each(['pointercancel','lostpointercapture','blur','pagehide','reset','resize'])(
    'cancels %s without delivering queued movement, clicks or hold callbacks', type => {
      const f = fixture(); f.event('pointerdown'); f.event('pointermove',{clientY:160});
      if (type==='reset') f.pointer.reset();
      else if (['blur','pagehide','resize'].includes(type)) window.dispatchEvent(new Event(type));
      else f.event(type);
      f.event('pointerup',{clientY:160}); vi.advanceTimersByTime(1000);
      expect(f.events).toEqual([]);
    },
  );
  it('releases only held pointer buttons when reset, without keyboard events', () => {
    const f = fixture(); f.event('pointerdown',{pointerType:'mouse'}); f.pointer.reset();
    expect(f.commands().map(e=>e.kind)).toEqual(['down','up']);
    expect(f.release).toHaveBeenCalledWith(f.target());
    f.event('pointerup',{pointerType:'mouse'}); expect(f.events).toHaveLength(2);
  });
  it('cancels for a second touch and waits for every finger to lift before restarting', () => {
    const f = fixture(); f.event('pointerdown'); vi.advanceTimersByTime(450);
    f.event('pointermove',{clientX:120}); f.frame();
    f.event('pointerdown',{pointerId:2}); f.event('pointerup',{pointerId:2});
    f.event('pointermove',{clientY:120}); f.event('pointerup');
    expect(f.commands().map(e=>e.kind)).toEqual(['down','move','up']);
    f.event('pointerdown'); f.event('pointerup');
    expect(f.commands().slice(-2).map(e=>e.kind)).toEqual(['down','up']);
  });
  it('rejects missing first-frame targets and invalidates delayed work after target replacement', () => {
    const f = fixture(); f.disable(); f.event('pointerdown'); f.event('pointerup');
    expect(f.events).toEqual([]); f.replaceTarget();
    f.event('pointerdown'); f.event('pointermove',{clientY:170}); f.replaceTarget();
    f.frame(); f.event('pointerup'); expect(f.events).toEqual([]);
  });
  it('forwards real mouse moves, buttons and wheel units with modifiers', () => {
    const f = fixture(); f.event('pointermove',{pointerType:'mouse',clientX:110});
    f.event('pointermove',{pointerType:'mouse',clientX:120}); f.frame();
    expect(f.commands()).toEqual([expect.objectContaining({kind:'move',clientX:120})]);
    f.event('pointerdown',{pointerType:'mouse',button:2,ctrlKey:true});
    f.event('pointerup',{pointerType:'mouse',button:2,ctrlKey:true});
    f.canvas.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaMode:1,deltaX:2,deltaY:3,shiftKey:true}));
    f.frame();
    expect(f.commands().at(-1)).toMatchObject({kind:'scroll',dx:32,dy:48,shiftKey:true});
  });
  it('does not claim local controls and removes listeners on disposal', () => {
    const f = fixture();
    const local = new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:100});
    f.surface.dispatchEvent(local); expect(local.defaultPrevented).toBe(false);
    f.pointer.dispose(); f.event('pointerdown'); f.event('pointerup');
    expect(f.events).toEqual([]);
  });
  it('discards unflushed scroll when a second finger arrives', () => {
    const f = fixture(); f.event('pointerdown'); f.event('pointermove',{clientY:100});
    f.event('pointerdown',{pointerId:2}); f.frame();
    expect(f.events).toEqual([]);
  });
  it('cancels when the second contact is outside the remote surface', () => {
    const f = fixture(); f.event('pointerdown');
    const e = new MouseEvent('pointerdown',{bubbles:true});
    Object.assign(e,{pointerId:2,pointerType:'touch'}); document.body.dispatchEvent(e);
    f.event('pointerup'); vi.advanceTimersByTime(500); expect(f.events).toEqual([]);
  });
  it('releases a cancelled drag at its last delivered position, not its starting point', () => {
    const f = fixture(); f.event('pointerdown'); vi.advanceTimersByTime(450);
    f.event('pointermove',{clientX:130}); f.frame();
    f.event('pointermove',{clientX:160}); f.pointer.reset();
    expect(f.commands().map(e=>[e.kind,e.clientX])).toEqual([['down',100],['move',130],['up',130]]);
  });
  it('preserves button chords delivered by pointermove and releases each button once', () => {
    const f = fixture(); f.event('pointerdown',{pointerType:'mouse',buttons:1});
    f.event('pointermove',{pointerType:'mouse',buttons:3,button:2}); f.frame();
    f.event('pointermove',{pointerType:'mouse',buttons:1,button:2}); f.frame();
    f.event('pointerup',{pointerType:'mouse',button:0});
    expect(f.commands().filter(e=>'button' in e).map(e=>[e.kind,e.button])).toEqual([['down',0],['down',2],['up',2],['up',0]]);
  });
  it('does not send activation when its owner cancels synchronously', () => {
    let cancel = () => {};
    const f = fixture({onActivate:()=>cancel()}); cancel = f.pointer.reset;
    f.event('pointerdown'); f.event('pointerup'); expect(f.events).toEqual([]);
  });
  it('flushes scrolling before later keyboard transport without a keyboard listener', () => {
    const f = fixture(); f.event('pointerdown'); f.event('pointermove',{clientY:160});
    expect(f.events).toEqual([]); f.pointer.flush();
    expect(f.commands()).toEqual([expect.objectContaining({kind:'scroll',dy:40})]);
    f.event('pointerup',{clientY:160}); expect(f.events).toHaveLength(1);
  });
  it('isolates simultaneous viewers and target tokens', () => {
    const a = fixture(), b = fixture();
    a.event('pointerdown'); a.event('pointermove',{clientY:160});
    // Independent documents host real viewers. Stop document observation from
    // cancelling a on b's first down in this shared-document unit fixture.
    a.pointer.flush(); a.event('pointerup',{clientY:160});
    b.event('pointerdown'); b.event('pointerup');
    expect(a.events.every(e=>e.target===a.target())).toBe(true);
    expect(b.events.every(e=>e.target===b.target())).toBe(true);
    expect(a.commands().map(e=>e.kind)).toEqual(['scroll']); a.pointer.dispose();
  });
});
