// @vitest-environment jsdom
/* eslint-disable solid/reactivity -- Async filesystem callbacks are invoked by the picker, not tracking scopes. */
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DirectoryInput } from '../src/components/ui/DirectoryInput';
import { DirectoryPicker } from '../src/components/ui/DirectoryPicker';
import type { PickerPathContext } from '../src/components/ui/picker/PickerNavigation';

const context: PickerPathContext = { homePathAbs: '/Users/alice', defaultRootId: 'home', roots: [
  { id: 'home', label: 'Home', pathAbs: '/Users/alice', permissions: { read: true, write: true } },
  { id: 'computer', label: 'Root', pathAbs: '/', permissions: { read: true, write: false } },
] };
const disposers: Array<() => void> = [];
const flush = async () => { await new Promise((resolve) => setTimeout(resolve, 0)); await Promise.resolve(); };
const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.trim() === label)!;
function mount(node: () => ReturnType<typeof DirectoryInput>) {
  const host = document.createElement('div'); document.body.append(host);
  disposers.push(render(node, host));
}
function enterPath(path: string) {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Directory path"]')!;
  input.value = path; input.dispatchEvent(new Event('input', { bubbles: true }));
  return input;
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0));
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle));
});
afterEach(() => { while (disposers.length) disposers.pop()?.(); document.body.replaceChildren(); vi.unstubAllGlobals(); });

describe('directory picker presentations', () => {
  it('uses Home and Root as absolute navigation shortcuts and confirms only validated paths', async () => {
    const onSelect = vi.fn();
    const loadDirectory = vi.fn(async () => []);
    mount(() => <DirectoryPicker open onOpenChange={() => {}} onSelect={onSelect} loadPathContext={async () => context} loadDirectory={loadDirectory} confirmText="Choose" />);
    await flush();
    button('Root').click(); await flush();
    expect(loadDirectory).toHaveBeenLastCalledWith('/', { showHidden: false });
    button('Choose').click(); expect(onSelect).toHaveBeenCalledWith('/');
    enterPath('/Volumes/team');
    expect(button('Choose').disabled).toBe(true);
    button('Go').click(); await flush();
    expect(button('Choose').disabled).toBe(false);
    button('Choose').click(); expect(onSelect).toHaveBeenLastCalledWith('/Volumes/team');
  });
  it('keeps embedded form controls mounted and reports validity before submission', async () => {
    const valid = vi.fn(); const submit = vi.fn((event: SubmitEvent) => event.preventDefault());
    mount(() => <form onSubmit={submit}>
      <DirectoryInput open loadPathContext={async () => context} loadDirectory={async () => []} onValidityChange={valid} />
      <input aria-label="Space name" value="My project" /><button type="submit">Create space</button>
    </form>);
    await flush();
    expect(valid).toHaveBeenLastCalledWith(true);
    const input = enterPath('/srv/project');
    expect(valid).toHaveBeenLastCalledWith(false);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flush();
    expect(valid).toHaveBeenLastCalledWith(true);
    expect(document.querySelector<HTMLInputElement>('[aria-label="Space name"]')?.value).toBe('My project');
    expect(submit).not.toHaveBeenCalled();
  });
  it('retains the requested path on failure and offers retry without navigating to Home', async () => {
    let failure = true;
    mount(() => <DirectoryInput open initialPath="/Volumes/team" loadPathContext={async () => context}
      loadDirectory={async () => { if (failure) throw new Error('Host permission denied'); return []; }} />);
    await flush();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Host permission denied');
    expect(document.querySelector<HTMLInputElement>('[aria-label="Directory path"]')?.value).toBe('/Volumes/team');
    failure = false; button('Retry').click(); await flush();
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
  it('refreshes context on a scope change and cannot commit a late previous-environment response', async () => {
    const [scope, setScope] = createSignal('one');
    let finish!: (value: never[]) => void;
    const pending = new Promise<never[]>((resolve) => { finish = resolve; });
    const onChange = vi.fn();
    mount(() => <DirectoryInput open scopeKey={scope()} loadPathContext={async () => context}
      loadDirectory={async () => scope() === 'one' ? pending : []} onChange={onChange} />);
    await flush(); setScope('two'); await flush();
    expect(onChange).toHaveBeenCalledTimes(1);
    finish([]); await flush(); expect(onChange).toHaveBeenCalledTimes(1);
  });
});
