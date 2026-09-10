/* global window, document, performance, requestAnimationFrame, cancelAnimationFrame, PerformanceObserver */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { cpus, platform, release, totalmem } from 'node:os';
import { openSurfaceBrowser, openFixture, artifactRoot } from './surface-browser-utils.mjs';

const renderer =
  process.argv.find((arg) => arg.startsWith('--renderer='))?.split('=')[1] ?? 'chromium';
const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'light';
assert.ok(['light', 'dark'].includes(mode), 'unknown performance color mode');
const runtime = await openSurfaceBrowser({ renderer });
const requestedScenario = process.argv.find((arg) => arg.startsWith('--scenario='))?.split('=')[1];
const outputName =
  process.argv.find((arg) => arg.startsWith('--output='))?.split('=')[1] ?? 'performance';
const output = resolve(artifactRoot, outputName);
mkdirSync(output, { recursive: true });
const repetitions = 5;
const allScenarios = [
  'list-scroll',
  'chat-stream',
  'terminal-output',
  'window-drag',
  'window-resize',
  'workbench-pan-zoom',
  'menu-dialog',
  'typing',
  'dense-controls',
  'progress-updates',
];
const scenarios = requestedScenario
  ? allScenarios.filter((value) => value === requestedScenario)
  : allScenarios;
assert.ok(scenarios.length, 'unknown performance scenario');
const versions = [
  { id: 'A', version: 'baseline', surface: 'standard' },
  { id: 'B', version: 'current', surface: 'standard' },
  { id: 'C', version: 'current', surface: 'soft-neumorphic' },
];
const report = {
  environment: {
    browser: runtime.browser.version(),
    platform: platform(),
    release: release(),
    cpu: cpus()[0].model,
    cpus: cpus().length,
    totalMemory: totalmem(),
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
    headless: true,
    renderer: runtime.renderer,
    mode,
  },
  methodology:
    'Five interleaved repetitions; each sample warms the workload in its own page, restores the initial workload state, and settles before recording. Fixed 120-frame streams/scrolls; trusted mouse/keyboard actions. Paint and RasterTask intervals are unioned per thread to avoid nested double counting, then normalized per recorded second. Sustained cost regression requires median >10% and at least four of five paired samples >10%; hot frame loss median increment must be <=1 percentage point. Input-to-next-frame latency is a local feedback proxy, not INP. Traces include the complete recorded interval.',
  baseline: readFileSync(resolve(artifactRoot, 'baseline-sha.txt'), 'utf8').trim(),
  samples: [],
  comparisons: [],
};
const pause = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const percentile = (values, quantile) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * quantile))
  ] ?? 0;

