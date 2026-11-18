import { For, Show, createEffect, createMemo, createSignal, onCleanup, type JSX } from 'solid-js';
import { Plus, Download, Upload, Sparkles, Check, Pencil, Eye, ChevronLeft, ChevronRight } from '../icons';
import { Button } from './Button';
import { Input, Textarea } from './Input';
import { Dialog } from './Dialog';
import { PORTABLE_THEME_LIMIT, createBlankShellTheme, portableContrastIssue, readPortableShellTheme, resolvePortableShellTheme, type FloeThemePreset, type PortableShellTheme } from '../../themes';
import { ThemeFields, type ThemeFieldLabel } from './ThemeFields';

export type ThemeStudioLabel = ThemeFieldLabel | 'blank' | 'light' | 'dark' | 'compare' | 'create' | 'edit' | 'import' | 'export' | 'generate' | 'name' | 'colors' | 'advanced' | 'save' | 'cancel' | 'invalid' | 'failed' | 'background' | 'foreground' | 'primary' | 'card' | 'sidebar' | 'border';
export interface ThemeStudioProps {
  active: boolean;
  current: PortableShellTheme;
  parts?: readonly string[];
  features?: readonly string[];
  renderPreview?: (preset: FloeThemePreset, inspect: (group: 'colors'|'parts'|'editor'|'terminal', role: string) => void) => JSX.Element;
  currentID?: string;
  label: (key: ThemeStudioLabel) => string;
  save: (document: PortableShellTheme, existingID?: string) => Promise<void>;
  generate?: (base: PortableShellTheme) => void;
}

