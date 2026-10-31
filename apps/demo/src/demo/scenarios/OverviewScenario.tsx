import { For, Show, createMemo, createSignal } from 'solid-js';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataBarChart,
  Dialog,
  Input,
  SegmentedControl,
  Tag,
} from '@floegence/floe-webapp-core/ui';
import { Search, TrendingUp, TrendingDown } from '@floegence/floe-webapp-core/icons';
import {
  deploymentBuckets,
  deploymentsInRange,
  summarize,
  trend,
  type Deployment,
  type RangeDays,
} from './model';

function Metric(props: {
  label: string;
  current: number;
  previous: number;
  unit?: string;
  preference: 'higher' | 'lower' | 'neutral';
}) {
  const change = () => trend(props.current, props.previous, props.preference);
  const format = (value: number) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  return (
    <div class="scenario-metric space-y-1" data-metric={props.label}>
      <dt class="text-caption text-[var(--floe-ink-soft)]">{props.label}</dt>
      <dd class="text-xl font-semibold tabular-nums">
        {format(props.current)}
        {props.unit}
      </dd>
      <dd
        class="flex items-center gap-1 text-caption"
        classList={{
          'text-success': change().assessment === 'improved',
          'text-error': change().assessment === 'worsened',
          'text-[var(--floe-ink-soft)]': change().assessment === 'neutral',
        }}
      >
        <Show when={change().direction !== 'flat'}>
          <Show
            when={change().direction === 'up'}
            fallback={<TrendingDown aria-hidden="true" class="h-3 w-3" />}
          >
            <TrendingUp aria-hidden="true" class="h-3 w-3" />
          </Show>
        </Show>
        <span>
          {change().direction === 'flat'
            ? 'Unchanged'
            : `${change().direction === 'up' ? '+' : '−'}${format(Math.abs(change().change))}${props.unit === '%' ? ' pp' : (props.unit ?? '')}`}
        </span>
        <Show when={change().assessment !== 'neutral'}>
          <span>· {change().assessment}</span>
        </Show>
      </dd>
    </div>
  );
}

