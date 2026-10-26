import { For, Show, createSignal } from 'solid-js';
import {
  Activity,
  BarChart,
  Bell,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  Filter,
  Layers,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  User,
  X,
} from '@floegence/floe-webapp-core/icons';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  DataBarChart,
  DataPieChart,
  Input,
  LinearProgress,
  SegmentedControl,
  Select,
  Tag,
  Tooltip,
} from '@floegence/floe-webapp-core/ui';
import { CodeSnippet, ShowcaseFrame } from '../components/docs';

export interface ScenariosPageProps {
  onSelectSection: (id: string) => void;
}

/* Scenario gallery.
 *
 * The catalog answers "what does this component do". This page answers "what
 * does a product built on the library look like" — real compositions where
 * spacing, type and state read as one surface rather than as isolated demos.
 * Every block below is built from the same public primitives the catalog
 * documents, so nothing here is a mock. */

function SectionIntro(props: { title: string; description: string; action?: boolean }) {
  return (
    <div class="flex flex-wrap items-end justify-between gap-2">
      <div class="space-y-0.5">
        <h2 class="text-[length:var(--floe-type-body)] font-semibold">{props.title}</h2>
        <p class="text-caption text-[var(--floe-ink-soft)]">{props.description}</p>
      </div>
    </div>
  );
}

function Metric(props: { label: string; value: string; delta?: string; positive?: boolean }) {
  return (
    <div class="space-y-1">
      <div class="text-caption text-[var(--floe-ink-soft)]">{props.label}</div>
      <div class="text-base font-semibold tabular-nums tracking-[var(--floe-tracking-tight)]">
        {props.value}
      </div>
      <Show when={props.delta}>
        <div
          class={
            props.positive === false
              ? 'flex items-center gap-1 text-caption text-error'
              : 'flex items-center gap-1 text-caption text-success'
          }
        >
          <TrendingUp class={props.positive === false ? 'h-3 w-3 rotate-180' : 'h-3 w-3'} />
          {props.delta}
        </div>
      </Show>
    </div>
  );
}

/* ── Workspace overview ─────────────────────────────────────────────────── */

