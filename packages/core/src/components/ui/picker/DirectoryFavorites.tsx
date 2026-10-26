import { createEffect, createSignal, on, onCleanup, Show, type JSX } from 'solid-js';
import { Star } from '../../icons';
import { Button } from '../Button';
import { SurfaceFloatingLayer } from '../SurfaceFloatingLayer';
import { useOverlayMask } from '../../../hooks/useOverlayMask';
import type { PickerCopy } from './PickerNavigation';

/** Controlled navigation metadata. The host owns authentication, persistence and refresh. */
export interface DirectoryFavorites {
  paths: readonly string[];
  loading?: boolean;
  error?: string;
  editable?: boolean;
  pendingPaths?: readonly string[];
  onRefresh?: () => void | Promise<void>;
  onSetFavorite?: (path: string, favorite: boolean) => Promise<void>;
}

export function DirectoryFavoriteButton(props: {
  path: string; favorites: DirectoryFavorites; copy: PickerCopy; disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = createSignal(false);
  const selected = () => props.favorites.paths.includes(props.path);
  const label = () => selected() ? props.copy.unfavoriteDirectory : props.copy.favoriteDirectory;
  const toggle = async () => {
    const favorites = props.favorites;
    const path = props.path;
    if (!favorites.editable || !favorites.onSetFavorite || busy() || props.disabled || favorites.pendingPaths?.includes(path)) return;
    setBusy(true);
    props.onError?.('');
    try { await favorites.onSetFavorite(path, !selected()); }
    catch (error) { props.onError?.(error instanceof Error ? error.message : props.copy.favoritesLoadFailed); }
    finally { setBusy(false); }
  };
  return <Button type="button" size="sm" variant="ghost" class="shrink-0"
    aria-label={label() + ': ' + props.path} title={label()} aria-pressed={selected()}
    loading={busy() || props.favorites.pendingPaths?.includes(props.path)} icon={() => <Star class={selected() ? 'h-3.5 w-3.5 fill-current text-warning' : 'h-3.5 w-3.5'} />}
    disabled={props.disabled || !props.favorites.editable || !props.favorites.onSetFavorite}
    onClick={() => { void toggle(); }} />;
}

/** A navigation button and favorite action are siblings; the menu captures its target on open. */
export function PickerDirectoryRow(props: {
  path: string; favorites?: DirectoryFavorites; copy: PickerCopy; disabled?: boolean; scopeKey?: string;
  children: JSX.Element; onError: (message: string) => void;
}) {
  const [menu, setMenu] = createSignal<{ path: string; favorites: DirectoryFavorites; favorite: boolean; x: number; y: number; owner: HTMLElement }>();
  let row: HTMLDivElement | undefined;
  let menuButton: HTMLButtonElement | undefined;
  let menuRoot: HTMLDivElement | undefined;
  const close = (restore = false) => {
    const owner = menu()?.owner;
    setMenu(undefined);
    if (restore && owner?.isConnected) owner.focus();
  };
  const open = (event: MouseEvent | KeyboardEvent) => {
    if (!props.favorites?.editable || props.disabled) return;
    event.preventDefault(); event.stopPropagation();
    const owner = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('button') ?? row! : row!;
    const rect = owner.getBoundingClientRect();
    setMenu({ path: props.path, favorites: props.favorites, favorite: !props.favorites.paths.includes(props.path), owner,
      x: event instanceof MouseEvent ? event.clientX : rect.left, y: event instanceof MouseEvent ? event.clientY : rect.bottom });
    queueMicrotask(() => menuButton?.focus());
  };
  createEffect(on(() => props.scopeKey, () => close()));
  useOverlayMask({ open: () => Boolean(menu()), root: () => menuRoot, onClose: () => close(true),
    closeOnEscape: true, lockBodyScroll: false, trapFocus: false, autoFocus: false, restoreFocus: false, blockHotkeys: false });
  createEffect(() => {
    if (!menu()) return;
    const dismiss = (event: PointerEvent) => { if (!(event.target instanceof Element) || !event.target.closest('[data-picker-favorite-menu]')) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' || event.key === 'Tab') { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); } close(event.key === 'Escape'); } };
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('keydown', escape, true);
    onCleanup(() => { document.removeEventListener('pointerdown', dismiss, true); document.removeEventListener('keydown', escape, true); });
  });
  return <div ref={row} class="flex min-w-0 items-center" onContextMenu={open}
    onKeyDown={(event) => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) open(event); }}>
    {props.children}
    <Show when={props.favorites}>{(favorites) => <DirectoryFavoriteButton path={props.path} favorites={favorites()} copy={props.copy} disabled={props.disabled} onError={props.onError} />}</Show>
    <Show when={menu()}>{(target) => <SurfaceFloatingLayer position={target()} owner={target().owner} estimatedSize={{ width: 250, height: 40 }} layerRef={element => { menuRoot = element; }}
      data-picker-favorite-menu="" role="menu" class="z-50 rounded-md border border-[var(--floe-line)] bg-background p-1 shadow-[var(--floe-elevation-float)]">
      <button ref={menuButton} type="button" role="menuitem" class="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--floe-state-selected)] focus:bg-[var(--floe-state-selected)] focus:outline-none"
        disabled={!target().favorites.editable || !target().favorites.onSetFavorite || target().favorites.pendingPaths?.includes(target().path)}
        onClick={() => {
          const captured = target();
          if (!captured.favorites.editable || captured.favorites.pendingPaths?.includes(captured.path)) return;
          const onError = props.onError;
          const failure = props.copy.favoritesLoadFailed;
          close(true);
          void captured.favorites.onSetFavorite?.(captured.path, captured.favorite).catch((error: unknown) => onError(error instanceof Error ? error.message : failure));
        }}>
        <Star class="h-3.5 w-3.5" />{target().favorite ? props.copy.favoriteDirectory : props.copy.unfavoriteDirectory}
      </button>
    </SurfaceFloatingLayer>}</Show>
  </div>;
}