async function frameLoad(page, scenario) {
  await page.evaluate(async (scenario) => {
    const list = document.querySelector('[data-list]');
    const chunk = 'Build completed: modules checked, assets emitted, workspace ready.\n';
    for (let i = 0; i < 120; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (scenario === 'list-scroll')
        list.scrollTop = (i * 38) % (list.scrollHeight - list.clientHeight);
      else
        window.surfaceFixture.setOutput(
          scenario === 'terminal-output'
            ? chunk.repeat(120) + `Output sequence ${i}`
            : chunk.slice(0, 30) + chunk.repeat(7).slice(0, i * 3)
        );
    }
  }, scenario);
}
async function workload(page, scenario) {
  if (scenario === 'dense-controls' || scenario === 'progress-updates') {
    return page.evaluate(async (scenario) => {
      const scroller = document.querySelector('[data-scroll]');
      const dense = document.querySelector('[data-dense-controls]');
      const start =
        scroller.scrollTop +
        dense.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top;
      const travel = Math.max(1, Math.min(900, dense.clientHeight - scroller.clientHeight));
      for (let i = 0; i < 120; i++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (scenario === 'dense-controls') scroller.scrollTop = start + ((i * 16) % travel);
        else window.surfaceFixture.setComponentProgress(i % 101);
      }
    }, scenario);
  }
  if (['list-scroll', 'chat-stream', 'terminal-output'].includes(scenario))
    return frameLoad(page, scenario);
  if (scenario === 'window-drag' || scenario === 'window-resize') {
    const selector =
      scenario === 'window-drag'
        ? '[data-floe-floating-window-titlebar]'
        : '[data-floe-floating-window-resize-handle="se"]';
    const target = page.locator(selector).first();
    const rect = await target.boundingBox();
    const x = rect.x + (scenario === 'window-drag' ? 100 : rect.width / 2),
      y = rect.y + rect.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 80; i++) {
      await page.mouse.move(
        x + Math.sin((i / 80) * Math.PI) * 100,
        y + Math.sin((i / 80) * Math.PI) * 70
      );
      await pause(20);
    }
    await page.mouse.up();
    return;
  }
  if (scenario === 'workbench-pan-zoom') {
    const rect = await page.locator('.workbench-frame').boundingBox();
    await page.mouse.move(rect.x + 20, rect.y + rect.height - 85);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, i < 20 ? 4 : -4);
      await pause(22);
    }
    const beforePan = await page.evaluate(() => window.surfaceFixture.state().viewport);
    await page.mouse.down();
    for (let i = 0; i < 40; i++) {
      await page.mouse.move(rect.x + 20 + i * 2, rect.y + rect.height - 85 + Math.sin(i / 10) * 15);
      await pause(20);
    }
    await page.mouse.up();
    const afterPan = await page.evaluate(() => window.surfaceFixture.state().viewport);
    assert.notEqual(afterPan.x, beforePan.x, 'the workload must actually pan Workbench');
    return;
  }
  if (scenario === 'typing') {
    for (let i = 0; i < 80; i++) {
      await page.keyboard.insertText(String.fromCharCode(97 + (i % 26)));
      await pause(20);
    }
    return;
  }
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await pause(90);
    await page.keyboard.press('Escape');
    await pause(90);
    await page.getByRole('button', { name: 'Review settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Review name' }).waitFor();
    await pause(90);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await pause(130);
  }
}
async function sample(version, scenario, repetition) {
  const { page, errors } = await openFixture(
    runtime.browser,
    runtime.baseURL,
    version.version,
    'styles',
    mode,
    version.surface
  );
  const components = scenario === 'dense-controls' || scenario === 'progress-updates';
  if (components) {
    await page.goto(
      `${runtime.baseURL}/${version.version}-styles/dist/?panel=components&dense=true&mode=${mode}&surface=${version.surface}`
    );
    await page.waitForFunction(() => !!window.surfaceFixture);
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      const scroller = document.querySelector('[data-scroll]');
      const dense = document.querySelector('[data-dense-controls]');
      scroller.scrollTop +=
        dense.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
    });
    assert.ok(
      (await page.locator('[data-dense-controls] [role="switch"]').evaluateAll(
        (els) =>
          els.filter((el) => {
            const r = el.parentElement.getBoundingClientRect();
            return r.top >= 40 && r.bottom <= window.innerHeight;
          }).length
      )) >= 4,
      'the component workload must show dense controls'
    );
  }
  const session = await page.context().newCDPSession(page);
  if (scenario.startsWith('window')) {
    await page.getByRole('button', { name: 'Open windows', exact: true }).click();
    await page.waitForTimeout(250);
  }
  if (scenario === 'list-scroll') await page.locator('[data-list]').scrollIntoViewIfNeeded();
  if (scenario === 'typing')
    await page.getByRole('textbox', { name: 'Workspace name', exact: true }).click();
  const initialViewport = await page.evaluate(() => window.surfaceFixture.state().viewport);
  const initialScrollTop = await page.locator('[data-scroll]').evaluate((el) => el.scrollTop);
  await workload(page, scenario);
  await page.evaluate((viewport) => {
    window.surfaceFixture.setState((state) => ({ ...state, viewport }));
    window.surfaceFixture.setOutput('Ready for streaming output.');
    const list = document.querySelector('[data-list]');
    if (list) list.scrollTop = 0;
    window.surfaceFixture.setComponentProgress(64);
  }, initialViewport);
  await page.locator('[data-scroll]').evaluate((el, value) => {
    el.scrollTop = value;
  }, initialScrollTop);
  if (scenario === 'typing')
    await page
      .getByRole('textbox', { name: 'Workspace name', exact: true })
      .fill('Studio workspace');
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const deltas = [];
    let last = 0,
      id;
    const frame = (t) => {
      if (last) deltas.push(t - last);
      last = t;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    const longTasks = [];
    const observer = new PerformanceObserver((list) =>
      longTasks.push(...list.getEntries().map((entry) => entry.duration))
    );
    observer.observe({ type: 'longtask' });
    const inputs = [];
    const input = () => {
      const start = performance.now();
      requestAnimationFrame(() => inputs.push(performance.now() - start));
    };
    document.addEventListener('input', input);
    window.finishMeasurement = () => {
      cancelAnimationFrame(id);
      document.removeEventListener('input', input);
      observer.disconnect();
      return { deltas, inputs, longTasks };
    };
  });
  const trace = [];
  session.on('Tracing.dataCollected', ({ value }) => trace.push(...value));
  if (repetition >= 0)
    await session.send('Tracing.start', {
      categories:
        'devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,cc',
      options: 'record-as-much-as-possible',
      transferMode: 'ReportEvents',
    });
  const start = Date.now();
  await workload(page, scenario);
  await page.waitForTimeout(50);
  const elapsed = Date.now() - start;
  const frames = await page.evaluate(() => window.finishMeasurement());
  if (repetition >= 0) {
    const complete = new Promise((resolve) => session.once('Tracing.tracingComplete', resolve));
    await session.send('Tracing.end');
    await complete;
  }
  const framePeriod = median(frames.deltas);
  const missed = frames.deltas.reduce(
    (sum, d) => sum + Math.max(0, Math.round(d / framePeriod) - 1),
    0
  );
  const sum = (name) => {
    const threads = new Map();
    for (const event of trace.filter((e) => e.name === name && typeof e.dur === 'number')) {
      const key = `${event.pid}/${event.tid}`;
      if (!threads.has(key)) threads.set(key, []);
      threads.get(key).push([event.ts, event.ts + event.dur]);
    }
    let duration = 0;
    for (const intervals of threads.values()) {
      let end = 0;
      for (const [start, finish] of intervals.sort((a, b) => a[0] - b[0])) {
        duration += Math.max(0, finish - Math.max(start, end));
        end = Math.max(end, finish);
      }
    }
    return duration / 1000;
  };
  const stats = {
    variant: version.id,
    scenario,
    repetition,
    elapsedMs: elapsed,
    framePeriodMs: framePeriod,
    missedFramePct: (100 * missed) / (frames.deltas.length + missed),
    paintMsPerSecond: (sum('Paint') / elapsed) * 1000,
    rasterMsPerSecond: (sum('RasterTask') / elapsed) * 1000,
    layoutMsPerSecond: (sum('Layout') / elapsed) * 1000,
    frameP95Ms: percentile(frames.deltas, 0.95),
    inputP95Ms: percentile(frames.inputs, 0.95),
    inputMaxMs: Math.max(0, ...frames.inputs),
    longTasks: frames.longTasks.length,
  };
  if (repetition >= 0) {
    const file = `${version.id}-${scenario}-${repetition}.json.gz`;
    writeFileSync(
      resolve(output, file),
      gzipSync(JSON.stringify({ traceEvents: trace, metadata: { ...stats, version } }))
    );
    stats.trace = file;
    report.samples.push(stats);
    writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(stats));
  }
  assert.deepEqual(errors, []);
  await page.close();
}
try {
  const browserSession = await runtime.browser.newBrowserCDPSession();
  report.environment.gpu = (await browserSession.send('SystemInfo.getInfo')).gpu;
  for (const scenario of scenarios) {
    for (let repetition = 0; repetition < repetitions; repetition++)
      for (let j = 0; j < versions.length; j++)
        await sample(versions[(j + repetition) % versions.length], scenario, repetition);
    for (const [id, baseId] of [
      ['B', 'A'],
      ['C', 'A'],
      ['C', 'B'],
    ]) {
      const base = report.samples.filter((s) => s.scenario === scenario && s.variant === baseId);
      const next = report.samples.filter((s) => s.scenario === scenario && s.variant === id);
      const comparison = { scenario, comparison: `${id}/${baseId}`, metrics: {}, blockers: [] };
      for (const metric of [
        'missedFramePct',
        'paintMsPerSecond',
        'rasterMsPerSecond',
        'inputP95Ms',
        'inputMaxMs',
      ]) {
        const a = median(base.map((s) => s[metric])),
          b = median(next.map((s) => s[metric]));
        const ratio = a > 0 ? b / a : null;
        const repeated = base.filter(
          (s) => next.find((n) => n.repetition === s.repetition)[metric] > s[metric] * 1.1
        ).length;
        comparison.metrics[metric] = { baseline: a, current: b, ratio, pairedIncreases: repeated };
        if (
          (metric === 'paintMsPerSecond' || metric === 'rasterMsPerSecond') &&
          ratio > 1.1 &&
          repeated >= 4
        )
          comparison.blockers.push(metric);
        if (scenario.includes('window') || scenario === 'workbench-pan-zoom')
          if (metric === 'missedFramePct' && b - a > 1) comparison.blockers.push(metric);
      }
      report.comparisons.push(comparison);
    }
  }
  report.status = report.comparisons.some((c) => c.blockers.length) ? 'investigate' : 'passed';
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, comparisons: report.comparisons }));
  if (report.status !== 'passed') process.exitCode = 1;
} finally {
  await runtime.close();
}