function WorkspaceOverview() {
  const [range, setRange] = createSignal('7d');
  return (
    <Card class="col-span-1 flex flex-col md:col-span-2">
      <CardHeader class="flex-row items-start justify-between gap-3">
        <div class="space-y-1">
          <CardTitle>Workspace overview</CardTitle>
          <CardDescription>Deployments across all environments</CardDescription>
        </div>
        <SegmentedControl
          value={range()}
          onChange={setRange}
          options={[
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' },
            { value: '90d', label: '90d' },
          ]}
        />
      </CardHeader>
      <CardContent class="flex flex-1 flex-col gap-4">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Deploys" value="1,284" delta="12.4% vs last week" />
          <Metric label="Success rate" value="98.2%" delta="0.6%" />
          <Metric label="Median build" value="42s" delta="8s faster" />
          <Metric label="Incidents" value="2" delta="2 fewer" positive={false} />
        </div>
        {/* The card stretches to match its row; the plot absorbs the
            leftover height so the surface never trails off into blank fill. */}
        <div class="flex flex-1 items-center rounded-control border border-[var(--floe-line)] p-3">
          <DataBarChart
            class="flex-1"
            height={170}
            showGrid
            data={[
              { label: 'Mon', value: 148 },
              { label: 'Tue', value: 205 },
              { label: 'Wed', value: 173 },
              { label: 'Thu', value: 241 },
              { label: 'Fri', value: 198 },
              { label: 'Sat', value: 92 },
              { label: 'Sun', value: 61 },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* ── New project form ───────────────────────────────────────────────────── */

function ProjectForm() {
  const [visibility, setVisibility] = createSignal('private');
  const [notify, setNotify] = createSignal(true);
  const [name, setName] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const save = async () => {
    if (saving()) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>New project</CardTitle>
        <CardDescription>Anyone on the workspace can be invited after creation.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="space-y-1.5">
          <label class="text-caption font-medium text-[var(--floe-ink-soft)]" for="scenario-name">
            Project name
          </label>
          <Input
            id="scenario-name"
            placeholder="acme-console"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            error={
              name().length > 0 && name().length < 3 ? 'Use at least 3 characters.' : undefined
            }
          />
        </div>
        <div class="space-y-1.5">
          <label
            class="text-caption font-medium text-[var(--floe-ink-soft)]"
            for="scenario-visibility"
          >
            Visibility
          </label>
          <Select
            value={visibility()}
            onChange={setVisibility}
            options={[
              { value: 'private', label: 'Private' },
              { value: 'internal', label: 'Internal' },
              { value: 'public', label: 'Public' },
            ]}
          />
        </div>
        <Checkbox
          checked={notify()}
          onChange={setNotify}
          label="Notify the team"
          description="Post to #engineering when the project is ready."
        />
      </CardContent>
      <CardFooter class="justify-end">
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary" loading={saving()} onClick={save}>
          Create project
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ── Team activity ──────────────────────────────────────────────────────── */

const ACTIVITY = [
  { name: 'Mira Chen', action: 'merged', target: 'PR #482 — rail icon family', time: '4m' },
  { name: 'Jonas Alvarez', action: 'deployed', target: 'console@1.42.0 to prod', time: '22m' },
  { name: 'Priya Raman', action: 'opened', target: 'PR #485 — deck presets', time: '1h' },
  {
    name: 'Tomas Novak',
    action: 'commented on',
    target: 'RFC: workbench wheel ownership',
    time: '3h',
  },
];

function TeamActivity() {
  return (
    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <CardTitle>Team activity</CardTitle>
        <Button variant="ghost" size="sm" icon={Filter}>
          Filter
        </Button>
      </CardHeader>
      <CardContent class="space-y-0 pt-2">
        <For each={ACTIVITY}>
          {(entry, i) => (
            <div
              class="flex items-start gap-2.5 py-2"
              classList={{ 'border-t border-[var(--floe-line-quiet)]': i() > 0 }}
            >
              <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--floe-well)] text-[var(--floe-ink-soft)]">
                <User class="h-3.5 w-3.5" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="text-[length:var(--floe-type-control)] leading-snug">
                  <span class="font-medium">{entry.name}</span>{' '}
                  <span class="text-[var(--floe-ink-soft)]">{entry.action}</span>{' '}
                  <span class="text-[var(--floe-ink)]">{entry.target}</span>
                </div>
              </div>
              <span class="shrink-0 text-caption text-[var(--floe-ink-quiet)]">{entry.time}</span>
            </div>
          )}
        </For>
      </CardContent>
    </Card>
  );
}

/* ── Deploy / connect ───────────────────────────────────────────────────── */

function ConnectCard() {
  const [copied, setCopied] = createSignal(false);
  const copy = () => {
    void navigator.clipboard?.writeText('https://app.floe.dev/p/acme-console');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pair a device</CardTitle>
        <CardDescription>Open the workspace on another machine.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex items-center justify-center rounded-control border border-[var(--floe-line)] bg-[var(--floe-well)] py-4">
          {/* A QR placeholder drawn from the icon grid, so the block has the
              right silhouette without shipping an image. */}
          <div class="grid grid-cols-7 gap-0.5" aria-hidden="true">
            <For
              each={[
                1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1,
                1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1,
              ]}
            >
              {(cell) => (
                <span
                  class="h-2 w-2 rounded-[1px]"
                  classList={{
                    'bg-[var(--floe-ink)]': !!cell,
                    'bg-transparent': !cell,
                  }}
                />
              )}
            </For>
          </div>
        </div>
        <Button variant="outline" class="w-full" icon={copied() ? Check : Copy} onClick={copy}>
          {copied() ? 'Link copied' : 'Copy workspace link'}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <Card class="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--floe-well)] text-[var(--floe-ink-quiet)]">
        <Layers class="h-5 w-5" />
      </span>
      <div class="space-y-0.5">
        <div class="text-[length:var(--floe-type-control)] font-medium">No snapshots yet</div>
        <p class="max-w-[240px] text-caption leading-snug text-[var(--floe-ink-soft)]">
          Snapshots capture the current layout so you can restore it later.
        </p>
      </div>
      <Button variant="primary" size="sm" icon={Plus}>
        Create snapshot
      </Button>
    </Card>
  );
}

/* ── Task list ──────────────────────────────────────────────────────────── */

const TASKS = [
  { label: 'Review async layout contract', done: true, owner: 'Mira', due: 'Today' },
  { label: 'Land rail icon family', done: true, owner: 'Mira', due: 'Today' },
  { label: 'Split showcase into pages', done: false, owner: 'Jonas', due: 'Tomorrow' },
  { label: 'Scenario gallery review', done: false, owner: 'Priya', due: 'Fri' },
];

function TaskList() {
  const [done, setDone] = createSignal<Record<string, boolean>>(
    Object.fromEntries(TASKS.map((t) => [t.label, t.done]))
  );
  const remaining = () => Object.values(done()).filter((v) => !v).length;
  return (
    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <div class="space-y-1">
          <CardTitle>Release checklist</CardTitle>
          <CardDescription>{remaining()} remaining</CardDescription>
        </div>
        <Button variant="ghost" size="icon" title="More">
          <MoreHorizontal class="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent class="space-y-2 pt-2">
        <For each={TASKS}>
          {(task) => (
            <div class="flex items-center gap-2.5">
              <Checkbox
                checked={done()[task.label]}
                onChange={(checked) => setDone((prev) => ({ ...prev, [task.label]: checked }))}
              />
              <span
                class="flex-1 text-[length:var(--floe-type-control)]"
                classList={{
                  'line-through text-[var(--floe-ink-quiet)]': done()[task.label],
                }}
              >
                {task.label}
              </span>
              <Tag tone="soft" size="sm">
                {task.due}
              </Tag>
            </div>
          )}
        </For>
      </CardContent>
    </Card>
  );
}

/* ── Billing / usage ────────────────────────────────────────────────────── */

function UsageCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage this cycle</CardTitle>
        <CardDescription>Pro plan · renews Nov 1</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1.5">
          <div class="flex items-baseline justify-between">
            <span class="text-caption text-[var(--floe-ink-soft)]">Build minutes</span>
            <span class="text-caption tabular-nums text-[var(--floe-ink-soft)]">4,180 / 6,000</span>
          </div>
          <LinearProgress value={70} size="sm" />
        </div>
        <div class="space-y-1.5">
          <div class="flex items-baseline justify-between">
            <span class="text-caption text-[var(--floe-ink-soft)]">Storage</span>
            <span class="text-caption tabular-nums text-[var(--floe-ink-soft)]">
              82 GB / 100 GB
            </span>
          </div>
          <LinearProgress value={82} size="sm" color="warning" />
        </div>
        <div class="flex items-center justify-between rounded-control bg-[var(--floe-well)] px-3 py-2">
          <div>
            <div class="text-caption text-[var(--floe-ink-soft)]">Next invoice</div>
            <div class="text-base font-semibold tabular-nums">$248.00</div>
          </div>
          <Button variant="outline" size="sm" icon={ChevronRight}>
            Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Chat composer ──────────────────────────────────────────────────────── */

const MESSAGES = [
  {
    role: 'user' as const,
    name: 'You',
    body: 'Can the release checklist reuse the new checkbox states?',
  },
  {
    role: 'assistant' as const,
    name: 'Floe',
    body: 'Yes — the checkbox is the same primitive. The list only adds row rhythm and a strike-through on completion, so keyboard and screen-reader behavior is unchanged.',
  },
  {
    role: 'user' as const,
    name: 'You',
    body: 'Then ship it with the new rail icons.',
  },
];

function ChatComposer() {
  const [draft, setDraft] = createSignal('');
  return (
    <Card class="col-span-1 md:col-span-2">
      <CardHeader class="flex-row items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--floe-well)] text-[var(--floe-ink-soft)]">
            <Sparkles class="h-3.5 w-3.5" />
          </span>
          <CardTitle>Release thread</CardTitle>
        </div>
        <Tag tone="soft" size="sm" variant="success" dot>
          3 members
        </Tag>
      </CardHeader>
      <CardContent class="space-y-3 pt-2">
        <For each={MESSAGES}>
          {(message) => (
            <div class="flex gap-2.5" classList={{ 'flex-row-reverse': message.role === 'user' }}>
              <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--floe-well)] text-[var(--floe-ink-soft)]">
                <Show when={message.role === 'user'} fallback={<Sparkles class="h-3.5 w-3.5" />}>
                  <User class="h-3.5 w-3.5" />
                </Show>
              </span>
              <div
                class="max-w-[80%] rounded-control px-3 py-2 text-[length:var(--floe-type-control)] leading-snug"
                classList={{
                  'bg-[var(--floe-well)]': message.role === 'user',
                  'bg-card border border-[var(--floe-line)]': message.role !== 'user',
                }}
              >
                {message.body}
              </div>
            </div>
          )}
        </For>

        <div
          data-floe-input-surface
          class="flex items-end gap-2 rounded-control border border-[var(--floe-line-strong)] p-1.5"
        >
          <textarea
            class="max-h-24 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1 text-[length:var(--floe-type-control)] outline-none"
            placeholder="Reply to the thread…"
            value={draft()}
            onInput={(e) => setDraft(e.currentTarget.value)}
          />
          <Button variant="primary" size="icon" title="Send" disabled={!draft().trim()}>
            <Send class="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Notifications ──────────────────────────────────────────────────────── */

function NotificationCard() {
  return (
    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <CardTitle>Notifications</CardTitle>
        <Tooltip content="Mark all read">
          <Button variant="ghost" size="sm" icon={Check}>
            Read
          </Button>
        </Tooltip>
      </CardHeader>
      <CardContent class="space-y-2 pt-2">
        <div class="flex items-start gap-2.5 rounded-control bg-[var(--floe-well)] px-2.5 py-2">
          <span class="mt-0.5 text-success">
            <CheckCircle class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[length:var(--floe-type-control)] leading-snug">
              Deploy finished in 41s
            </div>
            <div class="text-caption text-[var(--floe-ink-quiet)]">console@1.42.0 · 2m ago</div>
          </div>
          <Button variant="ghost" size="icon" title="Dismiss">
            <X class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div class="flex items-start gap-2.5 px-2.5 py-2">
          <span class="mt-0.5 text-[var(--floe-ink-soft)]">
            <MessageSquare class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[length:var(--floe-type-control)] leading-snug">
              Priya mentioned you in RFC #12
            </div>
            <div class="text-caption text-[var(--floe-ink-quiet)]">1h ago</div>
          </div>
        </div>
        <div class="flex items-start gap-2.5 px-2.5 py-2">
          <span class="mt-0.5 text-[var(--floe-ink-soft)]">
            <Clock class="h-4 w-4" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-[length:var(--floe-type-control)] leading-snug">
              Snapshot scheduled for 02:00
            </div>
            <div class="text-caption text-[var(--floe-ink-quiet)]">Tomorrow</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Distribution ───────────────────────────────────────────────────────── */

function DistributionCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deploys by environment</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent class="flex justify-center pt-2">
        <DataPieChart
          size={168}
          innerRadius={0.62}
          data={[
            { label: 'Production', value: 62, color: 'var(--chart-1)' },
            { label: 'Staging', value: 24, color: 'var(--chart-2)' },
            { label: 'Preview', value: 14, color: 'var(--chart-3)' },
          ]}
        />
      </CardContent>
    </Card>
  );
}

/* ── Command row ────────────────────────────────────────────────────────── */

function SearchRow() {
  return (
    <Card class="col-span-1 md:col-span-3">
      <CardContent class="flex flex-wrap items-center gap-2 py-2.5">
        <div class="min-w-[220px] flex-1">
          <Input
            placeholder="Search projects, branches, people…"
            leftIcon={<Search class="h-3.5 w-3.5" />}
          />
        </div>
        <Button variant="outline" size="sm" icon={Calendar}>
          Last 30 days
        </Button>
        <Button variant="outline" size="sm" icon={Filter}>
          Filters
        </Button>
        <Button variant="primary" size="sm" icon={Plus}>
          New
        </Button>
        <Button variant="ghost" size="sm" icon={Activity}>
          Activity
        </Button>
        <Button variant="ghost" size="sm" icon={BarChart}>
          Reports
        </Button>
        <Button variant="ghost" size="icon" title="Notifications">
          <Bell class="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function ScenariosPage(props: ScenariosPageProps) {
  return (
    <ShowcaseFrame class="space-y-10">
      <div class="space-y-2">
        <h1 class="text-lg font-bold">Scenarios</h1>
        <p class="max-w-2xl text-caption leading-snug text-[var(--floe-ink-soft)]">
          Composed product surfaces built only from the library's public primitives. Spacing, type
          and state come from the same tokens the catalog documents — nothing here is a mock.
        </p>
      </div>

      <section class="space-y-3">
        <SectionIntro
          title="Operations console"
          description="Overview, activity and search in the density a daily-use console needs."
        />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <WorkspaceOverview />
          <TeamActivity />
          <SearchRow />
          <UsageCard />
          <DistributionCard />
          <ConnectCard />
        </div>
      </section>

      <section class="space-y-3">
        <SectionIntro
          title="Workspace flows"
          description="Creation, planning and notification surfaces in one page rhythm."
        />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ProjectForm />
          <TaskList />
          <EmptyState />
        </div>
      </section>

      <section class="space-y-3">
        <SectionIntro
          title="Conversation"
          description="Chat blocks and a composer that keeps the input contract intact."
        />
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ChatComposer />
          <NotificationCard />
        </div>
      </section>

      <section class="space-y-3">
        <SectionIntro
          title="Use the pieces"
          description="Every block above is assembled from pages in the catalog."
        />
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => props.onSelectSection('ui-cards')}>
            Cards
          </Button>
          <Button variant="outline" size="sm" onClick={() => props.onSelectSection('ui-forms')}>
            Form
          </Button>
          <Button variant="outline" size="sm" onClick={() => props.onSelectSection('ui-charts')}>
            Charts
          </Button>
          <Button variant="outline" size="sm" onClick={() => props.onSelectSection('ui-buttons')}>
            Buttons
          </Button>
          <Button variant="outline" size="sm" onClick={() => props.onSelectSection('ui-inputs')}>
            Inputs
          </Button>
        </div>
      </section>

      <section class="space-y-3">
        <SectionIntro
          title="How a block is built"
          description="No scenario-specific CSS: spacing and state come from the primitives."
        />
        <CodeSnippet
          title="Scenario block"
          language="tsx"
          maxHeight="220px"
          code={`<Card>
  <CardHeader>
    <CardTitle>Release checklist</CardTitle>
    <CardDescription>{remaining()} remaining</CardDescription>
  </CardHeader>
  <CardContent class="space-y-2 pt-2">
    <For each={tasks}>{(task) => (
      <Checkbox
        checked={done()[task.label]}
        onChange={(checked) => update(task.label, checked)}
        label={task.label}
      />
    )}</For>
  </CardContent>
</Card>`}
        />
      </section>
    </ShowcaseFrame>
  );
}
