import { For } from 'solid-js';

export default function ReportsPage() {
  return (
    <section class="h-full overflow-auto bg-[var(--floe-plane)] px-6 py-5" data-navigation-page="reports">
      <h1 class="text-sm font-semibold">Reports</h1>
      <p class="mt-2 text-xs text-[var(--floe-ink-soft)]">Workspace activity at a glance.</p>
      <div class="mt-8 grid gap-4 sm:grid-cols-3">
        <For each={[['Files', '480'], ['Services', '6'], ['Open reviews', '12']]}>{([label, value]) => (
          <article class="rounded-control border border-[var(--floe-line)] bg-[var(--floe-well)] p-5">
            <p class="text-xs text-[var(--floe-ink-soft)]">{label}</p>
            <p class="mt-3 text-2xl font-semibold">{value}</p>
          </article>
        )}</For>
      </div>
      <label class="mt-8 block text-xs">
        Review notes
        <textarea class="mt-3 block min-h-32 w-full rounded-control border border-input bg-[var(--floe-plane)] p-3" placeholder="Keep your notes while moving between pages…" />
      </label>
    </section>
  );
}
