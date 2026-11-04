import { For, createSignal } from 'solid-js';
import { Checkbox, CheckboxGroup, type CheckboxSize } from '@floegence/floe-webapp-core/ui';

export function CheckboxStateStudy() {
  const [checked, setChecked] = createSignal(false);
  const [changes, setChanges] = createSignal(0);
  const [group, setGroup] = createSignal<string[]>([]);
  return <main style={{ padding: '24px', background: 'var(--background)', overflow: 'auto', height: '100%' }}>
    <h1>Checkbox states</h1>
    <div style={{ display: 'grid', 'grid-template-columns': 'repeat(auto-fit,minmax(240px,1fr))', gap: '16px' }}>
      <For each={['background', 'card', 'sidebar', 'muted']}>{surface =>
        <section data-checkbox-plane={surface} style={{ background: `var(--${surface})`, padding: '16px', display: 'grid', gap: '8px' }}>
          <h2>{surface}</h2>
          <For each={['sm', 'md', 'lg'] as CheckboxSize[]}>{size =>
            <For each={['unchecked', 'checked', 'mixed', 'disabled-unchecked', 'disabled-checked']}>{state =>
              <div data-checkbox-case={state} data-checkbox-size={size}>
                <Checkbox label={`${surface} ${size} ${state}`} size={size} checked={state === 'checked' || state === 'disabled-checked'}
                  indeterminate={state === 'mixed'} disabled={state.startsWith('disabled')} />
              </div>
            }</For>
          }</For>
        </section>
      }</For>
    </div>
    <section data-checkbox-interaction style={{ display: 'flex', 'flex-wrap': 'wrap', gap: '24px', padding: '16px' }}>
      <Checkbox label="Interactive choice" checked={checked()} onChange={value => { setChecked(value); setChanges(n => n + 1); }} />
      <Checkbox label="Read only choice" readOnly checked={false} onChange={() => setChanges(n => n + 100)} />
      <Checkbox label="Disabled choice" disabled checked={false} onChange={() => setChanges(n => n + 100)} />
      <output aria-label="Change count">{changes()}</output>
      <CheckboxGroup value={group()} onChange={setGroup}>
        <Checkbox label="Group first" value="first" /><Checkbox label="Group second" value="second" />
      </CheckboxGroup>
      <For each={['card', 'button', 'tile'] as const}>{variant => <Checkbox variant={variant} label={`${variant} choice`} checked={checked()} onChange={setChecked} />}</For>
    </section>
  </main>;
}
