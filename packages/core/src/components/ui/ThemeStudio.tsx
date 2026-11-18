import { For, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js';
import { Plus, Download, Upload, Sparkles, Check, Pencil } from '../icons';
import { Button } from './Button';
import { Input, Textarea } from './Input';
import { Dialog } from './Dialog';
import { FLOE_THEME_FILE_LIMIT, floeThemeContrastIssue, readFloeThemeDocument, resolveFloeThemeDocument, type FloeThemeDocument } from '../../themes';

export type ThemeStudioLabel = 'create' | 'edit' | 'import' | 'export' | 'generate' | 'name' | 'colors' | 'advanced' | 'save' | 'cancel' | 'invalid' | 'failed' | 'background' | 'foreground' | 'primary' | 'card' | 'sidebar' | 'border';
export interface ThemeStudioProps {
  active: boolean;
  current: FloeThemeDocument;
  currentID?: string;
  label: (key: ThemeStudioLabel) => string;
  save: (document: FloeThemeDocument, existingID?: string) => Promise<void>;
  generate?: (base: FloeThemeDocument) => void;
}

export function ThemeStudio(props: ThemeStudioProps) {
  const [open, setOpen] = createSignal(false), [pending, setPending] = createSignal(false);
  const [raw, setRaw] = createSignal(''), [editing, setEditing] = createSignal<string>();
  const [error, setError] = createSignal('');
  let fileInput!: HTMLInputElement;
  let lifetime = 0;
  createEffect(() => { if (!props.active) { lifetime++; setOpen(false); setError(''); } });
  onCleanup(() => { lifetime++; });
  const decode = createMemo(() => {
    try { return { doc: readFloeThemeDocument(raw()) }; } catch (reason) { return { issue: reason instanceof SyntaxError ? 'JSON' : (reason as Error).message }; }
  });
  const preview = createMemo(() => { const doc = decode().doc; return doc && resolveFloeThemeDocument('draft', doc); });
  const issue = createMemo(() => { const doc = decode().doc; return doc ? floeThemeContrastIssue(doc) : decode().issue; });
  const fields = createMemo(() => { try { return JSON.parse(raw()) as FloeThemeDocument | null; } catch { return null; } });
  const show = (doc: FloeThemeDocument, existing?: string) => {
    setEditing(existing); setRaw(JSON.stringify(doc, null, 2)); setError(''); setOpen(true);
  };
  const importFile = async (file?: File) => {
    if (!file || !props.active) return;
    const admission = ++lifetime;
    try {
      if (file.size > FLOE_THEME_FILE_LIMIT) throw new Error('32 KiB');
      const doc = readFloeThemeDocument(await file.text());
      if (admission === lifetime && props.active) show(doc);
    } catch (reason) { if (admission === lifetime) setError(`${props.label('invalid')}: ${reason instanceof SyntaxError ? 'JSON' : (reason as Error).message}`); }
  };
  const exportFile = () => {
    const doc = props.current, url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.download = `${doc.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 64)}.floe-theme.json`; link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = async () => {
    const doc = decode().doc;
    if (!doc || issue() || !open() || !props.active || pending()) return;
    setPending(true); setError('');
    const admission = lifetime;
    try { await props.save(doc, editing()); if (admission === lifetime) setOpen(false); }
    catch { if (admission === lifetime) setError(props.label('failed')); }
    finally { setPending(false); }
  };
  const roles = ['background', 'card', 'sidebar', 'foreground', 'primary', 'border'] as const;
  return <>
    <div class="floe-theme-studio__actions">
      <input ref={fileInput} hidden type="file" accept=".json,application/json" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void importFile(file); }} />
      <Button size="sm" icon={Plus} variant="outline" disabled={!props.active} onClick={() => show({ ...props.current, name: props.label('create') })}>{props.label('create')}</Button>
      <Show when={props.currentID}><Button size="icon" icon={Pencil} disabled={!props.active} variant="ghost" aria-label={props.label('edit')} title={props.label('edit')} onClick={() => show(props.current, props.currentID)} /></Show>
      <Button size="icon" icon={Upload} disabled={!props.active} variant="ghost" aria-label={props.label('import')} title={props.label('import')} onClick={() => fileInput.click()} />
      <Button size="icon" icon={Download} disabled={!props.active} variant="ghost" aria-label={props.label('export')} title={props.label('export')} onClick={exportFile} />
      <Show when={props.generate}><Button size="sm" icon={Sparkles} disabled={!props.active} variant="secondary" onClick={() => props.generate?.(props.current)}>{props.label('generate')}</Button></Show>
    </div>
    <Show when={error() && !open()}><p role="alert" class="floe-theme-picker__error">{error()}</p></Show>
    <Dialog open={props.active && open()} title={props.label(editing() ? 'edit' : 'create')} closeLabel={props.label('cancel')} onOpenChange={next => { if (!pending()) setOpen(next); }}
      footer={<><Button variant="ghost" disabled={pending()} onClick={() => setOpen(false)}>{props.label('cancel')}</Button><Button icon={Check} loading={pending()} disabled={!!issue()} onClick={() => void save()}>{props.label('save')}</Button></>}>
      <div class="floe-theme-studio__body">
        <label>{props.label('name')}<Input maxLength={80} value={typeof fields()?.name === 'string' ? fields()!.name : ''} disabled={pending() || !fields()} onInput={event => { const doc = fields(); if (doc) setRaw(JSON.stringify({ ...doc, name: event.currentTarget.value }, null, 2)); }} /></label>
        <div class="floe-theme-studio__sample" aria-hidden="true" style={{ background: preview()?.preview?.background, color: preview()?.semanticTokens?.['--foreground'], 'border-color': preview()?.preview?.border }}>
          <aside style={{ background: preview()?.preview?.sidebar }}><i/><i/><i/></aside>
          <div style={{ background: preview()?.preview?.surface }}><strong>Aa</strong><span style={{ background: preview()?.preview?.primary }} /><section><For each={preview()?.preview?.colors}>{color => <i style={{ background: color }} />}</For></section></div>
        </div>
        <fieldset disabled={pending() || !decode().doc}><legend>{props.label('colors')}</legend><div class="floe-theme-studio__swatches"><For each={roles}>{role => <label>
          <input type="color" value={preview()?.semanticTokens?.[`--${role}`]} onInput={event => { const doc = decode().doc; if (doc) setRaw(JSON.stringify({ ...doc, colors: { ...doc.colors, [`--${role}`]: event.currentTarget.value } }, null, 2)); }} />{props.label(role)}
        </label>}</For></div></fieldset>
        <details><summary>{props.label('advanced')}</summary><Textarea aria-label={props.label('advanced')} value={raw()} rows={9} spellcheck={false} disabled={pending()} onInput={event => setRaw(event.currentTarget.value)} /></details>
        <Show when={error() || issue()}><p role="alert" class="floe-theme-picker__error">{error() || `${props.label('invalid')}: ${issue()}`}</p></Show>
      </div>
    </Dialog>
  </>;
}
