import { For, Show, children, splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

/** Host-owned routing and state stay outside this responsive settings frame. */
export function SettingsLayout(props: {
  sidebar: JSX.Element;
  mobileNavigation?: JSX.Element;
  children: JSX.Element;
  class?: string;
}) {
  const mobileNavigation = children(() => props.mobileNavigation);
  return (
    <div class={cn('floe-settings-layout', props.class)}>
      <aside class="floe-settings-layout__sidebar">{props.sidebar}</aside>
      <Show when={mobileNavigation.toArray().some((child) => child != null && typeof child !== 'boolean' && child !== '')}>
        <div class="floe-settings-layout__mobile">{mobileNavigation()}</div>
      </Show>
      <div class="floe-settings-layout__content">{props.children}</div>
    </div>
  );
}

export interface SettingsNavigationItem {
  id: string;
  label: string;
  icon?: (props: { class?: string }) => JSX.Element;
  attributes?: JSX.ButtonHTMLAttributes<HTMLButtonElement>;
}
export interface SettingsNavigationGroup {
  id: string;
  label: string;
  items: readonly SettingsNavigationItem[];
}
export interface SettingsNavigationProps {
  label: string;
  groups: readonly SettingsNavigationGroup[];
  value: string;
  onChange: (id: string) => void;
  search?: JSX.Element;
  empty?: JSX.Element;
}

export function SettingsNavigation(props: SettingsNavigationProps) {
  return (
    <nav class="floe-settings-navigation" aria-label={props.label}>
      <Show when={props.search}><div class="floe-settings-navigation__search">{props.search}</div></Show>
      <div class="floe-settings-navigation__groups">
        <Show when={props.groups.some((group) => group.items.length)} fallback={props.empty}>
          <For each={props.groups}>{(group) => (
            <Show when={group.items.length}>
              <div class="floe-settings-navigation__group" data-settings-group={group.id}>
                <div class="floe-settings-navigation__label">{group.label}</div>
                <For each={group.items}>{(item) => (
                  <button {...item.attributes} type="button"
                    class={cn('floe-settings-navigation__item', item.attributes?.class)}
                    aria-current={props.value === item.id ? 'page' : undefined}
                    onClick={() => props.onChange(item.id)}>
                    <Show when={item.icon}>{(Icon) => { const Component = Icon(); return <Component class="floe-settings-navigation__icon" />; }}</Show>
                    <span>{item.label}</span>
                  </button>
                )}</For>
              </div>
            </Show>
          )}</For>
        </Show>
      </div>
    </nav>
  );
}

export interface SettingsSectionProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  title: string;
  description?: string;
  badge?: JSX.Element;
  actions?: JSX.Element;
  /** A page owns its primary heading; sections are subordinate groups. */
  variant?: 'page' | 'section';
}

export function SettingsSection(props: SettingsSectionProps) {
  const [local, rest] = splitProps(props, ['title', 'description', 'badge', 'actions', 'variant', 'class', 'children']);
  return (
    <section {...rest} class={cn('floe-settings-section', local.class)} data-settings-variant={local.variant ?? 'section'}>
      <header class="floe-settings-section__header">
        <div class="floe-settings-section__heading">
          <div class="floe-settings-section__title">
            <Show when={local.variant === 'page'} fallback={<h2>{local.title}</h2>}><h1>{local.title}</h1></Show>
            {local.badge}
          </div>
          <Show when={local.description}><p>{local.description}</p></Show>
        </div>
        <Show when={local.actions}><div class="floe-settings-section__actions">{local.actions}</div></Show>
      </header>
      <div class="floe-settings-section__body">{local.children}</div>
    </section>
  );
}

export function SettingsList(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return <div {...rest} class={cn('floe-settings-list', local.class)} data-floe-surface="card">{local.children}</div>;
}

export interface SettingRowProps {
  title: string;
  description?: string;
  icon?: (props: { class?: string }) => JSX.Element;
  control?: JSX.Element;
  children?: JSX.Element;
  tone?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  class?: string;
}
export function SettingRow(props: SettingRowProps) {
  return (
    <div class={cn('floe-setting-row', props.class)} data-tone={props.tone ?? 'default'}>
      <div class="floe-setting-row__main">
        <div class="floe-setting-row__label">
          <Show when={props.icon}>{(Icon) => { const Component = Icon(); return <Component class="floe-setting-row__icon" />; }}</Show>
          <div><div class="floe-setting-row__title">{props.title}</div><Show when={props.description}><p>{props.description}</p></Show></div>
        </div>
        <Show when={props.control}><div class="floe-setting-row__control">{props.control}</div></Show>
      </div>
      <Show when={props.children}><div class="floe-setting-row__body">{props.children}</div></Show>
    </div>
  );
}
