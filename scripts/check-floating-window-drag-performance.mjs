/* global window, document, performance, requestAnimationFrame, cancelAnimationFrame, setTimeout */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { openSurfaceBrowser, artifactRoot } from './surface-browser-utils.mjs';

const repetitions = Number(
  process.argv.find((arg) => arg.startsWith('--repetitions='))?.split('=')[1] ?? 5
);
assert.ok(Number.isInteger(repetitions) && repetitions > 0, 'repetitions must be positive');
const outputName =
  process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ?? 'drag-performance';
const output = resolve(artifactRoot, outputName);
mkdirSync(output, { recursive: true });
const runtime = await openSurfaceBrowser();
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
const percentile = (values, quantile) => {
  if (!values.length) return 0;
  return [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * quantile))
  ];
};

async function measure(repetition) {
  const page = await runtime.browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${runtime.baseURL}/current-styles/dist/?panel=windows&surface=standard&theme=paper`);
  const titlebar = page.locator('[data-floe-floating-window-titlebar]').first();
  await titlebar.waitFor();
  await page.evaluate(() => {
    const panel = document.querySelector('[data-floe-geometry-surface="floating-window"]');
    const title = panel?.querySelector('[data-floe-floating-window-titlebar]');
    if (!panel || !title) throw new Error('FloatingWindow drag target is missing');
    const state = {
      active: false,
      startPointer: null,
      startRect: null,
      latestPointer: null,
      errors: [],
      latencies: [],
      frameDeltas: [],
      lastFrame: 0,
      raf: 0,
    };
    const onDown = (event) => {
      if (event.button !== 0) return;
      const rect = panel.getBoundingClientRect();
      state.active = true;
      state.startPointer = { x: event.clientX, y: event.clientY };
      state.startRect = { x: rect.x, y: rect.y };
      state.latestPointer = { x: event.clientX, y: event.clientY, at: performance.now() };
      state.lastFrame = 0;
    };
    const onMove = (event) => {
      if (!state.active) return;
      state.latestPointer = { x: event.clientX, y: event.clientY, at: performance.now() };
    };
    const onUp = () => {
      state.active = false;
      state.latestPointer = null;
    };
    const frame = (time) => {
      if (state.lastFrame) state.frameDeltas.push(time - state.lastFrame);
      state.lastFrame = time;
      if (state.active && state.latestPointer && state.startPointer && state.startRect) {
        const rect = panel.getBoundingClientRect();
        const expectedX = state.startRect.x + state.latestPointer.x - state.startPointer.x;
        const expectedY = state.startRect.y + state.latestPointer.y - state.startPointer.y;
        state.errors.push(Math.hypot(rect.x - expectedX, rect.y - expectedY));
        state.latencies.push(Math.max(0, time - state.latestPointer.at));
      }
      state.raf = requestAnimationFrame(frame);
    };
    title.addEventListener('pointerdown', onDown, true);
    document.addEventListener('pointermove', onMove, true);
    document.addEventListener('pointerup', onUp, true);
    state.raf = requestAnimationFrame(frame);
    window.finishFloatingWindowDragMetric = () => {
      cancelAnimationFrame(state.raf);
      title.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('pointermove', onMove, true);
      document.removeEventListener('pointerup', onUp, true);
      return {
        errors: state.errors,
        latencies: state.latencies,
        frameDeltas: state.frameDeltas,
      };
    };
  });
  const bounds = await titlebar.boundingBox();
  assert.ok(bounds, 'titlebar must have bounds');
  const startX = bounds.x + Math.min(120, bounds.width / 2);
  const startY = bounds.y + bounds.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  const points = 120;
  for (let index = 1; index <= points; index += 1) {
    const phase = (index / points) * Math.PI * 2;
    // Keep the path inside the fixture's safe viewport (top inset is 126px) so
    // the metric measures compositor follow-through rather than clamping.
    await page.mouse.move(startX + Math.sin(phase) * 140, startY + Math.sin(phase * 0.7) * 28);
    await pause(8);
  }
  await page.mouse.up();
  await pause(80);
  const metric = await page.evaluate(() => window.finishFloatingWindowDragMetric());
  await page.close();
  const framePeriod = percentile(metric.frameDeltas, 0.5) || 16.67;
  const missed = metric.frameDeltas.reduce(
    (sum, delta) => sum + Math.max(0, Math.round(delta / framePeriod) - 1),
    0
  );
  const frameCount = metric.frameDeltas.length + missed;
  return {
    repetition,
    samples: metric.errors.length,
    maxErrorPx: Math.max(0, ...metric.errors),
    meanErrorPx: metric.errors.length
      ? metric.errors.reduce((sum, value) => sum + value, 0) / metric.errors.length
      : 0,
    p95ErrorPx: percentile(metric.errors, 0.95),
    inputToNextFrameP95Ms: percentile(metric.latencies, 0.95),
    missedFramePct: frameCount ? (100 * missed) / frameCount : 0,
    framePeriodMs: framePeriod,
  };
}

try {
  const samples = [];
  for (let repetition = 0; repetition < repetitions; repetition += 1)
    samples.push(await measure(repetition));
  const medianOf = (key) => percentile(samples.map((sample) => sample[key]), 0.5);
  const summary = {
    methodology:
      'A trusted pointer drag follows a 120-point sinusoidal path. Each animation frame compares the rendered panel position with the pointer-derived expected position. Error is Euclidean distance in CSS pixels; input latency is measured from the latest pointermove to the next animation frame.',
    thresholds: {
      maxErrorPx: 12,
      p95ErrorPx: 8,
      inputToNextFrameP95Ms: 35,
      missedFramePct: 5,
    },
    samples,
    median: {
      maxErrorPx: medianOf('maxErrorPx'),
      meanErrorPx: medianOf('meanErrorPx'),
      p95ErrorPx: medianOf('p95ErrorPx'),
      inputToNextFrameP95Ms: medianOf('inputToNextFrameP95Ms'),
      missedFramePct: medianOf('missedFramePct'),
    },
  };
  const pass =
    summary.median.maxErrorPx <= summary.thresholds.maxErrorPx &&
    summary.median.p95ErrorPx <= summary.thresholds.p95ErrorPx &&
    summary.median.inputToNextFrameP95Ms <= summary.thresholds.inputToNextFrameP95Ms &&
    summary.median.missedFramePct <= summary.thresholds.missedFramePct;
  summary.pass = pass;
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = pass ? 0 : 1;
} finally {
  await runtime.close();
}
