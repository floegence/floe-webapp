// @vitest-environment jsdom

import { render } from 'solid-js/web';
import { createSignal, untrack } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  WorkbenchAnnotationLayerView,
  WorkbenchBackgroundLayerView,
  WorkbenchBackgroundRegion,
  WorkbenchLayerControlOverlayView,
  WorkbenchStickyNote,
  WorkbenchTextAnnotation,
  createWorkbenchTextEditorRegistry,
} from '../src/components/workbench/WorkbenchLayerObjects';
import { WorkbenchCanvasField } from '../src/components/workbench/WorkbenchCanvasField';
import { sanitizeWorkbenchState } from '../src/components/workbench/workbenchHelpers';
import {
  WORKBENCH_STICKY_FILTER_ID,
  type WorkbenchBackgroundLayer,
  type WorkbenchSelection,
  type WorkbenchStickyNoteItem,
  type WorkbenchTextAnnotationItem,
} from '../src/components/workbench/types';
import {
  WORKBENCH_DEFAULT_REGION_FILL,
  WORKBENCH_DEFAULT_TEXT_COLOR,
  WORKBENCH_DEFAULT_TEXT_FONT,
  WORKBENCH_REGION_FILL_OPTIONS,
  WORKBENCH_TEXT_COLOR_OPTIONS,
  WORKBENCH_TEXT_EMOJI_OPTIONS,
  WORKBENCH_TEXT_FONT_OPTIONS,
} from '../src/components/workbench/workbenchOptions';

function dispatchPointerEvent(
  type: string,
  target: EventTarget,
  options: {
    button?: number;
    buttons?: number;
    pointerId?: number;
    clientX?: number;
    clientY?: number;
  } = {},
): Event {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
  const event = new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    button: options.button ?? 0,
    buttons: options.buttons ?? 1,
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
  });

  if (!('pointerId' in event)) {
    Object.defineProperty(event, 'pointerId', {
      configurable: true,
      value: options.pointerId ?? 1,
    });
  }

  Object.defineProperty(event, 'buttons', {
    configurable: true,
    value: options.buttons ?? 1,
  });

  target.dispatchEvent(event);
  return event;
}