export function ThemeStudio(props: ThemeStudioProps) {
  const [open, setOpen] = createSignal(false), [pending, setPending] = createSignal(false);
  const [raw, setRaw] = createSignal(''), [editing, setEditing] = createSignal<string>();
  const [error, setError] = createSignal('');
  const [fieldError, setFieldError] = createSignal('');
  const [original,setOriginal] = createSignal<PortableShellTheme>(), [compare,setCompare] = createSignal(false);
  const [inspect,setInspect] = createSignal<{group:'colors'|'parts'|'editor'|'terminal';role:string}>();
  let fileInput!: HTMLInputElement;
  let lifetime = 0;
  const [history, setHistory] = createSignal<string[]>([]), [future, setFuture] = createSignal<string[]>([]);
  const write = (value: string) => { if (value === raw()) return; setHistory([...history().slice(-39), raw()]); setFuture([]); setRaw(value); };
  const undo = () => { const last = history().at(-1); if (last === undefined) return; setFuture([...future(), raw()]); setHistory(history().slice(0, -1)); setRaw(last); };
  const redo = () => { const last = future().at(-1); if (last === undefined) return; setHistory([...history(), raw()]); setFuture(future().slice(0, -1)); setRaw(last); };
  createEffect(() => { if (!props.active) { lifetime++; setOpen(false); setError(''); } });
  onCleanup(() => { lifetime++; });
  const decode = createMemo(() => {
    try { return { doc: readPortableShellTheme(raw()) }; } catch (reason) { return { issue: reason instanceof SyntaxError ? 'JSON' : (reason as Error).message }; }
  });
  const preview = createMemo(() => { const doc = compare() ? original() : decode().doc; return doc && resolvePortableShellTheme('draft', doc); });
  createEffect(() => { raw(); setFieldError(''); });
  const issue = createMemo(() => { const doc = decode().doc; return fieldError() || (doc ? portableContrastIssue(doc) : decode().issue); });
  const fields = createMemo(() => { try { return JSON.parse(raw()) as PortableShellTheme | null; } catch { return null; } });
  const show = (doc: PortableShellTheme, existing?: string) => {
    setHistory([]); setFuture([]); setFieldError('');
    setOriginal(doc); setCompare(false); setInspect(undefined);
    setEditing(existing); setRaw(JSON.stringify(doc, null, 2)); setError(''); setOpen(true);
  };
  const importFile = async (file?: File) => {
    if (!file || !props.active) return;
    const admission = ++lifetime;
    try {
      if (file.size > PORTABLE_THEME_LIMIT) throw new Error('128 KiB');
      const doc = readPortableShellTheme(await file.text());
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
  const draftAction = (action: (doc: PortableShellTheme) => void) => { const doc = decode().doc; if (props.active && open() && !pending() && doc && !fieldError()) action(doc); };
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
    <Dialog class="floe-theme-studio" open={props.active && open()} title={props.label(editing() ? 'edit' : 'create')} closeLabel={props.label('cancel')} onOpenChange={next => { if (!pending()) setOpen(next); }}
      footer={<><Button variant="ghost" disabled={pending()} onClick={() => setOpen(false)}>{props.label('cancel')}</Button><Button icon={Check} loading={pending()} disabled={!!issue()} onClick={() => void save()}>{props.label('save')}</Button></>}>
      <div class="floe-theme-studio__body">
        <label>{props.label('name')}<Input maxLength={80} value={typeof fields()?.name === 'string' ? fields()!.name : ''} disabled={pending() || !fields()} onInput={event => { const doc = fields(); if (doc) write(JSON.stringify({ ...doc, name: event.currentTarget.value }, null, 2)); }} /></label>
        <Show when={!editing()}><div class="floe-theme-studio__actions"><select aria-label={props.label('settings')} value={decode().doc?.mode} disabled={pending() || !decode().doc} onChange={event => { const mode = event.currentTarget.value; if (mode === 'light' || mode === 'dark') draftAction(doc => write(JSON.stringify({...doc,mode}, null, 2))); }}><For each={['light','dark'] as const}>{mode => <option value={mode}>{props.label(mode)}</option>}</For></select><Button size="sm" variant="ghost" disabled={pending() || !decode().doc} onClick={() => draftAction(doc => write(JSON.stringify(createBlankShellTheme(doc.mode,doc.name),null,2)))}>{props.label('blank')}</Button></div></Show>
        <Show when={props.renderPreview && preview()} fallback={<div class="floe-theme-studio__sample" aria-hidden="true" style={{ background: preview()?.preview?.background, color: preview()?.semanticTokens?.['--foreground'], 'border-color': preview()?.preview?.border }}>
          <aside style={{ background: preview()?.preview?.sidebar }}><i/><i/><i/></aside>
          <div style={{ background: preview()?.preview?.surface }}><strong>Aa</strong><span style={{ background: preview()?.preview?.primary }} /><section><For each={preview()?.preview?.colors}>{color => <i style={{ background: color }} />}</For></section></div>
        </div>}>{preset => props.renderPreview!(preset(),(group,role) => setInspect({group,role}))}</Show>
        <fieldset disabled={pending() || !decode().doc}><legend>{props.label('colors')}</legend><div class="floe-theme-studio__swatches"><For each={roles}>{role => <label>
          <input type="color" value={preview()?.semanticTokens?.[`--${role}`]?.slice(0,7)} onInput={event => { const doc = decode().doc; if (doc) write(JSON.stringify({ ...doc, colors: { ...doc.colors, [`--${role}`]: event.currentTarget.value } }, null, 2)); }} />{props.label(role)}
        </label>}</For></div></fieldset>
        <div class="floe-theme-studio__actions"><Button size="icon" icon={ChevronLeft} variant="ghost" title={props.label('undo')} aria-label={props.label('undo')} disabled={pending() || !history().length} onClick={undo}/><Button size="icon" icon={ChevronRight} variant="ghost" title={props.label('redo')} aria-label={props.label('redo')} disabled={pending() || !future().length} onClick={redo}/><Button size="icon" icon={Eye} variant="ghost" aria-label={props.label('compare')} title={props.label('compare')} aria-pressed={compare()} onClick={() => setCompare(!compare())}/></div>
        <Show when={decode().doc} >{doc => <ThemeFields document={doc()} parts={props.parts} features={props.features} inspect={inspect()} disabled={pending()} label={props.label} invalid={setFieldError} update={next => write(JSON.stringify(next,null,2))} />}</Show>
        <details><summary>{props.label('advanced')}</summary><Textarea aria-label={props.label('advanced')} value={raw()} rows={9} spellcheck={false} disabled={pending()} onInput={event => write(event.currentTarget.value)} /></details>
        <Show when={props.generate}><Button icon={Sparkles} size="sm" variant="ghost" disabled={!decode().doc || !!fieldError() || pending()} onClick={() => draftAction(doc => props.generate?.(doc))}>{props.label('generate')}</Button></Show>
        <Show when={error() || issue()}><p role="alert" class="floe-theme-picker__error">{error() || `${props.label('invalid')}: ${issue()}`}</p></Show>
      </div>
    </Dialog>
  </>;
}