export function OverviewScenario() {
  const [range, setRange] = createSignal<RangeDays>(7);
  const [query, setQuery] = createSignal('');
  const [environment, setEnvironment] = createSignal('All');
  const [page, setPage] = createSignal(0);
  const [selected, setSelected] = createSignal<Deployment>();
  const rows = createMemo(() => deploymentsInRange(range()));
  const current = createMemo(() => summarize(rows()));
  const previous = createMemo(() => summarize(deploymentsInRange(range(), true)));
  const filtered = createMemo(() =>
    rows().filter(
      (row) =>
        (environment() === 'All' || row.environment === environment()) &&
        `${row.id} ${row.service} ${row.revision} ${row.status}`
          .toLowerCase()
          .includes(query().trim().toLowerCase())
    )
  );
  const pages = () => Math.max(1, Math.ceil(filtered().length / 8));
  const reset = () => {
    setRange(7);
    setQuery('');
    setEnvironment('All');
    setPage(0);
    setSelected();
  };
  return (
    <div class="space-y-4" data-scenario="overview">
      <div class="scenario-heading">
        <div>
          <h2 class="text-base font-semibold">Workspace overview</h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            Floe Studio · Example data ending October 31, 2026
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset overview
        </Button>
      </div>
      <Card>
        <CardHeader class="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle class="scenario-card-heading">Deployment health</CardTitle>
            <p class="mt-1 text-caption text-[var(--floe-ink-soft)]">
              Last {range()} days · compared with the preceding {range()} days
            </p>
          </div>
          <SegmentedControl
            value={String(range())}
            onChange={(value) => {
              setRange(Number(value) as RangeDays);
              setPage(0);
            }}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
            ]}
          />
        </CardHeader>
        <CardContent class="scenario-health">
          <dl class="grid grid-cols-2 gap-3">
            <Metric
              label="Deployments"
              current={current().count}
              previous={previous().count}
              preference="neutral"
            />
            <Metric
              label="Success rate"
              current={current().successRate}
              previous={previous().successRate}
              unit="%"
              preference="higher"
            />
            <Metric
              label="Median build"
              current={current().medianBuild}
              previous={previous().medianBuild}
              unit="s"
              preference="lower"
            />
            <Metric
              label="Failed deployments"
              current={current().failed}
              previous={previous().failed}
              preference="lower"
            />
          </dl>
          <figure class="scenario-chart" aria-label={`Deployments over the last ${range()} days`}>
            <DataBarChart data={deploymentBuckets(range())} height={230} animate={false} />
            <figcaption class="text-caption text-[var(--floe-ink-soft)]">
              {range() === 7 ? 'Daily' : range() === 30 ? 'Five-day' : 'Fifteen-day'} totals · all
              environments
            </figcaption>
          </figure>
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="gap-3">
          <CardTitle class="scenario-card-heading">Deployment history</CardTitle>
          <div class="grid gap-3 sm:grid-cols-[minmax(0,24rem)_auto] sm:justify-between">
            <Input
              aria-label="Search deployments"
              placeholder="Search service, revision or status"
              leftIcon={<Search class="h-3.5 w-3.5" />}
              value={query()}
              onInput={(event) => {
                setQuery(event.currentTarget.value);
                setPage(0);
              }}
            />
            <select
              aria-label="Deployment environment"
              class="floe-field h-8 rounded-control px-2 text-xs"
              value={environment()}
              onChange={(event) => {
                setEnvironment(event.currentTarget.value);
                setPage(0);
              }}
            >
              <For each={['All', 'Production', 'Staging', 'Preview']}>
                {(value) => (
                  <option value={value}>{value === 'All' ? 'All environments' : value}</option>
                )}
              </For>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <Show
            when={filtered().length}
            fallback={
              <div class="space-y-2 py-8 text-center">
                <p class="font-medium">No deployments match</p>
                <p class="text-xs text-[var(--floe-ink-soft)]">
                  Try another service or clear the current filters.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setQuery('');
                    setEnvironment('All');
                    setPage(0);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            }
          >
            <ul class="divide-y divide-[var(--floe-line-quiet)]">
              <For each={filtered().slice(page() * 8, (page() + 1) * 8)}>
                {(row) => (
                  <li>
                    <button
                      type="button"
                      class="flex w-full items-center justify-between gap-3 rounded-control px-3 py-3 text-left hover:bg-[var(--floe-state-hover)]"
                      onClick={() => setSelected(row)}
                      aria-label={`Inspect ${row.service} ${row.revision}`}
                    >
                      <span class="min-w-0">
                        <span class="block text-[length:var(--floe-type-body)] font-medium">
                          {row.service}{' '}
                          <span class="font-normal text-[var(--floe-ink-soft)]">
                            · {row.environment}
                          </span>
                        </span>
                        <span class="block text-caption text-[var(--floe-ink-soft)]">
                          {row.revision} ·{' '}
                          {new Date(row.startedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC',
                          })}{' '}
                          · {row.duration}s
                        </span>
                      </span>
                      <Tag
                        size="sm"
                        tone="soft"
                        variant={row.status === 'Succeeded' ? 'success' : 'error'}
                      >
                        {row.status}
                      </Tag>
                    </button>
                  </li>
                )}
              </For>
            </ul>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span role="status" class="text-caption text-[var(--floe-ink-soft)]">
                {filtered().length} deployments · Page {page() + 1} of {pages()}
              </span>
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!page()}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page() + 1 >= pages()}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Show>
        </CardContent>
      </Card>
      <Dialog
        open={!!selected()}
        onOpenChange={(open) => {
          if (!open) setSelected();
        }}
        title="Deployment details"
        closeLabel="Close deployment details"
      >
        <Show when={selected()}>
          {(row) => (
            <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt>Service</dt>
              <dd>{row().service}</dd>
              <dt>Environment</dt>
              <dd>{row().environment}</dd>
              <dt>Status</dt>
              <dd>{row().status}</dd>
              <dt>Revision</dt>
              <dd class="font-mono">{row().revision}</dd>
              <dt>Duration</dt>
              <dd>{row().duration}s</dd>
              <dt>Started</dt>
              <dd>
                {new Date(row().startedAt).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}
              </dd>
            </dl>
          )}
        </Show>
      </Dialog>
    </div>
  );
}
