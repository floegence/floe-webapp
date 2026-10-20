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
  it('keeps empty favorites available and never confirms a shortcut view', async () => {
    const onSelect = vi.fn(); const refresh = vi.fn(); const validity = vi.fn();
    mount(() => <DirectoryPicker open onOpenChange={() => {}} onSelect={onSelect} confirmText="Choose"
      loadPathContext={async () => context} loadDirectory={async () => []} onValidityChange={validity}
      directoryFavorites={{ paths: [], editable: true, onRefresh: refresh }} />);
    await flush();
    expect(button('Choose').disabled).toBe(false);
    button('Favorites').click(); await flush();
    expect(document.querySelector('[data-picker-favorites]')?.textContent).toContain('Star a directory');
    expect(button('Choose').disabled).toBe(true);
    expect(validity).toHaveBeenLastCalledWith(false);
    button('Choose').click(); expect(onSelect).not.toHaveBeenCalled();
    button('Home').click(); await flush();
    expect(button('Choose').disabled).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('filters favorites and separates starring from validated navigation', async () => {
    const setFavorite = vi.fn(async () => {}); const load = vi.fn(async () => []);
    mount(() => <DirectoryPicker open onOpenChange={() => {}} onSelect={() => {}} confirmText="Choose"
      loadPathContext={async () => context} loadDirectory={load}
      directoryFavorites={{ paths: ['/srv/alpha', '/srv/beta'], editable: true, onSetFavorite: setFavorite }} />);
    await flush(); button('Favorites').click(); await flush();
    document.querySelector<HTMLButtonElement>('[aria-label="Remove directory from favorites: /srv/beta"]')!.click();
    await flush(); expect(setFavorite).toHaveBeenCalledExactlyOnceWith('/srv/beta', false);
    expect(load).toHaveBeenCalledTimes(1);
    const filter = document.querySelector<HTMLInputElement>('[aria-label="Filter favorites by name or path"]')!;
    filter.value = 'alpha'; filter.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelectorAll('[data-picker-favorite-path]')).toHaveLength(1);
    document.querySelector<HTMLButtonElement>('[data-picker-favorite-path]')!.click(); await flush();
    expect(load).toHaveBeenLastCalledWith('/srv/alpha', { showHidden: false });
    expect(button('Choose').disabled).toBe(false);
    expect(document.querySelector('button button')).toBeNull();
  });

  it('keeps keyboard navigation on current rows after filtering and inserting favorites', async () => {
    const [paths, setPaths] = createSignal<readonly string[]>(['/srv/alpha', '/srv/beta', '/srv/beta-two']);
    mount(() => <DirectoryPicker open onOpenChange={() => {}} onSelect={() => {}}
      loadPathContext={async () => context} loadDirectory={async () => []}
      directoryFavorites={{ get paths() { return paths(); }, editable: true }} />);
    await flush(); button('Favorites').click(); await flush();
    const filter = document.querySelector<HTMLInputElement>('[aria-label="Filter favorites by name or path"]')!;
    filter.value = 'beta'; filter.dispatchEvent(new Event('input', { bubbles: true }));
    let rows = document.querySelectorAll<HTMLButtonElement>('[data-picker-favorite-path]');
    rows[0].focus(); rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(rows[1]);
    filter.value = ''; filter.dispatchEvent(new Event('input', { bubbles: true }));
    setPaths(['/srv/first', ...paths()]);
    rows = document.querySelectorAll<HTMLButtonElement>('[data-picker-favorite-path]');
    rows[0].focus(); rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(rows[1]);
  });

  it('scrolls keyboard focus to the tenth recent directory', async () => {
    const scroll = vi.fn();
    mount(() => <DirectoryPicker open onOpenChange={() => {}} onSelect={() => {}}
      loadPathContext={async () => context} loadDirectory={async () => []}
      suggestedPaths={Array.from({ length: 10 }, (_, index) => '/srv/project-' + index)} />);
    await flush();
    const rows = document.querySelectorAll<HTMLButtonElement>('[data-picker-suggested-path]');
    rows[9].scrollIntoView = scroll; rows[0].focus();
    rows[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(rows[9]); expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
  });
  it('navigates suggested absolute directories through validation without confirming or granting access', async () => {
    const onSelect = vi.fn();
    const loadDirectory = vi.fn(async (path: string) => {
      if (path === '/Volumes/unavailable') throw new Error('Directory is unavailable');
      return [];
    });
    mount(() => <DirectoryPicker open onOpenChange={() => {}} onSelect={onSelect}
      loadPathContext={async () => context} loadDirectory={loadDirectory} confirmText="Choose"
      suggestedPaths={['/Volumes/project', '/Volumes/project/', 'relative', '/Volumes/unavailable']}
      suggestedPathsLabel="Recently used" />);
    await flush();
    const suggestions = document.querySelectorAll<HTMLButtonElement>('[data-picker-suggested-path]');
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].title).toBe('/Volumes/project');
    expect(button('Recently used').getAttribute('role')).toBe('tab');
    expect(button('Recently used').getAttribute('aria-selected')).toBe('true');
    expect(button('Home').closest('[role="tablist"]')).toBe(button('Recently used').parentElement);
    expect(document.querySelector('input[aria-label="Directory path"]')).toBeNull();
    expect(button('Choose').disabled).toBe(true);
    suggestions[1].click(); await flush();
    expect(button('Choose').disabled).toBe(true);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('Directory is unavailable');
    expect(onSelect).not.toHaveBeenCalled();
    button('Recently used').click(); await flush();
    document.querySelector<HTMLButtonElement>('[data-picker-suggested-path]')!.click(); await flush();
    expect(document.activeElement).toBe(document.querySelector('input[aria-label="Directory path"]'));
    expect(loadDirectory).toHaveBeenLastCalledWith('/Volumes/project', { showHidden: false });
    expect(onSelect).not.toHaveBeenCalled();
    expect(button('Choose').disabled).toBe(false);
    button('Choose').click();
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('/Volumes/project');
    expect(context.roots).toHaveLength(2);
  });

  it('omits empty suggestions and keeps suggested navigation disabled with the picker', async () => {
    const [suggestions, setSuggestions] = createSignal<readonly string[]>(['relative']);
    const loadDirectory = vi.fn(async () => []);
    mount(() => <DirectoryPicker open disabled onOpenChange={() => {}} onSelect={() => {}}
      loadPathContext={async () => context} loadDirectory={loadDirectory} suggestedPaths={suggestions()} />);
    await flush();
    expect(document.querySelector('[data-picker-suggestions]')).toBeNull();
    setSuggestions(['/Volumes/project']); await flush();
    const suggestion = document.querySelector<HTMLButtonElement>('[role="tab"]')!;
    expect(suggestion.disabled).toBe(true);
    suggestion.click(); await flush();
    expect(loadDirectory).toHaveBeenCalledTimes(1);
  });


  it('switches recent, home and root tabs with keyboard focus and resets on reopen and scope changes', async () => {
    const [open, setOpen] = createSignal(true);
    const [scope, setScope] = createSignal('one');
    const loadDirectory = vi.fn(async () => []);
    mount(() => <DirectoryPicker open={open()} onOpenChange={setOpen} scopeKey={scope()} onSelect={() => {}}
      loadPathContext={async () => context} loadDirectory={loadDirectory}
      suggestedPaths={['/Volumes/project']} suggestedPathsLabel="Recently used" />);
    await flush();
    const recentTab = button('Recently used');
    recentTab.focus();
    recentTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(button('Home'));
    expect(recentTab.getAttribute('aria-selected')).toBe('true');
    button('Home').click(); await flush();
    expect(document.querySelector('[data-picker-suggestions]')).toBeNull();
    expect(button('Home').getAttribute('aria-selected')).toBe('true');
    expect(loadDirectory).toHaveBeenLastCalledWith('/Users/alice', { showHidden: false });
    button('Root').click(); await flush();
    expect(loadDirectory).toHaveBeenLastCalledWith('/', { showHidden: false });
    button('Recently used').click(); await flush();
    expect(document.querySelector('[data-picker-suggestions]')).not.toBeNull();
    expect(loadDirectory).toHaveBeenCalledTimes(3);
    button('Home').click(); await flush();
    setOpen(false); await flush(); setOpen(true); await flush();
    expect(button('Recently used').getAttribute('aria-selected')).toBe('true');
    button('Root').click(); await flush(); setScope('two'); await flush();
    expect(button('Recently used').getAttribute('aria-selected')).toBe('true');
  });

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
