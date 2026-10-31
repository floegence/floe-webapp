/** Deterministic local examples. Dates are fixture dates, never live telemetry. */
export const FIXTURE_END = Date.UTC(2026, 9, 31, 23, 59, 59, 999);
const DAY = 86_400_000;
export type RangeDays = 7 | 30 | 90;
export type Deployment = {
  id: string;
  service: string;
  environment: 'Production' | 'Staging' | 'Preview';
  status: 'Succeeded' | 'Failed';
  startedAt: number;
  duration: number;
  revision: string;
};
export const DEPLOYMENTS: readonly Deployment[] = Array.from({ length: 180 }, (_, day) =>
  Array.from({ length: 3 + (day % 4) }, (_, index): Deployment => ({
    id: `deploy-${day}-${index}`,
    service: ['console', 'api', 'worker'][index % 3]!,
    environment: (['Production', 'Staging', 'Preview'] as const)[index % 3]!,
    status: (day * 7 + index * 11) % (day < 90 ? 23 : 13) === 0 ? 'Failed' : 'Succeeded',
    startedAt: FIXTURE_END - day * DAY - index * 3_600_000,
    duration: 32 + ((day * 3 + index * 7) % 25) + (day >= 90 ? 8 : 0),
    revision: (0xa128f0 + day * 31 + index).toString(16),
  }))
).flat();
export function deploymentsInRange(days: RangeDays, previous = false) {
  const end = FIXTURE_END + 1 - (previous ? days * DAY : 0);
  return DEPLOYMENTS.filter((row) => row.startedAt < end && row.startedAt >= end - days * DAY);
}
export function summarize(rows: readonly Deployment[]) {
  const durations = rows.map((row) => row.duration).sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  const failed = rows.filter((row) => row.status === 'Failed').length;
  return {
    count: rows.length,
    successRate: rows.length ? ((rows.length - failed) / rows.length) * 100 : 0,
    medianBuild: durations.length
      ? (durations[middle]! + durations[Math.floor((durations.length - 1) / 2)]!) / 2
      : 0,
    failed,
  };
}
export function trend(
  current: number,
  previous: number,
  preference: 'higher' | 'lower' | 'neutral'
) {
  const change = current - previous;
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  const assessment =
    !change || preference === 'neutral'
      ? 'neutral'
      : (preference === 'higher' ? change > 0 : change < 0)
        ? 'improved'
        : 'worsened';
  return { change, direction, assessment } as const;
}
export function deploymentBuckets(days: RangeDays) {
  const width = days === 7 ? 1 : days === 30 ? 5 : 15;
  const rows = deploymentsInRange(days);
  return Array.from({ length: days / width }, (_, i) => {
    const start = FIXTURE_END + 1 - (days - i * width) * DAY;
    return {
      label: new Date(start).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
      value: rows.filter((row) => row.startedAt >= start && row.startedAt < start + width * DAY)
        .length,
      color: 'var(--chart-1)',
    };
  });
}
export const SAMPLE_FILES = [
  {
    id: 'release.md',
    name: 'release.md',
    content:
      '# October release\n\n- Review the deployment summary\n- Verify the console on a narrow screen\n- Share the release notes\n',
  },
  {
    id: 'checklist.md',
    name: 'checklist.md',
    content:
      '# Acceptance checklist\n\n[ ] Keyboard navigation\n[ ] Light and dark themes\n[ ] Saved content survives navigation\n',
  },
  {
    id: 'workspace.json',
    name: 'workspace.json',
    content: '{\n  "name": "floe-studio",\n  "environment": "preview"\n}\n',
  },
] as const;
export const TASK_STEPS = [
  'Validate workspace',
  'Build preview',
  'Check accessibility',
  'Prepare report',
] as const;
export type TaskStatus = 'idle' | 'running' | 'cancelled' | 'failed' | 'succeeded';
export function taskStep(status: TaskStatus, completed: number, shouldFail: boolean) {
  if (status !== 'running') return { status, completed };
  if (shouldFail && completed === 2) return { status: 'failed' as const, completed };
  const next = Math.min(completed + 1, TASK_STEPS.length);
  return { status: next === TASK_STEPS.length ? ('succeeded' as const) : status, completed: next };
}
