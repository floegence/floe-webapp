import { For, Show, createSignal, onCleanup } from 'solid-js';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  LinearProgress,
  Tag,
} from '@floegence/floe-webapp-core/ui';
import { Check, Play } from '@floegence/floe-webapp-core/icons';
import { TASK_STEPS, taskStep, type TaskStatus } from './model';

export function TaskScenario() {
  const [status, setStatus] = createSignal<TaskStatus>('idle');
  const [completed, setCompleted] = createSignal(0);
  const [failure, setFailure] = createSignal('success');
  const [reportOpen, setReportOpen] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  const tick = () => {
    const next = taskStep(status(), completed(), failure() === 'failure');
    setCompleted(next.completed);
    setStatus(next.status);
    if (next.status === 'running') timer = setTimeout(tick, 850);
  };
  const start = () => {
    clearTimeout(timer);
    setCompleted(0);
    setStatus('running');
    setReportOpen(false);
    timer = setTimeout(tick, 850);
  };
  const cancel = () => {
    clearTimeout(timer);
    setStatus('cancelled');
  };
  const reset = () => {
    clearTimeout(timer);
    setStatus('idle');
    setCompleted(0);
    setFailure('success');
    setReportOpen(false);
  };
  const statusLabel = () =>
    ({
      idle: 'Ready',
      running: 'Running',
      failed: 'Failed',
      cancelled: 'Cancelled',
      succeeded: 'Completed',
    })[status()];
  return (
    <div class="space-y-4" data-scenario="task">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold">Release check</h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            A deterministic local simulation. No build or remote operation is executed.
          </p>
        </div>
        <Button size="sm" variant="ghost" disabled={status() === 'running'} onClick={reset}>
          Reset task
        </Button>
      </div>
      <Card>
        <CardHeader class="flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Preview readiness</CardTitle>
          <Tag
            size="sm"
            tone="soft"
            variant={
              status() === 'failed' ? 'error' : status() === 'succeeded' ? 'success' : 'neutral'
            }
          >
            {statusLabel()}
          </Tag>
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <label class="space-y-1 text-xs">
              <span class="block text-[var(--floe-ink-soft)]">Example outcome</span>
              <select
                class="floe-field h-8 rounded-control px-2"
                aria-label="Example outcome"
                disabled={status() === 'running'}
                value={failure()}
                onChange={(event) => setFailure(event.currentTarget.value)}
              >
                <option value="success">Successful check</option>
                <option value="failure">Accessibility check fails</option>
              </select>
            </label>
            <div class="flex gap-2">
              <Button variant="outline" disabled={status() !== 'running'} onClick={cancel}>
                Cancel task
              </Button>
              <Button
                variant="primary"
                icon={Play}
                loading={status() === 'running'}
                onClick={start}
              >
                Run check
              </Button>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-xs">
              <span role="status">
                {statusLabel()} · {completed()} of {TASK_STEPS.length} steps
              </span>
              <span class="tabular-nums">{(completed() / TASK_STEPS.length) * 100}%</span>
            </div>
            <LinearProgress
              value={(completed() / TASK_STEPS.length) * 100}
              color={status() === 'failed' ? 'error' : 'primary'}
            />
          </div>
          <ol class="divide-y divide-[var(--floe-line-quiet)]">
            <For each={TASK_STEPS}>
              {(step, index) => (
                <li class="flex items-center gap-3 py-3 text-sm">
                  <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--floe-well)] text-xs">
                    <Show when={index() < completed()} fallback={index() + 1}>
                      <Check class="h-3.5 w-3.5" aria-label="Completed" />
                    </Show>
                  </span>
                  <span class="flex-1">{step}</span>
                  <span class="text-xs text-[var(--floe-ink-soft)]">
                    {index() < completed()
                      ? 'Complete'
                      : index() === completed() && status() === 'running'
                        ? 'In progress'
                        : index() === completed() && status() === 'failed'
                          ? 'Failed'
                          : 'Pending'}
                  </span>
                </li>
              )}
            </For>
          </ol>
          <div
            class="rounded-control bg-[var(--floe-well)] p-3 text-xs leading-relaxed"
            aria-label="Task output"
          >
            <p class="mb-2 font-medium">Run output</p>
            <Show
              when={completed() > 0}
              fallback={
                <p class="text-[var(--floe-ink-soft)]">Start a check to see each completed step.</p>
              }
            >
              <For each={TASK_STEPS.slice(0, completed())}>{(step) => <p>{step}: complete</p>}</For>
            </Show>
            <Show when={status() === 'cancelled'}>
              <p>Cancelled by you. No further work is scheduled.</p>
            </Show>
            <Show when={status() === 'failed'}>
              <p role="alert" class="mt-2 text-error">
                Accessibility check failed in this example. Choose “Successful check” and run again
                to simulate a corrected build. Previous output is retained until the new run starts.
              </p>
            </Show>
            <Show when={status() === 'succeeded'}>
              <p class="mt-2 text-success">All checks completed. The example report is ready.</p>
            </Show>
          </div>
          <Show when={status() === 'succeeded'}>
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              View report
            </Button>
          </Show>
        </CardContent>
      </Card>
      <Dialog
        open={reportOpen()}
        onOpenChange={setReportOpen}
        title="Release check report"
        bodyDescription="Results from the local example run. These are simulated results, not a certification of this application."
      >
        <ul class="space-y-3 text-sm">
          <For each={TASK_STEPS}>
            {(step) => (
              <li class="flex items-center gap-2">
                <Check class="h-4 w-4 text-success" />
                {step}: passed
              </li>
            )}
          </For>
        </ul>
      </Dialog>
    </div>
  );
}
