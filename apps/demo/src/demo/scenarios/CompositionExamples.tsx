import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DataPieChart,
  Dialog,
  FeedbackIndicator,
  Input,
  LinearProgress,
  Select,
  Tag,
} from '@floegence/floe-webapp-core/ui';
import { Copy, Plus, Send, X } from '@floegence/floe-webapp-core/icons';
import { deploymentsInRange } from './model';

/** Small compositions remain available alongside complete workflows. All data is local. */
export function CompositionExamples() {
  const [query, setQuery] = createSignal('');
  const [name, setName] = createSignal('');
  const [visibility, setVisibility] = createSignal('private');
  const [nameError, setNameError] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [projects, setProjects] = createSignal([{ name: 'floe-studio', visibility: 'private' }]);
  const [activity, setActivity] = createSignal(['Workspace opened', 'Example data loaded']);
  const [activityFilter, setActivityFilter] = createSignal('all');
  const [draft, setDraft] = createSignal('');
  const [messages, setMessages] = createSignal([
    'Review the release checklist before the next preview.',
  ]);
  const [checked, setChecked] = createSignal([true, true, false, false]);
  const [snapshot, setSnapshot] = createSignal<boolean[]>();
  const [notices, setNotices] = createSignal([
    { id: 1, text: 'Preview deployed', read: false },
    { id: 2, text: 'Review the release checklist', read: false },
    { id: 3, text: 'Example workspace is ready', read: true },
  ]);
  const [billing, setBilling] = createSignal(false);
  const [copied, setCopied] = createSignal('');
  const [copyError, setCopyError] = createSignal('');
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let copyButton: HTMLButtonElement | undefined;
  let projectInput: HTMLInputElement | undefined;
  onCleanup(() => {
    disposed = true;
    clearTimeout(timer);
  });
  const tasks = [
    'Review async layout',
    'Check keyboard navigation',
    'Verify narrow layout',
    'Record acceptance notes',
  ];
  const visibleProjects = createMemo(() =>
    projects().filter((project) => project.name.toLowerCase().includes(query().toLowerCase()))
  );
  const visibleActivity = () =>
    activityFilter() === 'all'
      ? activity()
      : activity().filter((item) => item.startsWith('Created'));
  const create = (event: SubmitEvent) => {
    event.preventDefault();
    if (saving()) return;
    const nextName = name().trim();
    if (nextName.length < 3) {
      setNameError('Use at least 3 characters.');
      projectInput?.focus();
      return;
    }
    if (projects().some((project) => project.name.toLowerCase() === nextName.toLowerCase())) {
      setNameError('This example project already exists.');
      projectInput?.focus();
      return;
    }
    const nextVisibility = visibility();
    setNameError('');
    setSaving(true);
    timer = setTimeout(() => {
      setProjects((items) => [...items, { name: nextName, visibility: nextVisibility }]);
      setActivity((items) => ['Created ' + nextName, ...items]);
      setNotices((items) => [
        {
          id: Math.max(0, ...items.map((item) => item.id)) + 1,
          text: 'Created ' + nextName,
          read: false,
        },
        ...items,
      ]);
      setSaving(false);
      setName('');
    }, 500);
  };
  const share = async () => {
    setCopied('');
    setCopyError('');
    try {
      await navigator.clipboard.writeText(
        new URL('?view=showcase&section=scenarios&scenario=compositions', location.href).href
      );
      if (disposed) return;
      setCopied('Example link copied. This link opens the example; local edits are not shared.');
    } catch {
      if (disposed) return;
      setCopyError('Clipboard access was unavailable. Copy the example URL from your address bar.');
    }
  };
  const send = (event: SubmitEvent) => {
    event.preventDefault();
    if (!draft().trim()) return;
    setMessages((items) => [...items, draft().trim()]);
    setDraft('');
  };
  const distribution = () =>
    ['Production', 'Staging', 'Preview'].map((label, index) => ({
      label,
      value: deploymentsInRange(30).filter((row) => row.environment === label).length,
      color: 'var(--chart-' + (index + 1) + ')',
    }));
  return (
    <div class="space-y-5" data-scenario="compositions">
      <header>
        <h2 class="text-base font-semibold">More compositions</h2>
        <p class="text-caption text-[var(--floe-ink-soft)]">
          Small product patterns using the same public components. Changes stay in this example
          session.
        </p>
      </header>
      <div class="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New project</CardTitle>
          </CardHeader>
          <CardContent class="pt-3">
            <form onSubmit={create} class="space-y-3">
              <label class="block space-y-1 text-xs">
                <span>Project name</span>
                <Input
                  ref={projectInput}
                  aria-label="Project name"
                  placeholder="release-preview"
                  value={name()}
                  disabled={saving()}
                  onInput={(event) => {
                    setName(event.currentTarget.value);
                    setNameError('');
                  }}
                  error={nameError() || undefined}
                />
              </label>
              <div class="space-y-1 text-xs">
                <span class="block" id="composition-visibility-label">
                  Visibility
                </span>
                <Select
                  ariaLabelledBy="composition-visibility-label"
                  value={visibility()}
                  onChange={setVisibility}
                  disabled={saving()}
                  options={[
                    { value: 'private', label: 'Private' },
                    { value: 'internal', label: 'Internal' },
                    { value: 'public', label: 'Public' },
                  ]}
                />
              </div>
              <p class="text-caption text-[var(--floe-ink-soft)]">
                Creates a local example project. No account or remote resource is created.
              </p>
              <div class="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  disabled={saving()}
                  onClick={() => {
                    setName('');
                    setNameError('');
                    setVisibility('private');
                  }}
                >
                  Clear form
                </Button>
                <Button type="submit" variant="primary" loading={saving()} icon={Plus}>
                  Create project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-3">
            <Input
              aria-label="Search example projects"
              placeholder="Find a project"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
            <ul class="space-y-2" aria-live="polite">
              <For each={visibleProjects()}>
                {(project) => (
                  <li class="flex items-center justify-between gap-2 rounded-control bg-[var(--floe-well)] p-3 text-sm">
                    <span class="min-w-0 break-all">{project.name}</span>
                    <Tag class="shrink-0" size="sm" tone="soft">
                      {project.visibility}
                    </Tag>
                  </li>
                )}
              </For>
            </ul>
            <Show when={!visibleProjects().length}>
              <p class="text-xs">No matching projects.</p>
              <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
                Clear project search
              </Button>
            </Show>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Team activity</CardTitle>
            <Select
              ariaLabel="Activity filter"
              value={activityFilter()}
              onChange={setActivityFilter}
              options={[
                { value: 'all', label: 'All activity' },
                { value: 'created', label: 'Project creation' },
              ]}
            />
          </CardHeader>
          <CardContent class="pt-3">
            <Show
              when={visibleActivity().length}
              fallback={
                <p class="text-xs text-[var(--floe-ink-soft)]">
                  No projects created yet. Use the project form to add one.
                </p>
              }
            >
              <ul class="divide-y divide-[var(--floe-line-quiet)]">
                <For each={visibleActivity()}>
                  {(item) => <li class="break-words py-2 text-sm">{item}</li>}
                </For>
              </ul>
            </Show>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Share this example</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-3">
            <p class="text-xs leading-relaxed text-[var(--floe-ink-soft)]">
              Open the same starting point on another device. Your local projects, files and layout
              are not included in the link.
            </p>
            <Show when={copyError()}>
              <p role="alert" class="text-xs text-error">
                {copyError()}
              </p>
            </Show>
            <div class="flex items-center gap-2">
              <Button ref={copyButton} variant="outline" icon={Copy} onClick={() => void share()}>
                Copy example link
              </Button>
              <FeedbackIndicator
                entries={copied() ? [{ id: 'copy', severity: 'info', summary: copied() }] : []}
                label="Share feedback"
                closeLabel="Close share feedback"
                restoreFocus={() => copyButton}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex-row items-center justify-between">
            <CardTitle>Release checklist</CardTitle>
            <Tag size="sm" tone="soft">
              {checked().filter((value) => !value).length} remaining
            </Tag>
          </CardHeader>
          <CardContent class="space-y-3 pt-3">
            <div class="grid gap-3">
              <For each={tasks}>
                {(task, index) => (
                  <Checkbox
                    label={task}
                    checked={checked()[index()]}
                    onChange={(value) =>
                      setChecked((items) => items.map((item, i) => (i === index() ? value : item)))
                    }
                  />
                )}
              </For>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setSnapshot([...checked()])}>
                Save checklist snapshot
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!snapshot()}
                onClick={() => setChecked([...snapshot()!])}
              >
                Restore snapshot
              </Button>
            </div>
            <Show when={snapshot()}>
              <p role="status" class="text-caption text-[var(--floe-ink-soft)]">
                Snapshot saved with {snapshot()!.filter(Boolean).length} completed items.
              </p>
            </Show>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usage this cycle</CardTitle>
          </CardHeader>
          <CardContent class="space-y-4 pt-3">
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span>Build minutes</span>
                <span class="tabular-nums">4,180 / 6,000</span>
              </div>
              <LinearProgress value={(4180 / 6000) * 100} size="sm" />
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span>Storage</span>
                <span class="tabular-nums">82 / 100 GB</span>
              </div>
              <LinearProgress value={82} size="sm" color="warning" />
            </div>
            <p class="text-caption text-[var(--floe-ink-soft)]">
              Example limits · no billing connection
            </p>
            <Button variant="outline" size="sm" onClick={() => setBilling(true)}>
              View usage details
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Release thread</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-3">
            <ul class="max-h-48 space-y-2 overflow-auto" aria-label="Local conversation">
              <For each={messages()}>
                {(message) => (
                  <li class="rounded-control bg-[var(--floe-well)] p-3 text-sm break-words">
                    {message}
                  </li>
                )}
              </For>
            </ul>
            <form onSubmit={send} class="flex items-end gap-2">
              <label class="min-w-0 flex-1">
                <span class="sr-only">Reply to release thread</span>
                <Input
                  aria-label="Reply to release thread"
                  value={draft()}
                  onInput={(event) => setDraft(event.currentTarget.value)}
                  placeholder="Add a local message"
                />
              </label>
              <Button type="submit" variant="primary" icon={Send} disabled={!draft().trim()}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Notifications</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              disabled={!notices().some((item) => !item.read)}
              onClick={() => setNotices((items) => items.map((item) => ({ ...item, read: true })))}
            >
              Mark all read
            </Button>
          </CardHeader>
          <CardContent class="pt-3">
            <Show
              when={notices().length}
              fallback={
                <p class="py-4 text-xs text-[var(--floe-ink-soft)]">You are all caught up.</p>
              }
            >
              <ul class="space-y-2">
                <For each={notices()}>
                  {(notice) => (
                    <li
                      class="flex items-center gap-2 rounded-control p-2"
                      classList={{ 'bg-[var(--floe-well)]': !notice.read }}
                    >
                      <span class="min-w-0 flex-1 break-words text-sm">
                        {notice.text}
                        <span class="ml-2 text-caption text-[var(--floe-ink-soft)]">
                          {notice.read ? 'Read' : 'Unread'}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={'Dismiss ' + notice.text}
                        onClick={() =>
                          setNotices((items) => items.filter((item) => item.id !== notice.id))
                        }
                      >
                        <X class="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Deployments by environment</CardTitle>
          </CardHeader>
          <CardContent class="space-y-3 pt-3">
            <DataPieChart size={168} innerRadius={0.62} animate={false} data={distribution()} />
            <p class="text-caption text-[var(--floe-ink-soft)]">
              Same 30-day dataset as the overview, ending October 31, 2026.
            </p>
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={billing()}
        onOpenChange={setBilling}
        title="Example usage"
        bodyDescription="These are illustrative local limits. No payment method, invoice or subscription is connected."
      >
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <dt>Build minutes used</dt>
          <dd>4,180</dd>
          <dt>Build minutes remaining</dt>
          <dd>1,820</dd>
          <dt>Storage used</dt>
          <dd>82 GB</dd>
          <dt>Storage remaining</dt>
          <dd>18 GB</dd>
        </dl>
      </Dialog>
    </div>
  );
}
