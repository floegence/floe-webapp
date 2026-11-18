import { For, Index, Show, createEffect, createSignal } from 'solid-js';
import { ArrowDown, ArrowUp, Plus, Trash } from '../icons';
import { Button } from './Button';
import { Input } from './Input';
import {
  shellColorRoles,
  terminalThemeRoles,
  readPortableShellTheme,
  type PortableShellTheme,
} from '../../themes';

const groups = [
  'colors',
  'palette',
  'editor',
  'syntax',
  'terminal',
  'parts',
  'shadow',
  'features',
] as const;
type Group = (typeof groups)[number];
export type ThemeFieldLabel =
  | Group
  | 'settings'
  | 'search'
  | 'add'
  | 'remove'
  | 'up'
  | 'down'
  | 'undo'
  | 'redo'
  | 'invalid'
  | 'name';

export function ThemeFields(props: {
  document: PortableShellTheme;
  parts?: readonly string[];
  features?: readonly string[];
  inspect?: {group:Group;role:string};
  disabled: boolean;
  label: (key: ThemeFieldLabel) => string;
  update: (doc: PortableShellTheme) => void;
  invalid: (message: string) => void;
}) {
  const [group, setGroup] = createSignal<Group>('colors'),
    [search, setSearch] = createSignal(''),
    [key, setKey] = createSignal(''),
    [error, setError] = createSignal('');
  let details!: HTMLDetailsElement;
  createEffect(() => { const target = props.inspect; if (target && details) {details.open = true; setGroup(target.group); setSearch(target.role); details.scrollIntoView({block:'nearest'});} });
  const update = (patch: Partial<PortableShellTheme>) => {
    try {
      props.update(readPortableShellTheme({ ...props.document, ...patch }));
      setError('');
      props.invalid('');
    } catch (reason) {
      const message = (reason as Error).message;
      setError(message);
      props.invalid(message);
    }
  };
  const dictionary = () => {
    const scope = group();
    return scope === 'syntax' || scope === 'shadow' || scope === 'features'
      ? {}
      : (props.document[scope] ?? {});
  };
  const matches = (name: string) => name.toLowerCase().includes(search().trim().toLowerCase());
  const names = () =>
    [
      ...new Set([
        ...Object.keys(dictionary()),
        ...(group() === 'colors'
          ? shellColorRoles
          : group() === 'terminal'
            ? terminalThemeRoles
            : group() === 'parts'
              ? (props.parts ?? [])
              : []),
      ]),
    ]
      .filter(matches)
      .sort();
  const edit = (name: string, value: string) => {
    const next = { ...dictionary() };
    if (value) next[name] = value;
    else delete next[name];
    update({ [group()]: next });
  };
  const setRule = (index: number, patch: Partial<PortableShellTheme['syntax'][number]>) =>
    update({
      syntax: props.document.syntax.map((rule, position) =>
        position === index ? { ...rule, ...patch } : rule
      ),
    });
  const move = (index: number, offset: number) => {
    const next = [...props.document.syntax];
    next.splice(index + offset, 0, ...next.splice(index, 1));
    update({ syntax: next });
  };
  const setLayer = (index: number, patch: Partial<PortableShellTheme['shadow'][number]>) =>
    update({
      shadow: props.document.shadow.map((layer, position) =>
        position === index ? { ...layer, ...patch } : layer
      ),
    });
  return (
    <details ref={details} class="floe-theme-fields">
      <summary>{props.label('settings')}</summary>
      <fieldset disabled={props.disabled}>
        <div class="floe-theme-fields__tools">
          <select
            aria-label={props.label('settings')}
            value={group()}
            onChange={(event) => {
              setGroup(event.currentTarget.value as Group);
              setError('');
              setSearch('');
              setKey('');
            }}
          >
            <For each={groups}>{(name) => <option value={name}>{props.label(name)}</option>}</For>
          </select>
          <Input
            type="search"
            aria-label={props.label('search')}
            placeholder={props.label('search')}
            value={search()}
            onInput={(event) => setSearch(event.currentTarget.value)}
          />
        </div>
        <div class="floe-theme-fields__list">
          <Show when={!['syntax', 'shadow', 'features'].includes(group())}>
            <For each={names()}>
              {(name) => (
                <label class="floe-theme-fields__row">
                  <span>{name}</span>
                  <input
                    type="color"
                    aria-label={name}
                    value={
                      /^#[a-f\d]{6}/i.test(dictionary()[name] ?? '')
                        ? dictionary()[name]!.slice(0, 7)
                        : '#808080'
                    }
                    onInput={(event) => edit(name, event.currentTarget.value)}
                  />
                  <Input
                    aria-label={name}
                    list="floe-theme-references"
                    value={dictionary()[name] ?? ''}
                    onChange={(event) => edit(name, event.currentTarget.value)}
                  />
                </label>
              )}
            </For>
          </Show>
          <Show when={group() === 'palette' || group() === 'editor'}>
            <div class="floe-theme-fields__tools">
              <Input
                value={key()}
                aria-label={props.label('name')}
                onInput={(event) => setKey(event.currentTarget.value)}
              />
              <Button
                size="icon"
                icon={Plus}
                aria-label={props.label('add')}
                disabled={!key() || Object.hasOwn(dictionary(), key())}
                onClick={() => edit(key(), '#808080')}
              />
            </div>
          </Show>
          <Show when={group() === 'features'}>
            <For
              each={[
                ...new Set([
                  'high-contrast',
                  'opaque-muted-ink',
                  ...(props.features ?? []),
                  ...props.document.features,
                ]),
              ].filter(matches)}
            >
              {(feature) => (
                <label>
                  <input
                    type="checkbox"
                    checked={props.document.features.includes(feature)}
                    onChange={(event) =>
                      update({
                        features: event.currentTarget.checked
                          ? [...props.document.features, feature]
                          : props.document.features.filter((item) => item !== feature),
                      })
                    }
                  />
                  {feature}
                </label>
              )}
            </For>
          </Show>
          <Show when={group() === 'syntax'}>
            <Index each={props.document.syntax}>
              {(rule, index) => (
                <Show when={matches(rule().token)}>
                  <div class="floe-theme-fields__rule">
                    <Input
                      aria-label="token"
                      value={rule().token}
                      onChange={(event) => setRule(index, { token: event.currentTarget.value })}
                    />
                    <Input
                      aria-label="foreground"
                      list="floe-theme-references"
                      value={rule().foreground}
                      onChange={(event) =>
                        setRule(index, { foreground: event.currentTarget.value })
                      }
                    />
                    <For each={['bold', 'italic', 'underline', 'strikethrough']}>
                      {(style) => (
                        <label>
                          <input
                            type="checkbox"
                            checked={rule().fontStyle?.split(' ').includes(style) ?? false}
                            onChange={(event) =>
                              setRule(index, {
                                fontStyle: [
                                  ...(rule()
                                    .fontStyle?.split(' ')
                                    .filter((item) => item && item !== style) ?? []),
                                  ...(event.currentTarget.checked ? [style] : []),
                                ].join(' '),
                              })
                            }
                          />
                          {style}
                        </label>
                      )}
                    </For>
                    <Button
                      size="icon"
                      icon={ArrowUp}
                      aria-label={props.label('up')}
                      disabled={!index}
                      onClick={() => move(index, -1)}
                    />
                    <Button
                      size="icon"
                      icon={ArrowDown}
                      aria-label={props.label('down')}
                      disabled={index === props.document.syntax.length - 1}
                      onClick={() => move(index, 1)}
                    />
                    <Button
                      size="icon"
                      icon={Trash}
                      aria-label={props.label('remove')}
                      onClick={() =>
                        update({
                          syntax: props.document.syntax.filter((_, position) => position !== index),
                        })
                      }
                    />
                  </div>
                </Show>
              )}
            </Index>
            <Button
              size="sm"
              icon={Plus}
              onClick={() =>
                update({
                  syntax: [...props.document.syntax, { token: '', foreground: '@foreground' }],
                })
              }
            >
              {props.label('add')}
            </Button>
          </Show>
          <Show when={group() === 'shadow'}>
            <Index each={props.document.shadow}>
              {(layer, index) => (
                <div class="floe-theme-fields__rule">
                  <For each={['x', 'y', 'blur', 'spread'] as const}>
                    {(field) => (
                      <label>
                        {field}
                        <Input
                          type="number"
                          min={field === 'blur' ? 0 : -256}
                          max={256}
                          value={layer()[field]}
                          onChange={(event) =>
                            setLayer(index, { [field]: event.currentTarget.valueAsNumber })
                          }
                        />
                      </label>
                    )}
                  </For>
                  <Input
                    aria-label="color"
                    value={layer().color}
                    onChange={(event) => setLayer(index, { color: event.currentTarget.value })}
                  />
                  <Button
                    size="icon"
                    icon={Trash}
                    aria-label={props.label('remove')}
                    onClick={() =>
                      update({
                        shadow: props.document.shadow.filter((_, position) => position !== index),
                      })
                    }
                  />
                </div>
              )}
            </Index>
            <Button
              size="sm"
              icon={Plus}
              disabled={props.document.shadow.length >= 8}
              onClick={() =>
                update({
                  shadow: [
                    ...props.document.shadow,
                    { x: 0, y: 2, blur: 6, spread: 0, color: '#00000033' },
                  ],
                })
              }
            >
              {props.label('add')}
            </Button>
          </Show>
        </div>
        <datalist id="floe-theme-references">
          <For each={Object.keys(props.document.palette)}>
            {(name) => <option value={`$${name}`} />}
          </For>
          <For each={Object.keys(props.document.colors)}>
            {(name) => <option value={`@${name.slice(2)}`} />}
          </For>
        </datalist>
        <Show when={error()}>
          <p role="alert">{error()}</p>
        </Show>
      </fieldset>
    </details>
  );
}