function mockPointerCapture(element: HTMLElement): void {
  Object.defineProperty(element, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(element, 'hasPointerCapture', {
    configurable: true,
    value: vi.fn(() => true),
  });
  Object.defineProperty(element, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
}

function dispatchCompositionEvent(type: string, target: EventTarget): Event {
  const EventCtor = typeof CompositionEvent === 'function' ? CompositionEvent : Event;
  const event = new EventCtor(type, { bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

function dispatchTextInput(
  target: EventTarget,
  options: {
    data?: string;
    inputType?: string;
    isComposing?: boolean;
  } = {},
): Event {
  const EventCtor = typeof InputEvent === 'function' ? InputEvent : Event;
  const event = new EventCtor('input', {
    bubbles: true,
    cancelable: true,
    data: options.data,
    inputType: options.inputType ?? 'insertText',
  } as InputEventInit);

  Object.defineProperty(event, 'isComposing', {
    configurable: true,
    value: options.isComposing ?? false,
  });

  target.dispatchEvent(event);
  return event;
}

function hexChannelToLinear(value: number): number {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  return (
    0.2126 * hexChannelToLinear(red) +
    0.7152 * hexChannelToLinear(green) +
    0.0722 * hexChannelToLinear(blue)
  );
}

function contrastRatio(left: string, right: string): number {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function createTextItem(): WorkbenchTextAnnotationItem {
  return {
    id: 'text-1',
    kind: 'text',
    text: 'Editable label',
    font_family: WORKBENCH_DEFAULT_TEXT_FONT.fontFamily,
    font_size: 30,
    font_weight: WORKBENCH_DEFAULT_TEXT_FONT.fontWeight,
    color: WORKBENCH_DEFAULT_TEXT_COLOR,
    align: 'left',
    x: 10,
    y: 20,
    width: 280,
    height: 84,
    z_index: 1,
    created_at_unix_ms: 1,
    updated_at_unix_ms: 1,
  };
}

function createRegionItem(): WorkbenchBackgroundLayer {
  return {
    id: 'region-1',
    name: 'Focus area',
    fill: WORKBENCH_DEFAULT_REGION_FILL,
    opacity: 0.72,
    material: 'dotted',
    x: 100,
    y: 80,
    width: 560,
    height: 360,
    z_index: 1,
    created_at_unix_ms: 1,
    updated_at_unix_ms: 1,
  };
}

function createStickyItem(): WorkbenchStickyNoteItem {
  return {
    id: 'sticky-1',
    kind: 'sticky_note',
    body: 'Decision note',
    color: 'amber',
    x: 40,
    y: 50,
    width: 260,
    height: 184,
    z_index: 3,
    created_at_unix_ms: 1,
    updated_at_unix_ms: 1,
  };
}

describe('Workbench layer objects', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('keeps a plain text click available for caret placement instead of moving the text box', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onSelect = vi.fn();
    const onCommitMove = vi.fn();

    const dispose = render(() => (
      <WorkbenchTextAnnotation
        item={createTextItem()}
        selected={false}
        editable={true}
        viewportScale={2}
        onSelect={onSelect}
        onCommitMove={onCommitMove}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    ), host);

    const content = host.querySelector('.workbench-text-annotation__content') as HTMLElement | null;
    expect(content).toBeTruthy();
    mockPointerCapture(content!);

    const pointerDown = dispatchPointerEvent('pointerdown', content!, {
      pointerId: 7,
      clientX: 100,
      clientY: 110,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 7,
      clientX: 100,
      clientY: 110,
      buttons: 0,
    });
    await Promise.resolve();

    expect(pointerDown.defaultPrevented).toBe(false);
    expect(onSelect).toHaveBeenCalledWith('text-1');
    expect(onCommitMove).not.toHaveBeenCalled();
    expect(content!.tagName).toBe('DIV');
    expect(content!.getAttribute('contenteditable')).toBe('plaintext-only');

    dispose();
  });

  it('keeps the chrome-less text editor mounted while text input updates annotation state', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const [items, setItems] = createSignal<WorkbenchTextAnnotationItem[]>([createTextItem()]);

    const dispose = render(() => (
      <WorkbenchAnnotationLayerView
        items={items()}
        selectedObject={{ kind: 'annotation', id: 'text-1' }}
        editable={true}
        filtered={false}
        viewport={{ x: 0, y: 0, scale: 1 }}
        onSelect={vi.fn()}
        onCommitMove={vi.fn()}
        onUpdate={(annotationId, patch) => {
          setItems((previous) => previous.map((item) =>
            item.id === annotationId && typeof patch.text === 'string'
              ? { ...item, text: patch.text, updated_at_unix_ms: item.updated_at_unix_ms + 1 }
              : item
          ));
        }}
      />
    ), host);

    const content = host.querySelector('.workbench-text-annotation__content') as HTMLDivElement | null;
    expect(content).toBeTruthy();

    content!.focus();
    const range = document.createRange();
    range.setStart(content!.firstChild ?? content!, 4);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    content!.textContent = 'Editable label!';
    content!.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '!' }));
    await Promise.resolve();

    const nextContent = host.querySelector('.workbench-text-annotation__content') as HTMLDivElement | null;
    expect(nextContent).toBe(content);
    expect(document.activeElement).toBe(content);
    expect(nextContent!.textContent).toBe('Editable label!');

    dispose();
  });

  it('keeps emoji text input in the native plaintext editor state path', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onUpdate = vi.fn();

    const dispose = render(() => (
      <WorkbenchTextAnnotation
        item={createTextItem()}
        selected={true}
        editable={true}
        viewportScale={1}
        onSelect={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    ), host);

    const content = host.querySelector('.workbench-text-annotation__content') as HTMLDivElement | null;
    expect(content).toBeTruthy();

    content!.focus();
    content!.textContent = 'Editable label ✨';
    dispatchTextInput(content!, { data: '✨', inputType: 'insertText' });
    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledWith('text-1', { text: 'Editable label ✨' });
    expect(content!.getAttribute('contenteditable')).toBe('plaintext-only');

    dispose();
  });

  it('keeps text body drags reserved for native editing instead of moving the text box', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onCommitMove = vi.fn();

    const dispose = render(() => (
      <WorkbenchTextAnnotation
        item={createTextItem()}
        selected={true}
        editable={true}
        viewportScale={2}
        onSelect={vi.fn()}
        onCommitMove={onCommitMove}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    ), host);

    const content = host.querySelector('.workbench-text-annotation__content') as HTMLElement | null;
    expect(content).toBeTruthy();
    mockPointerCapture(content!);

    dispatchPointerEvent('pointerdown', content!, {
      pointerId: 8,
      clientX: 100,
      clientY: 110,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 8,
      clientX: 104,
      clientY: 112,
      buttons: 1,
    });
    expect(onCommitMove).not.toHaveBeenCalled();

    dispatchPointerEvent('pointermove', document, {
      pointerId: 8,
      clientX: 130,
      clientY: 132,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 8,
      clientX: 130,
      clientY: 132,
      buttons: 0,
    });
    await Promise.resolve();

    expect(onCommitMove).not.toHaveBeenCalled();

    dispose();
  });

  it('moves the whole text box from the overlay move handle', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onCommitMove = vi.fn();
    const text = createTextItem();

    const dispose = render(() => (
      <WorkbenchLayerControlOverlayView
        annotations={[text]}
        backgroundLayers={[]}
        selectedObject={{ kind: 'annotation', id: text.id }}
        editable={true}
        viewport={{ x: 0, y: 0, scale: 2 }}
        onCommitAnnotationMove={onCommitMove}
        onCommitAnnotationResize={vi.fn()}
        onUpdateTextAnnotation={vi.fn()}
        onDeleteAnnotation={vi.fn()}
        onCommitBackgroundResize={vi.fn()}
        onUpdateBackgroundLayer={vi.fn()}
        onDeleteBackgroundLayer={vi.fn()}
      />
    ), host);

    const move = host.querySelector('.workbench-layer-control--text .workbench-layer-move-handle') as HTMLElement | null;
    expect(move).toBeTruthy();
    mockPointerCapture(move!);

    dispatchPointerEvent('pointerdown', move!, {
      pointerId: 13,
      clientX: 100,
      clientY: 110,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 13,
      clientX: 130,
      clientY: 132,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 13,
      clientX: 130,
      clientY: 132,
      buttons: 0,
    });

    expect(onCommitMove).toHaveBeenCalledWith('text-1', { x: 25, y: 31 });

    dispose();
  });

  it('moves a background region directly from its rectangle body', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onCommitMove = vi.fn();

    const dispose = render(() => (
      <WorkbenchBackgroundRegion
        item={createRegionItem()}
        selected={true}
        editable={true}
        viewportScale={2}
        onSelect={vi.fn()}
        onCommitMove={onCommitMove}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    ), host);

    const region = host.querySelector('.workbench-background-region') as HTMLElement | null;
    expect(region).toBeTruthy();
    expect(region!.style.getPropertyValue('--workbench-region-ink')).toContain('#9da8a1');
    mockPointerCapture(region!);

    dispatchPointerEvent('pointerdown', region!, {
      pointerId: 9,
      clientX: 300,
      clientY: 220,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 9,
      clientX: 340,
      clientY: 250,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 9,
      clientX: 340,
      clientY: 250,
      buttons: 0,
    });

    expect(onCommitMove).toHaveBeenCalledWith('region-1', { x: 120, y: 95 });

    dispose();
  });

  it('keeps region controls in the overlay plane for resize, color, and material edits', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onCommitResize = vi.fn();
    const onUpdate = vi.fn();
    const region = createRegionItem();

    const dispose = render(() => (
      <WorkbenchLayerControlOverlayView
        annotations={[]}
        backgroundLayers={[region]}
        selectedObject={{ kind: 'background_layer', id: region.id }}
        editable={true}
        viewport={{ x: 0, y: 0, scale: 2 }}
        onCommitAnnotationMove={vi.fn()}
        onCommitAnnotationResize={vi.fn()}
        onUpdateTextAnnotation={vi.fn()}
        onDeleteAnnotation={vi.fn()}
        onCommitBackgroundResize={onCommitResize}
        onUpdateBackgroundLayer={onUpdate}
        onDeleteBackgroundLayer={vi.fn()}
      />
    ), host);

    const control = host.querySelector('.workbench-layer-control--region') as HTMLElement | null;
    const resize = host.querySelector('.workbench-layer-control--region .workbench-layer-resize') as HTMLElement | null;
    const color = host.querySelector('button[aria-label="Use region color #a79d8e"]') as HTMLButtonElement | null;
    const material = host.querySelector('button[aria-label="Use region material Grid"]') as HTMLButtonElement | null;
    const materialGroup = host.querySelector('.workbench-region-material-group') as HTMLElement | null;

    expect(control?.getAttribute('data-wb-plane')).toBe('overlay');
    expect(control?.style.transform).toBe('translate(100px, 80px)');
    expect(control?.style.getPropertyValue('--workbench-region-ink')).toContain('#9da8a1');
    expect(resize).toBeTruthy();
    expect(color).toBeTruthy();
    expect(material).toBeTruthy();
    expect(materialGroup?.getAttribute('role')).toBe('group');
    expect(host.querySelectorAll('.workbench-region-material')).toHaveLength(5);
    mockPointerCapture(resize!);

    dispatchPointerEvent('pointerdown', resize!, {
      pointerId: 10,
      clientX: 0,
      clientY: 0,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 10,
      clientX: 100,
      clientY: 80,
      buttons: 1,
    });
    dispatchPointerEvent('pointerup', document, {
      pointerId: 10,
      clientX: 100,
      clientY: 80,
      buttons: 0,
    });

    expect(onCommitResize).toHaveBeenCalledWith('region-1', {
      width: 610,
      height: 400,
    });

    color!.click();
    expect(onUpdate).toHaveBeenCalledWith('region-1', { fill: '#a79d8e' });

    material!.click();
    expect(onUpdate).toHaveBeenCalledWith('region-1', { material: 'grid' });

    dispose();
  });

  it('shares overlay resize previews with the background region body', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onCommitResize = vi.fn();
    const region = createRegionItem();
    let preview: Parameters<typeof WorkbenchBackgroundLayerView>[0]['preview'] = null;

    const dispose = render(() => (
      <>
        <WorkbenchBackgroundLayerView
          items={[region]}
          selectedObject={{ kind: 'background_layer', id: region.id }}
          editable={true}
          filtered={false}
          preview={preview}
          onPreviewGeometry={(next) => {
            preview = next;
          }}
          viewport={{ x: 0, y: 0, scale: 2 }}
          onSelect={vi.fn()}
          onCommitMove={vi.fn()}
        />
        <WorkbenchLayerControlOverlayView
          annotations={[]}
          backgroundLayers={[region]}
          selectedObject={{ kind: 'background_layer', id: region.id }}
          editable={true}
          viewport={{ x: 0, y: 0, scale: 2 }}
          preview={preview}
          onPreviewGeometry={(next) => {
            preview = next;
          }}
          onCommitAnnotationMove={vi.fn()}
          onCommitAnnotationResize={vi.fn()}
          onUpdateTextAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          onCommitBackgroundResize={onCommitResize}
          onUpdateBackgroundLayer={vi.fn()}
          onDeleteBackgroundLayer={vi.fn()}
        />
      </>
    ), host);

    const resize = host.querySelector('.workbench-layer-control--region .workbench-layer-resize') as HTMLElement | null;
    expect(resize).toBeTruthy();
    mockPointerCapture(resize!);

    dispatchPointerEvent('pointerdown', resize!, {
      pointerId: 11,
      clientX: 0,
      clientY: 0,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 11,
      clientX: 80,
      clientY: 40,
      buttons: 1,
    });

    expect(preview).toEqual({
      kind: 'background_layer',
      id: 'region-1',
      x: 100,
      y: 80,
      width: 600,
      height: 380,
    });

    dispatchPointerEvent('pointerup', document, {
      pointerId: 11,
      clientX: 80,
      clientY: 40,
      buttons: 0,
    });

    expect(onCommitResize).toHaveBeenCalledWith('region-1', {
      width: 600,
      height: 380,
    });
    expect(preview).toBeNull();

    dispose();
  });

  it('shares overlay resize previews with the text annotation body', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onCommitResize = vi.fn();
    const text = createTextItem();
    let preview: Parameters<typeof WorkbenchAnnotationLayerView>[0]['preview'] = null;

    const dispose = render(() => (
      <>
        <WorkbenchAnnotationLayerView
          items={[text]}
          selectedObject={{ kind: 'annotation', id: text.id }}
          editable={true}
          filtered={false}
          preview={preview}
          onPreviewGeometry={(next) => {
            preview = next;
          }}
          viewport={{ x: 0, y: 0, scale: 2 }}
          onSelect={vi.fn()}
          onCommitMove={vi.fn()}
          onUpdate={vi.fn()}
        />
        <WorkbenchLayerControlOverlayView
          annotations={[text]}
          backgroundLayers={[]}
          selectedObject={{ kind: 'annotation', id: text.id }}
          editable={true}
          viewport={{ x: 0, y: 0, scale: 2 }}
          preview={preview}
          onPreviewGeometry={(next) => {
            preview = next;
          }}
          onCommitAnnotationMove={vi.fn()}
          onCommitAnnotationResize={onCommitResize}
          onUpdateTextAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          onCommitBackgroundResize={vi.fn()}
          onUpdateBackgroundLayer={vi.fn()}
          onDeleteBackgroundLayer={vi.fn()}
        />
      </>
    ), host);

    const resize = host.querySelector('.workbench-layer-control--text .workbench-layer-resize') as HTMLElement | null;
    expect(resize).toBeTruthy();
    mockPointerCapture(resize!);

    dispatchPointerEvent('pointerdown', resize!, {
      pointerId: 12,
      clientX: 0,
      clientY: 0,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 12,
      clientX: 60,
      clientY: 48,
      buttons: 1,
    });

    expect(preview).toEqual({
      kind: 'annotation',
      id: 'text-1',
      x: 10,
      y: 20,
      width: 310,
      height: 108,
    });

    dispatchPointerEvent('pointerup', document, {
      pointerId: 12,
      clientX: 60,
      clientY: 48,
      buttons: 0,
    });

    expect(onCommitResize).toHaveBeenCalledWith('text-1', {
      width: 310,
      height: 108,
    });
    expect(preview).toBeNull();

    dispose();
  });

  it('uses a compact text size stepper and cross-theme readable text swatches', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const text = createTextItem();
    const onUpdate = vi.fn();

    const dispose = render(() => (
      <WorkbenchLayerControlOverlayView
        annotations={[text]}
        backgroundLayers={[]}
        selectedObject={{ kind: 'annotation', id: text.id }}
        editable={true}
        viewport={{ x: 0, y: 0, scale: 1 }}
        onCommitAnnotationMove={vi.fn()}
        onCommitAnnotationResize={vi.fn()}
        onUpdateTextAnnotation={onUpdate}
        onDeleteAnnotation={vi.fn()}
        onCommitBackgroundResize={vi.fn()}
        onUpdateBackgroundLayer={vi.fn()}
        onDeleteBackgroundLayer={vi.fn()}
      />
    ), host);

    const stepper = host.querySelector('.workbench-text-size-stepper') as HTMLElement | null;
    const input = host.querySelector('.workbench-text-size-stepper .workbench-text-annotation__size-input') as HTMLInputElement | null;
    const readableSwatch = host.querySelector(`button[aria-label="Use text color ${WORKBENCH_TEXT_COLOR_OPTIONS[1]}"]`) as HTMLButtonElement | null;
    const decrease = host.querySelector('button[aria-label="Decrease text size"]') as HTMLButtonElement | null;

    expect(stepper?.getAttribute('role')).toBe('group');
    expect(input).toBeTruthy();
    expect(readableSwatch).toBeTruthy();
    expect(WORKBENCH_TEXT_COLOR_OPTIONS).not.toContain('#f8fafc');
    expect(decrease).toBeTruthy();

    readableSwatch!.click();
    expect(onUpdate).toHaveBeenCalledWith('text-1', { color: WORKBENCH_TEXT_COLOR_OPTIONS[1] });

    decrease!.click();
    expect(onUpdate).toHaveBeenCalledWith('text-1', { font_size: 29 });

    dispose();
  });

  it('offers multiple bold text font presets in a popup that updates family and weight together', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const text = createTextItem();
    const onUpdate = vi.fn();

    const dispose = render(() => (
      <WorkbenchLayerControlOverlayView
        annotations={[text]}
        backgroundLayers={[]}
        selectedObject={{ kind: 'annotation', id: text.id }}
        editable={true}
        viewport={{ x: 0, y: 0, scale: 1 }}
        onCommitAnnotationMove={vi.fn()}
        onCommitAnnotationResize={vi.fn()}
        onUpdateTextAnnotation={onUpdate}
        onDeleteAnnotation={vi.fn()}
        onCommitBackgroundResize={vi.fn()}
        onUpdateBackgroundLayer={vi.fn()}
        onDeleteBackgroundLayer={vi.fn()}
      />
    ), host);

    const fontTrigger = host.querySelector('button[aria-label="Choose bold font"]') as HTMLButtonElement | null;
    expect(fontTrigger).toBeTruthy();
    expect(fontTrigger?.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelectorAll('.workbench-text-font-option')).toHaveLength(0);

    fontTrigger!.click();
    expect(fontTrigger?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('.workbench-text-font-popover')?.getAttribute('role')).toBe('menu');
    expect(host.querySelectorAll('.workbench-text-font-option')).toHaveLength(WORKBENCH_TEXT_FONT_OPTIONS.length);

    const roundFont = WORKBENCH_TEXT_FONT_OPTIONS.find((font) => font.id === 'round')!;
    const roundButton = host.querySelector(`button[aria-label="Use ${roundFont.label} bold font"]`) as HTMLButtonElement | null;
    expect(roundButton).toBeTruthy();
    roundButton!.click();

    expect(onUpdate).toHaveBeenCalledWith('text-1', {
      font_family: roundFont.fontFamily,
      font_weight: roundFont.fontWeight,
    });
    expect(fontTrigger?.getAttribute('aria-expanded')).toBe('false');

    dispose();
  });

  it('inserts emoji from the text toolbar at the current caret position', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const [items, setItems] = createSignal<WorkbenchTextAnnotationItem[]>([createTextItem()]);
    const registry = createWorkbenchTextEditorRegistry();

    const dispose = render(() => (
      <>
        <WorkbenchAnnotationLayerView
          items={items()}
          selectedObject={{ kind: 'annotation', id: 'text-1' }}
          editable={true}
          filtered={false}
          viewport={{ x: 0, y: 0, scale: 1 }}
          textEditorRegistry={registry}
          onSelect={vi.fn()}
          onCommitMove={vi.fn()}
          onUpdate={(annotationId, patch) => {
            setItems((previous) => previous.map((item) =>
              item.id === annotationId && typeof patch.text === 'string'
                ? { ...item, text: patch.text, updated_at_unix_ms: item.updated_at_unix_ms + 1 }
                : item
            ));
          }}
        />
        <WorkbenchLayerControlOverlayView
          annotations={items()}
          backgroundLayers={[]}
          selectedObject={{ kind: 'annotation', id: 'text-1' }}
          editable={true}
          viewport={{ x: 0, y: 0, scale: 1 }}
          textEditorRegistry={registry}
          onCommitAnnotationMove={vi.fn()}
          onCommitAnnotationResize={vi.fn()}
          onUpdateTextAnnotation={vi.fn()}
          onDeleteAnnotation={vi.fn()}
          onCommitBackgroundResize={vi.fn()}
          onUpdateBackgroundLayer={vi.fn()}
          onDeleteBackgroundLayer={vi.fn()}
        />
      </>
    ), host);

    const content = host.querySelector('.workbench-text-annotation__content') as HTMLDivElement | null;
    expect(content?.firstChild).toBeTruthy();

    content!.focus();
    const range = document.createRange();
    range.setStart(content!.firstChild!, 'Editable '.length);
    range.collapse(true);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const emojiTrigger = host.querySelector('button[aria-label="Insert emoji"]') as HTMLButtonElement | null;
    expect(emojiTrigger).toBeTruthy();
    expect(emojiTrigger?.getAttribute('aria-expanded')).toBe('false');

    emojiTrigger!.click();
    expect(emojiTrigger?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelectorAll('.workbench-text-emoji-option')).toHaveLength(WORKBENCH_TEXT_EMOJI_OPTIONS.length);
    expect(Math.ceil(WORKBENCH_TEXT_EMOJI_OPTIONS.length / 6)).toBeGreaterThanOrEqual(5);

    const emoji = WORKBENCH_TEXT_EMOJI_OPTIONS[0];
    const emojiButton = host.querySelector(`button[aria-label="Insert emoji ${emoji}"]`) as HTMLButtonElement | null;
    expect(emojiButton).toBeTruthy();
    emojiButton!.click();
    await Promise.resolve();

    const [updatedItem] = untrack(items);
    expect(updatedItem?.text).toBe(`Editable ${emoji}label`);
    expect(content!.textContent).toBe(`Editable ${emoji}label`);
    expect(emojiTrigger?.getAttribute('aria-expanded')).toBe('false');

    dispose();
  });

  it('uses shared color options for text and region controls', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const text = createTextItem();
    const region = createRegionItem();

    const dispose = render(() => (
      <WorkbenchLayerControlOverlayView
        annotations={[text]}
        backgroundLayers={[region]}
        selectedObject={{ kind: 'annotation', id: text.id }}
        editable={true}
        viewport={{ x: 0, y: 0, scale: 1 }}
        onCommitAnnotationMove={vi.fn()}
        onCommitAnnotationResize={vi.fn()}
        onUpdateTextAnnotation={vi.fn()}
        onDeleteAnnotation={vi.fn()}
        onCommitBackgroundResize={vi.fn()}
        onUpdateBackgroundLayer={vi.fn()}
        onDeleteBackgroundLayer={vi.fn()}
      />
    ), host);

    for (const color of WORKBENCH_TEXT_COLOR_OPTIONS) {
      expect(host.querySelector(`button[aria-label="Use text color ${color}"]`)).toBeTruthy();
      expect(contrastRatio(color, '#ffffff')).toBeGreaterThanOrEqual(4.3);
      expect(contrastRatio(color, '#000000')).toBeGreaterThanOrEqual(4.3);
    }
    expect(WORKBENCH_TEXT_COLOR_OPTIONS).toContain(text.color);
    expect(WORKBENCH_REGION_FILL_OPTIONS).toContain(region.fill);

    dispose();

    const regionHost = document.createElement('div');
    document.body.appendChild(regionHost);
    const disposeRegion = render(() => (
      <WorkbenchLayerControlOverlayView
        annotations={[text]}
        backgroundLayers={[region]}
        selectedObject={{ kind: 'background_layer', id: region.id }}
        editable={true}
        viewport={{ x: 0, y: 0, scale: 1 }}
        onCommitAnnotationMove={vi.fn()}
        onCommitAnnotationResize={vi.fn()}
        onUpdateTextAnnotation={vi.fn()}
        onDeleteAnnotation={vi.fn()}
        onCommitBackgroundResize={vi.fn()}
        onUpdateBackgroundLayer={vi.fn()}
        onDeleteBackgroundLayer={vi.fn()}
      />
    ), regionHost);

    for (const fill of WORKBENCH_REGION_FILL_OPTIONS) {
      expect(regionHost.querySelector(`button[aria-label="Use region color ${fill}"]`)).toBeTruthy();
    }

    disposeRegion();
  });

  it('sanitizes persisted layer colors back to the visible palette options', () => {
    const state = sanitizeWorkbenchState({
      version: 1,
      widgets: [],
      viewport: { x: 0, y: 0, scale: 1 },
      locked: false,
      filters: {},
      selectedWidgetId: null,
      theme: 'default',
      stickyNotes: [{ ...createStickyItem(), color: 'graphite' }],
      annotations: [{ ...createTextItem(), color: '#ffffff' }],
      backgroundLayers: [{ ...createRegionItem(), fill: '#ff00ff' }],
    });

    expect(state.stickyNotes?.[0]?.color).toBe('amber');
    expect(state.annotations?.[0]?.color).toBe(WORKBENCH_DEFAULT_TEXT_COLOR);
    expect(state.backgroundLayers?.[0]?.fill).toBe(WORKBENCH_DEFAULT_REGION_FILL);
  });

  it('renders sticky notes as note-style editable cards with a dedicated content copy button', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onSelect = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const dispose = render(() => (
      <WorkbenchStickyNote
        item={createStickyItem()}
        selected={true}
        viewportScale={1}
        renderLayer={1}
        topRenderLayer={3}
        locked={false}
        filtered={false}
        onSelect={onSelect}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    ), host);

    expect(host.querySelector('.workbench-sticky__label')).toBeNull();
    expect(host.querySelector('.workbench-sticky__number')).toBeNull();

    const body = host.querySelector('.workbench-sticky__body') as HTMLElement | null;
    const resize = host.querySelector('.workbench-sticky__resize') as HTMLElement | null;
    expect(body).toBeTruthy();
    expect(resize).toBeTruthy();
    dispatchPointerEvent('pointerdown', body!, { pointerId: 20, clientX: 48, clientY: 62 });
    body!.click();
    expect(onSelect).toHaveBeenCalledWith('sticky-1');

    const copy = host.querySelector('button[aria-label="Copy sticky note content"]') as HTMLElement | null;
    expect(copy).toBeTruthy();
    dispatchPointerEvent('pointerdown', copy!, { pointerId: 21, clientX: 62, clientY: 72 });
    copy!.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('Decision note');
    expect(copy!.querySelector('svg')).toBeTruthy();
    expect(copy!.classList.contains('is-success')).toBe(true);

    dispose();
  });

  it('keeps the sticky note resize hit area larger than its visual glyph', () => {
    const cssPath = resolve(process.cwd(), 'src/components/workbench/workbench.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('.workbench-sticky__resize {');
    expect(css).toContain('width: 34px;');
    expect(css).toContain('height: 34px;');
    expect(css).toContain('z-index: 4;');
    expect(css).toContain('pointer-events: auto;');
    expect(css).toContain('.workbench-sticky__resize::after {');
    expect(css).toContain('width: 10px;');
    expect(css).toContain('height: 10px;');
  });

  it('keeps region dotted material visible and sticky notes visually brighter than regions', () => {
    const cssPath = resolve(process.cwd(), 'src/components/workbench/workbench.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('radial-gradient(circle, color-mix(in srgb, var(--workbench-region-ink) 70%, transparent) 1.45px');
    expect(css).toContain('background-size: 11px 11px, auto;');
    expect(css).toContain('--workbench-sticky-surface: #fff2bd;');
    expect(css).toContain('--workbench-sticky-accent: #8fae72;');
    expect(css).toContain('--workbench-sticky-ink: #302616;');
    expect(css).toContain('.workbench-text-font-popover {');
    expect(css).not.toContain('oklch(0.91 0.19 88)');
  });

  it('keeps sticky note IME composition inside a stable plaintext editor until composition ends', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onUpdate = vi.fn();

    const dispose = render(() => (
      <WorkbenchStickyNote
        item={createStickyItem()}
        selected={true}
        viewportScale={1}
        renderLayer={1}
        topRenderLayer={3}
        locked={false}
        filtered={false}
        onSelect={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    ), host);

    const body = host.querySelector('.workbench-sticky__body') as HTMLDivElement | null;
    expect(body).toBeTruthy();
    expect(body!.getAttribute('contenteditable')).toBe('plaintext-only');

    body!.focus();
    dispatchCompositionEvent('compositionstart', body!);
    body!.textContent = '中文输入';
    dispatchTextInput(body!, { data: '输', inputType: 'insertCompositionText', isComposing: true });
    await Promise.resolve();

    const bodyDuringComposition = host.querySelector('.workbench-sticky__body') as HTMLDivElement | null;
    expect(bodyDuringComposition).toBe(body);
    expect(bodyDuringComposition!.textContent).toBe('中文输入');
    expect(onUpdate).not.toHaveBeenCalled();

    dispatchCompositionEvent('compositionend', body!);
    await Promise.resolve();

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith('sticky-1', { body: '中文输入' });
    expect(host.querySelector('.workbench-sticky__body')).toBe(body);

    dispose();
  });

  it('copies the live sticky editor text while the note is being edited', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const dispose = render(() => (
      <WorkbenchStickyNote
        item={createStickyItem()}
        selected={true}
        viewportScale={1}
        renderLayer={1}
        topRenderLayer={3}
        locked={false}
        filtered={false}
        onSelect={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    ), host);

    const body = host.querySelector('.workbench-sticky__body') as HTMLDivElement | null;
    const copy = host.querySelector('button[aria-label="Copy sticky note content"]') as HTMLElement | null;
    expect(body).toBeTruthy();
    expect(copy).toBeTruthy();

    body!.textContent = '临时中文内容';
    dispatchPointerEvent('pointerdown', copy!, { pointerId: 25, clientX: 62, clientY: 72 });
    copy!.click();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith('临时中文内容');

    dispose();
  });

  it('uses the widget-like live drag lifecycle for sticky notes', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const calls: string[] = [];
    const onCommitMove = vi.fn(() => calls.push('move'));
    const onCommitFront = vi.fn(() => calls.push('front'));

    const dispose = render(() => (
      <WorkbenchStickyNote
        item={createStickyItem()}
        selected={true}
        viewportScale={2}
        renderLayer={1}
        topRenderLayer={3}
        locked={false}
        filtered={false}
        onSelect={vi.fn()}
        onStartOptimisticFront={(noteId) => {
          expect(noteId).toBe('sticky-1');
          calls.push('optimistic');
        }}
        onCommitFront={onCommitFront}
        onCommitMove={onCommitMove}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onLayoutInteractionStart={() => calls.push('layout-start')}
        onLayoutInteractionEnd={() => calls.push('layout-end')}
      />
    ), host);

    const grip = host.querySelector('.workbench-sticky__grip') as HTMLElement | null;
    const sticky = host.querySelector('.workbench-sticky') as HTMLElement | null;
    expect(grip).toBeTruthy();
    expect(sticky).toBeTruthy();
    mockPointerCapture(grip!);

    dispatchPointerEvent('pointerdown', grip!, {
      pointerId: 22,
      clientX: 100,
      clientY: 110,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 22,
      clientX: 130,
      clientY: 132,
      buttons: 1,
    });
    expect(sticky!.classList.contains('is-dragging')).toBe(true);
    expect(sticky!.style.transform).toBe('translate(55px, 61px)');
    dispatchPointerEvent('pointerup', document, {
      pointerId: 22,
      clientX: 130,
      clientY: 132,
      buttons: 0,
    });

    expect(onCommitFront).toHaveBeenCalledWith('sticky-1');
    expect(onCommitMove).toHaveBeenCalledWith('sticky-1', { x: 55, y: 61 });
    expect(calls).toEqual(['optimistic', 'layout-start', 'front', 'move', 'layout-end']);

    dispose();
  });

  it('uses screen-space projection while a sticky note is being dragged in projected mode', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const dispose = render(() => (
      <WorkbenchStickyNote
        item={createStickyItem()}
        selected={true}
        viewportScale={2}
        projectedViewport={() => ({ x: 100, y: 200, scale: 2 })}
        renderLayer={1}
        topRenderLayer={3}
        locked={false}
        filtered={false}
        onSelect={vi.fn()}
        onCommitFront={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    ), host);

    const grip = host.querySelector('.workbench-sticky__grip') as HTMLElement | null;
    const sticky = host.querySelector('.workbench-sticky') as HTMLElement | null;
    expect(grip).toBeTruthy();
    expect(sticky).toBeTruthy();
    mockPointerCapture(grip!);

    dispatchPointerEvent('pointerdown', grip!, {
      pointerId: 23,
      clientX: 100,
      clientY: 110,
      buttons: 1,
    });
    dispatchPointerEvent('pointermove', document, {
      pointerId: 23,
      clientX: 130,
      clientY: 132,
      buttons: 1,
    });

    expect(sticky!.classList.contains('is-dragging')).toBe(true);
    expect(sticky!.style.transform).toBe('translate(210px, 322px) scale(2)');

    dispatchPointerEvent('pointerup', document, {
      pointerId: 23,
      clientX: 130,
      clientY: 132,
      buttons: 0,
    });

    dispose();
  });

  it('keeps sticky drag state alive when canvas selection replaces the note object', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const [notes, setNotes] = createSignal<WorkbenchStickyNoteItem[]>([createStickyItem()]);
    const [selectedObject, setSelectedObject] = createSignal<WorkbenchSelection | null>(null);

    const dispose = render(() => (
      <WorkbenchCanvasField
        widgetDefinitions={[]}
        widgets={[]}
        stickyNotes={notes()}
        viewport={{ x: 0, y: 0, scale: 2 }}
        selectedWidgetId={null}
        selectedObject={selectedObject()}
        optimisticFrontWidgetId={selectedObject()?.id ?? null}
        viewportScale={2}
        locked={false}
        filters={{ [WORKBENCH_STICKY_FILTER_ID]: true }}
        onSelectWidget={vi.fn()}
        onWidgetContextMenu={vi.fn()}
        onStartOptimisticFront={vi.fn()}
        onCommitFront={vi.fn()}
        onCommitMove={vi.fn()}
        onCommitResize={vi.fn()}
        onSelectStickyNote={(noteId) => {
          setSelectedObject({ kind: 'sticky_note', id: noteId });
          setNotes((previous) => previous.map((item) =>
            item.id === noteId
              ? { ...item, z_index: item.z_index + 1, updated_at_unix_ms: item.updated_at_unix_ms + 1 }
              : item
          ));
        }}
        onStartStickyOptimisticFront={vi.fn()}
        onCommitStickyFront={vi.fn()}
        onCommitStickyMove={vi.fn()}
        onCommitStickyResize={vi.fn()}
        onUpdateStickyNote={vi.fn()}
        onDeleteStickyNote={vi.fn()}
        onViewportCommit={vi.fn()}
        onRequestOverview={vi.fn()}
        onRequestFit={vi.fn()}
        onRequestDelete={vi.fn()}
      />
    ), host);

    const grip = host.querySelector('.workbench-sticky__grip') as HTMLElement | null;
    const sticky = host.querySelector('.workbench-sticky') as HTMLElement | null;
    expect(grip).toBeTruthy();
    expect(sticky).toBeTruthy();
    mockPointerCapture(grip!);

    dispatchPointerEvent('pointerdown', grip!, {
      pointerId: 24,
      clientX: 100,
      clientY: 110,
      buttons: 1,
    });
    await Promise.resolve();

    const stickyAfterSelection = host.querySelector('.workbench-sticky') as HTMLElement | null;
    expect(stickyAfterSelection).toBe(sticky);

    dispatchPointerEvent('pointermove', document, {
      pointerId: 24,
      clientX: 130,
      clientY: 132,
      buttons: 1,
    });

    expect(sticky!.classList.contains('is-dragging')).toBe(true);
    expect(sticky!.style.transform).toBe('translate(55px, 61px)');

    dispatchPointerEvent('pointerup', document, {
      pointerId: 24,
      clientX: 130,
      clientY: 132,
      buttons: 0,
    });

    dispose();
  });
});
