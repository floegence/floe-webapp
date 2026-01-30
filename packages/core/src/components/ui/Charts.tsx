import {
  Show,
  For,
  splitProps,
  createSignal,
  createEffect,
  onCleanup,
  createMemo,
  createUniqueId,
} from 'solid-js';
import { cn } from '../../utils/cn';

// =============================================================================
// Common Types
// =============================================================================

export interface ChartDataPoint {
  /** Label for the data point (x-axis or legend) */
  label: string;
  /** Numeric value */
  value: number;
  /** Optional custom color */
  color?: string;
}

export interface ChartSeries {
  /** Series name for legend */
  name: string;
  /** Data points in the series */
  data: number[];
  /** Optional custom color for the series */
  color?: string;
}

export type ChartVariant = 'default' | 'gradient' | 'minimal';

// =============================================================================
// LineChart Component
// =============================================================================

export interface LineChartProps {
  /** Data series to display */
  series: ChartSeries[];
  /** X-axis labels */
  labels: string[];
  /** Chart height in pixels */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Show data points */
  showPoints?: boolean;
  /** Show area fill under lines */
  showArea?: boolean;
  /** Use smooth curves instead of straight lines */
  smooth?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** Visual variant */
  variant?: ChartVariant;
  /** Additional class names */
  class?: string;
  /** Title displayed above the chart */
  title?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** X-axis label */
  xAxisLabel?: string;
  /** Fixed minimum value for y-axis (overrides computed bounds) */
  yMin?: number;
  /** Fixed maximum value for y-axis (overrides computed bounds) */
  yMax?: number;
  /** Format function for y-axis tick labels */
  formatYTick?: (value: number) => string;
  /** Format function for tooltip values (and point titles) */
  formatTooltipValue?: (value: number, ctx: { series: ChartSeries; seriesIndex: number; pointIndex: number }) => string;
  /** Maximum number of x-axis tick labels to render (helps avoid overlap/ghosting) */
  maxXAxisLabels?: number;
}

const defaultColors = [
  'var(--primary)',
  'oklch(0.65 0.18 160)', // teal
  'oklch(0.65 0.18 280)', // purple
  'oklch(0.65 0.18 45)',  // orange
  'oklch(0.65 0.18 340)', // pink
];

function clampFiniteNumber(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return v;
}

function formatNumberFixed(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return String(value);
  const s = value.toFixed(maxDecimals);
  return s.replace(/\.?0+$/, '');
}

/**
 * LineChart - A flexible line chart component for trend visualization.
 *
 * Features:
 * - Multiple series support
 * - Smooth or straight lines
 * - Area fill option
 * - Grid lines
 * - Animated drawing
 * - Interactive hover with crosshair and tooltip
 * - Responsive design
 */
export function LineChart(props: LineChartProps) {
  const [local] = splitProps(props, [
    'series',
    'labels',
    'height',
    'showGrid',
    'showLegend',
    'showPoints',
    'showArea',
    'smooth',
    'animate',
    'variant',
    'class',
    'title',
    'yAxisLabel',
    'xAxisLabel',
    'yMin',
    'yMax',
    'formatYTick',
    'formatTooltipValue',
    'maxXAxisLabels',
  ]);

  const id = createUniqueId();
  const height = () => local.height ?? 200;
  const showGrid = () => local.showGrid ?? true;
  const showLegend = () => local.showLegend ?? true;
  const showPoints = () => local.showPoints ?? true;
  const showArea = () => local.showArea ?? false;
  const smooth = () => local.smooth ?? true;
  const animate = () => local.animate ?? true;
  const variant = () => local.variant ?? 'default';
  const yMin = () => clampFiniteNumber(local.yMin);
  const yMax = () => clampFiniteNumber(local.yMax);
  const formatYTick = () => local.formatYTick ?? ((v: number) => String(Math.round(v)));
  const formatTooltipValue = () =>
    local.formatTooltipValue ?? ((v: number) => formatNumberFixed(v, 2));
  const maxXAxisLabels = () => {
    const v = clampFiniteNumber(local.maxXAxisLabels);
    if (!v) return undefined;
    const n = Math.floor(v);
    return n > 0 ? n : undefined;
  };

  // Chart dimensions - use larger viewBox for better proportions
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartWidth = 400; // Larger viewBox width for proper proportions
  const chartHeight = () => height();
  const svgViewBox = () => `0 0 ${chartWidth} ${chartHeight()}`;

  // Hover state
  const [hoverIndex, setHoverIndex] = createSignal<number | null>(null);
  let svgRef: SVGSVGElement | undefined;

  // Convert screen coordinates to SVG coordinates
  const screenToSVGCoords = (e: MouseEvent): { x: number; y: number } | null => {
    if (!svgRef) return null;

    // Use SVG's built-in coordinate transformation
    const point = svgRef.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;

    // Get the inverse of the screen transformation matrix
    const ctm = svgRef.getScreenCTM();
    if (!ctm) return null;

    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  };

  // Calculate data bounds
  const bounds = createMemo(() => {
    const allValues = local.series.flatMap((s) => s.data).filter((v) => Number.isFinite(v));

    const computedMin = allValues.length > 0 ? Math.min(0, ...allValues) : 0;
    const computedMax = allValues.length > 0 ? Math.max(...allValues) : 0;

    const min = yMin() ?? computedMin;
    const max = yMax() ?? computedMax;

    // Guard: avoid invalid range (empty series / same min-max / user mistakes)
    const safeMax = Number.isFinite(max) ? max : 0;
    const safeMin = Number.isFinite(min) ? min : 0;
    const finalMax = safeMax === safeMin ? safeMin + 1 : safeMax;
    const range = finalMax - safeMin || 1;
    return { min: safeMin, max: finalMax, range };
  });

  // Get data point positions
  const getPointPositions = createMemo(() => {
    const b = bounds();
    const dataLength = local.series[0]?.data.length ?? 0;
    const xStep = (chartWidth - padding.left - padding.right) / Math.max(1, dataLength - 1);
    const yScale = (height() - padding.top - padding.bottom) / b.range;

    return local.series.map((series) =>
      series.data.map((value, i) => ({
        x: padding.left + i * xStep,
        y: height() - padding.bottom - (value - b.min) * yScale,
        value,
      }))
    );
  });

  // Handle mouse move on SVG
  const handleMouseMove = (e: MouseEvent) => {
    const svgCoords = screenToSVGCoords(e);
    if (!svgCoords) return;

    const mouseX = svgCoords.x;

    // Find nearest data point index
    const dataLength = local.series[0]?.data.length ?? 0;
    if (dataLength === 0) return;

    const xStep = (chartWidth - padding.left - padding.right) / Math.max(1, dataLength - 1);
    const relativeX = mouseX - padding.left;
    const index = Math.round(relativeX / xStep);
    const clampedIndex = Math.max(0, Math.min(dataLength - 1, index));

    // Only update if within chart area
    if (mouseX >= padding.left && mouseX <= chartWidth - padding.right) {
      setHoverIndex(clampedIndex);
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Generate path for a series
  const generatePath = (data: number[], filled = false) => {
    if (data.length === 0) return '';

    const b = bounds();
    const xStep = (chartWidth - padding.left - padding.right) / Math.max(1, data.length - 1);
    const yScale = (height() - padding.top - padding.bottom) / b.range;

    const points = data.map((value, i) => ({
      x: padding.left + i * xStep,
      y: height() - padding.bottom - (value - b.min) * yScale,
    }));

    if (smooth() && points.length > 2) {
      // Bezier curve
      let path = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2 >= points.length ? i + 1 : i + 2];

        const tension = 0.3;
        const cp1x = p1.x + ((p2.x - p0.x) * tension);
        const cp1y = p1.y + ((p2.y - p0.y) * tension);
        const cp2x = p2.x - ((p3.x - p1.x) * tension);
        const cp2y = p2.y - ((p3.y - p1.y) * tension);

        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      if (filled) {
        path += ` L ${points[points.length - 1].x},${height() - padding.bottom}`;
        path += ` L ${points[0].x},${height() - padding.bottom} Z`;
      }
      return path;
    } else {
      // Straight lines
      let path = `M ${points[0].x},${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x},${points[i].y}`;
      }
      if (filled) {
        path += ` L ${points[points.length - 1].x},${height() - padding.bottom}`;
        path += ` L ${points[0].x},${height() - padding.bottom} Z`;
      }
      return path;
    }
  };

  // Animation state
  const [animationProgress, setAnimationProgress] = createSignal(animate() ? 0 : 1);

  createEffect(() => {
    if (!animate()) {
      setAnimationProgress(1);
      return;
    }

    let startTime: number;
    let animationId: number;

    const animateFrame = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / 800, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        animationId = requestAnimationFrame(animateFrame);
      }
    };

    animationId = requestAnimationFrame(animateFrame);
    onCleanup(() => cancelAnimationFrame(animationId));
  });

  // Y-axis ticks
  const yTicks = createMemo(() => {
    const b = bounds();
    const tickCount = 5;
    const step = b.range / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => {
      const value = b.min + step * i;
      return {
        value,
        y: height() - padding.bottom - ((value - b.min) / b.range) * (height() - padding.top - padding.bottom),
      };
    });
  });

  const getSeriesColor = (index: number, series: ChartSeries) =>
    series.color ?? defaultColors[index % defaultColors.length];

  const xTickIndices = createMemo(() => {
    const n = local.labels.length;
    if (n <= 0) return new Set<number>();

    const max = maxXAxisLabels();
    if (!max || max >= n) {
      return new Set<number>(Array.from({ length: n }, (_, i) => i));
    }

    // Pick indices evenly, always include first and last.
    if (max === 1) return new Set<number>([n - 1]);
    const out = new Set<number>();
    for (let i = 0; i < max; i += 1) {
      out.add(Math.round((i * (n - 1)) / (max - 1)));
    }
    return out;
  });

  return (
    <div class={cn('chart-container', local.class)}>
      <Show when={local.title}>
        <div class="chart-title">{local.title}</div>
      </Show>

      <svg
        ref={svgRef}
        viewBox={svgViewBox()}
        class="chart-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ height: `${height()}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <For each={local.series}>
            {(series, i) => (
              <linearGradient id={`gradient-${id}-${i()}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ 'stop-color': getSeriesColor(i(), series), 'stop-opacity': '0.4' }} />
                <stop offset="100%" style={{ 'stop-color': getSeriesColor(i(), series), 'stop-opacity': '0.05' }} />
              </linearGradient>
            )}
          </For>
        </defs>

        {/* Invisible rect for mouse events */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth - padding.left - padding.right}
          height={height() - padding.top - padding.bottom}
          fill="transparent"
          class="chart-hover-area"
        />

        {/* Grid */}
        <Show when={showGrid()}>
          <g class="chart-grid">
            <For each={yTicks()}>
              {(tick) => (
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={chartWidth - padding.right}
                  y2={tick.y}
                  class="chart-grid-line"
                />
              )}
            </For>
          </g>
        </Show>

        {/* Y-axis labels */}
        <g class="chart-axis-labels">
          <For each={yTicks()}>
            {(tick) => (
              <text x={padding.left - 6} y={tick.y} class="chart-axis-label" text-anchor="end" dominant-baseline="middle">
                {formatYTick()(tick.value)}
              </text>
            )}
          </For>
        </g>

        {/* X-axis labels */}
        <g class="chart-axis-labels">
          <For each={local.labels}>
            {(label, i) => {
              const idx = i();
              if (!label || !xTickIndices().has(idx)) return null;

              const x = padding.left + (idx * (chartWidth - padding.left - padding.right)) / Math.max(1, local.labels.length - 1);
              const isFirst = idx === 0;
              const isLast = idx === local.labels.length - 1;
              const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
              return (
                <text x={x} y={height() - padding.bottom + 14} class="chart-axis-label" text-anchor={anchor}>
                  {label}
                </text>
              );
            }}
          </For>
        </g>

        {/* Area fills */}
        <Show when={showArea()}>
          <For each={local.series}>
            {(series, i) => (
              <path
                d={generatePath(series.data, true)}
                fill={variant() === 'gradient' ? `url(#gradient-${id}-${i()})` : getSeriesColor(i(), series)}
                fill-opacity={variant() === 'gradient' ? 1 : 0.15}
                class="chart-area"
                style={{ opacity: animationProgress() }}
              />
            )}
          </For>
        </Show>

        {/* Lines */}
        <For each={local.series}>
          {(series, i) => {
            const path = generatePath(series.data);
            const pathLength = path.length * 2;
            return (
              <path
                d={path}
                fill="none"
                stroke={getSeriesColor(i(), series)}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="chart-line"
                style={{
                  'stroke-dasharray': animate() ? pathLength : 'none',
                  'stroke-dashoffset': animate() ? pathLength * (1 - animationProgress()) : 0,
                }}
              />
            );
          }}
        </For>

        {/* Data points */}
        <Show when={showPoints()}>
          <For each={local.series}>
            {(series, seriesIndex) => {
              const b = bounds();
              const xStep = (chartWidth - padding.left - padding.right) / Math.max(1, series.data.length - 1);
              const yScale = (height() - padding.top - padding.bottom) / b.range;
              return (
                <For each={series.data}>
                  {(value, i) => {
                    const x = padding.left + i() * xStep;
                    const y = height() - padding.bottom - (value - b.min) * yScale;
                    const isHovered = () => hoverIndex() === i();
                    return (
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered() ? 6 : 4}
                        fill={isHovered() ? getSeriesColor(seriesIndex(), series) : 'var(--background)'}
                        stroke={getSeriesColor(seriesIndex(), series)}
                        stroke-width="2"
                        class="chart-point"
                        style={{ opacity: animationProgress() }}
                      >
                        <title>{`${local.labels[i()] ?? ''}: ${formatTooltipValue()(value, { series, seriesIndex: seriesIndex(), pointIndex: i() })}`}</title>
                      </circle>
                    );
                  }}
                </For>
            );
            }}
          </For>
        </Show>

        {/* Hover crosshair and tooltip */}
        <Show when={hoverIndex() !== null}>
          {(() => {
            const idx = hoverIndex()!;
            const positions = getPointPositions();
            if (positions.length === 0 || !positions[0][idx]) return null;

            const xPos = positions[0][idx].x;
            const tooltipWidth = 100;
            const tooltipHeight = 18 + local.series.length * 18;

            // Position tooltip on left side if near right edge
            const tooltipOnRight = xPos + tooltipWidth + 15 < chartWidth - padding.right;
            const tooltipX = tooltipOnRight ? xPos + 12 : xPos - tooltipWidth - 12;

            return (
              <>
                {/* Vertical crosshair line */}
                <line
                  x1={xPos}
                  y1={padding.top}
                  x2={xPos}
                  y2={height() - padding.bottom}
                  class="chart-crosshair"
                />

                {/* Highlight points on crosshair */}
                <For each={positions}>
                  {(seriesPositions, seriesIdx) => {
                    const point = seriesPositions[idx];
                    if (!point) return null;
                    return (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={6}
                        fill={getSeriesColor(seriesIdx(), local.series[seriesIdx()])}
                        class="chart-crosshair-point"
                      />
                    );
                  }}
                </For>

                {/* Tooltip background */}
                <rect
                  x={tooltipX}
                  y={padding.top}
                  width={tooltipWidth}
                  height={tooltipHeight}
                  rx={4}
                  class="chart-tooltip-bg"
                />

                {/* Tooltip label */}
                <text
                  x={tooltipX + 10}
                  y={padding.top + 14}
                  class="chart-tooltip-label"
                >
                  {local.labels[idx]}
                </text>

                {/* Tooltip values */}
                <For each={local.series}>
                  {(series, seriesIdx) => {
                    const value = series.data[idx];
                    return (
                      <g>
                        <circle
                          cx={tooltipX + 14}
                          cy={padding.top + 28 + seriesIdx() * 18}
                          r={4}
                          fill={getSeriesColor(seriesIdx(), series)}
                        />
                        <text
                          x={tooltipX + 24}
                          y={padding.top + 32 + seriesIdx() * 18}
                          class="chart-tooltip-value"
                        >
                          {series.name}: {formatTooltipValue()(value, { series, seriesIndex: seriesIdx(), pointIndex: idx })}
                        </text>
                      </g>
                    );
                  }}
                </For>
              </>
            );
          })()}
        </Show>
      </svg>

      {/* Legend */}
      <Show when={showLegend() && local.series.length > 1}>
        <div class="chart-legend">
          <For each={local.series}>
            {(series, i) => (
              <div class="chart-legend-item">
                <div class="chart-legend-color" style={{ background: getSeriesColor(i(), series) }} />
                <span class="chart-legend-label">{series.name}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// =============================================================================
// AreaChart Component
// =============================================================================

export interface AreaChartProps extends Omit<LineChartProps, 'showArea'> {
  /** Stacked area chart */
  stacked?: boolean;
}

/**
 * AreaChart - A line chart variant with filled areas.
 * Ideal for showing volume or cumulative data.
 */
export function AreaChart(props: AreaChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { stacked: _, ...rest } = props;

  return <LineChart {...rest} showArea smooth variant="gradient" />;
}

// =============================================================================
// DataBarChart Component
// =============================================================================

export interface DataBarChartProps {
  /** Data points to display */
  data: ChartDataPoint[];
  /** Chart height in pixels */
  height?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show values on bars */
  showValues?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** Visual variant */
  variant?: ChartVariant;
  /** Additional class names */
  class?: string;
  /** Title displayed above the chart */
  title?: string;
}

/**
 * DataBarChart - A vertical bar chart component.
 *
 * Features:
 * - Value labels on bars
 * - Gradient or solid fill
 * - Animated bars
 */
export function DataBarChart(props: DataBarChartProps) {
  const [local] = splitProps(props, [
    'data',
    'height',
    'showGrid',
    'showValues',
    'animate',
    'variant',
    'class',
    'title',
  ]);

  const id = createUniqueId();
  const height = () => local.height ?? 200;
  const showGrid = () => local.showGrid ?? true;
  const showValues = () => local.showValues ?? true;
  const animate = () => local.animate ?? true;
  const variant = () => local.variant ?? 'default';

  // Chart dimensions - use larger viewBox for better proportions
  const padding = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartWidth = 400;
  const svgViewBox = () => `0 0 ${chartWidth} ${height()}`;

  // Calculate bounds
  const bounds = createMemo(() => {
    const values = local.data.map((d) => d.value).filter((v) => Number.isFinite(v));
    const max = values.length > 0 ? Math.max(...values) : 0;
    return { max: Math.max(max, 0) };
  });

  // Animation state
  const [animationProgress, setAnimationProgress] = createSignal(animate() ? 0 : 1);

  createEffect(() => {
    if (!animate()) {
      setAnimationProgress(1);
      return;
    }

    let startTime: number;
    let animationId: number;

    const animateFrame = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / 600, 1);
      // Easing
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimationProgress(eased);

      if (progress < 1) {
        animationId = requestAnimationFrame(animateFrame);
      }
    };

    animationId = requestAnimationFrame(animateFrame);
    onCleanup(() => cancelAnimationFrame(animationId));
  });

  // Bar dimensions
  const barSpacing = 0.3;
  const availableWidth = () => chartWidth - padding.left - padding.right;
  const barCount = () => Math.max(1, local.data.length);
  const gap = () => availableWidth() / barCount();
  const barWidth = () => gap() * (1 - barSpacing);
  const maxBarHeight = () => height() - padding.top - padding.bottom;
  const maxValue = () => {
    const m = bounds().max;
    return Number.isFinite(m) && m > 0 ? m : 1;
  };

  const getBarColor = (index: number, item: ChartDataPoint) =>
    item.color ?? defaultColors[index % defaultColors.length];

  return (
    <div class={cn('chart-container', local.class)}>
      <Show when={local.title}>
        <div class="chart-title">{local.title}</div>
      </Show>

      <svg
        viewBox={svgViewBox()}
        class="chart-svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ height: `${height()}px` }}
      >
        <defs>
          <For each={local.data}>
            {(item, i) => (
              <linearGradient id={`bar-gradient-${id}-${i()}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ 'stop-color': getBarColor(i(), item), 'stop-opacity': '1' }} />
                <stop offset="100%" style={{ 'stop-color': getBarColor(i(), item), 'stop-opacity': '0.7' }} />
              </linearGradient>
            )}
          </For>
        </defs>

        {/* Grid */}
        <Show when={showGrid()}>
          <g class="chart-grid">
            <For each={[0.25, 0.5, 0.75, 1]}>
              {(ratio) => {
                const y = height() - padding.bottom - ratio * (height() - padding.top - padding.bottom);
                return (
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    class="chart-grid-line"
                  />
                );
              }}
            </For>
          </g>
        </Show>

        {/* Bars */}
        <For each={local.data}>
          {(item, i) => {
            const value = () => (Number.isFinite(item.value) ? Math.max(0, item.value) : 0);
            const x = () => padding.left + i() * gap() + (gap() - barWidth()) / 2;
            const barH = () => (value() / maxValue()) * maxBarHeight() * animationProgress();
            const y = () => height() - padding.bottom - barH();

            return (
              <g>
                <rect
                  x={x()}
                  y={y()}
                  width={barWidth()}
                  height={barH()}
                  rx="2"
                  fill={variant() === 'gradient' ? `url(#bar-gradient-${id}-${i()})` : getBarColor(i(), item)}
                  class="chart-bar"
                >
                  <title>{`${item.label}: ${value()}`}</title>
                </rect>
                <Show when={showValues() && animationProgress() > 0.8}>
                  <text
                    x={x() + barWidth() / 2}
                    y={y() - 4}
                    class="chart-bar-value"
                    text-anchor="middle"
                  >
                    {value()}
                  </text>
                </Show>
              </g>
            );
          }}
        </For>

        {/* X-axis labels */}
        <g class="chart-axis-labels">
          <For each={local.data}>
            {(item, i) => {
              const x = () => padding.left + i() * gap() + gap() / 2;
              return (
                <text x={x()} y={height() - padding.bottom + 14} class="chart-axis-label" text-anchor="middle">
                  {item.label}
                </text>
              );
            }}
          </For>
        </g>
      </svg>
    </div>
  );
}

// =============================================================================
// DataPieChart Component
// =============================================================================

export interface DataPieChartProps {
  /** Data points to display */
  data: ChartDataPoint[];
  /** Chart size in pixels */
  size?: number;
  /** Inner radius ratio for donut chart (0-1) */
  innerRadius?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** Additional class names */
  class?: string;
  /** Title displayed above the chart */
  title?: string;
}

/**
 * DataPieChart - A pie or donut chart component.
 *
 * Features:
 * - Pie or donut style
 * - Animated slices
 * - Legend with percentages
 * - Hover effects
 */
export function DataPieChart(props: DataPieChartProps) {
  const [local] = splitProps(props, [
    'data',
    'size',
    'innerRadius',
    'showLegend',
    'animate',
    'class',
    'title',
  ]);

  const id = createUniqueId();
  const size = () => local.size ?? 200;
  const innerRadius = () => local.innerRadius ?? 0;
  const showLegend = () => local.showLegend ?? true;
  const animate = () => local.animate ?? true;

  const center = () => size() / 2;
  const outerRadius = () => (size() / 2) * 0.85;
  const innerR = () => outerRadius() * innerRadius();

  // Calculate total and percentages
  const total = createMemo(() => local.data.reduce((sum, d) => sum + d.value, 0));
  const slices = createMemo(() => {
    let startAngle = -Math.PI / 2; // Start from top
    return local.data.map((item, i) => {
      const percentage = item.value / total();
      const angle = percentage * Math.PI * 2;
      const slice = {
        ...item,
        percentage,
        startAngle,
        endAngle: startAngle + angle,
        color: item.color ?? defaultColors[i % defaultColors.length],
      };
      startAngle += angle;
      return slice;
    });
  });

  // Animation state
  const [animationProgress, setAnimationProgress] = createSignal(animate() ? 0 : 1);

  createEffect(() => {
    if (!animate()) {
      setAnimationProgress(1);
      return;
    }

    let startTime: number;
    let animationId: number;

    const animateFrame = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / 800, 1);
      // Easing
      const eased = 1 - Math.pow(1 - progress, 2);
      setAnimationProgress(eased);

      if (progress < 1) {
        animationId = requestAnimationFrame(animateFrame);
      }
    };

    animationId = requestAnimationFrame(animateFrame);
    onCleanup(() => cancelAnimationFrame(animationId));
  });

  // Generate arc path
  const createArcPath = (startAngle: number, endAngle: number) => {
    const animatedEnd = startAngle + (endAngle - startAngle) * animationProgress();
    const start = {
      x: center() + Math.cos(startAngle) * outerRadius(),
      y: center() + Math.sin(startAngle) * outerRadius(),
    };
    const end = {
      x: center() + Math.cos(animatedEnd) * outerRadius(),
      y: center() + Math.sin(animatedEnd) * outerRadius(),
    };
    const innerStart = {
      x: center() + Math.cos(animatedEnd) * innerR(),
      y: center() + Math.sin(animatedEnd) * innerR(),
    };
    const innerEnd = {
      x: center() + Math.cos(startAngle) * innerR(),
      y: center() + Math.sin(startAngle) * innerR(),
    };
    const largeArc = animatedEnd - startAngle > Math.PI ? 1 : 0;

    if (innerRadius() > 0) {
      return `
        M ${start.x} ${start.y}
        A ${outerRadius()} ${outerRadius()} 0 ${largeArc} 1 ${end.x} ${end.y}
        L ${innerStart.x} ${innerStart.y}
        A ${innerR()} ${innerR()} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}
        Z
      `;
    } else {
      return `
        M ${center()} ${center()}
        L ${start.x} ${start.y}
        A ${outerRadius()} ${outerRadius()} 0 ${largeArc} 1 ${end.x} ${end.y}
        Z
      `;
    }
  };

  return (
    <div class={cn('chart-container chart-pie-container', local.class)}>
      <Show when={local.title}>
        <div class="chart-title">{local.title}</div>
      </Show>

      <div class="chart-pie-wrapper">
        <svg
          viewBox={`0 0 ${size()} ${size()}`}
          class="chart-svg chart-pie-svg"
          style={{ width: `${size()}px`, height: `${size()}px` }}
        >
          <defs>
            <For each={slices()}>
              {(slice, i) => (
                <linearGradient id={`pie-gradient-${id}-${i()}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ 'stop-color': slice.color, 'stop-opacity': '1' }} />
                  <stop offset="100%" style={{ 'stop-color': slice.color, 'stop-opacity': '0.8' }} />
                </linearGradient>
              )}
            </For>
          </defs>

          {/* Slices */}
          <For each={slices()}>
            {(slice, i) => (
              <path
                d={createArcPath(slice.startAngle, slice.endAngle)}
                fill={`url(#pie-gradient-${id}-${i()})`}
                class="chart-pie-slice"
              >
                <title>{`${slice.label}: ${slice.value} (${Math.round(slice.percentage * 100)}%)`}</title>
              </path>
            )}
          </For>

          {/* Center label for donut */}
          <Show when={innerRadius() > 0}>
            <text x={center()} y={center()} class="chart-pie-center-label" text-anchor="middle" dominant-baseline="middle">
              {total()}
            </text>
            <text x={center()} y={center() + 12} class="chart-pie-center-sublabel" text-anchor="middle" dominant-baseline="middle">
              Total
            </text>
          </Show>
        </svg>

        {/* Legend */}
        <Show when={showLegend()}>
          <div class="chart-pie-legend">
            <For each={slices()}>
              {(slice) => (
                <div class="chart-legend-item">
                  <div class="chart-legend-color" style={{ background: slice.color }} />
                  <span class="chart-legend-label">{slice.label}</span>
                  <span class="chart-legend-value">{Math.round(slice.percentage * 100)}%</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// MonitoringChart Component - Real-time Line Chart
// =============================================================================

export interface MonitoringChartProps {
  /** Data series to display */
  series: ChartSeries[];
  /** X-axis labels */
  labels: string[];
  /** Chart height in pixels */
  height?: number;
  /** Maximum number of data points to display */
  maxPoints?: number;
  /** Callback to fetch new data point */
  onUpdate?: () => { values: number[]; label: string } | null;
  /** Update interval in milliseconds */
  updateInterval?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Additional class names */
  class?: string;
  /** Title displayed above the chart */
  title?: string;
  /** Whether real-time updates are enabled */
  realtime?: boolean;
  /** Use smooth curves instead of straight lines */
  smooth?: boolean;
  /** Fixed minimum value for y-axis (overrides computed bounds) */
  yMin?: number;
  /** Fixed maximum value for y-axis (overrides computed bounds) */
  yMax?: number;
  /** Format function for y-axis tick labels */
  formatYTick?: (value: number) => string;
  /** Format function for tooltip values */
  formatTooltipValue?: (value: number, ctx: { series: ChartSeries; seriesIndex: number; pointIndex: number }) => string;
  /** Maximum number of x-axis tick labels to render */
  maxXAxisLabels?: number;
}

/**
 * MonitoringChart - A real-time updating line chart for monitoring dashboards.
 *
 * Features:
 * - Real-time data updates
 * - Sliding window of data points
 * - Smooth animations
 * - Multiple metrics support
 */
export function MonitoringChart(props: MonitoringChartProps) {
  const [local] = splitProps(props, [
    'series',
    'labels',
    'height',
    'maxPoints',
    'onUpdate',
    'updateInterval',
    'showGrid',
    'showLegend',
    'class',
    'title',
    'realtime',
    'smooth',
    'yMin',
    'yMax',
    'formatYTick',
    'formatTooltipValue',
    'maxXAxisLabels',
  ]);

  const maxPoints = () => local.maxPoints ?? 20;
  const updateInterval = () => local.updateInterval ?? 2000;
  const realtime = () => local.realtime ?? false;
  const smooth = () => local.smooth ?? true;

  // Internal data state for real-time updates
  const [internalSeries, setInternalSeries] = createSignal<ChartSeries[]>(
    local.series.map((s) => ({ ...s, data: [...s.data] }))
  );
  const [internalLabels, setInternalLabels] = createSignal<string[]>([...local.labels]);

  // Update series when props change
  createEffect(() => {
    if (!realtime()) {
      setInternalSeries(local.series.map((s) => ({ ...s, data: [...s.data] })));
      setInternalLabels([...local.labels]);
    }
  });

  // Real-time update loop
  createEffect(() => {
    if (!realtime() || !local.onUpdate) return;

    const interval = setInterval(() => {
      const newData = local.onUpdate!();
      if (!newData) return;

      setInternalSeries((prev) =>
        prev.map((series, i) => {
          const newSeriesData = [...series.data, newData.values[i]];
          if (newSeriesData.length > maxPoints()) {
            newSeriesData.shift();
          }
          return { ...series, data: newSeriesData };
        })
      );

      setInternalLabels((prev) => {
        const newLabels = [...prev, newData.label];
        if (newLabels.length > maxPoints()) {
          newLabels.shift();
        }
        return newLabels;
      });
    }, updateInterval());

    onCleanup(() => clearInterval(interval));
  });

  return (
    <div class={cn('chart-monitoring', local.class)}>
      <div class="chart-monitoring-header">
        <Show when={local.title}>
          <div class="chart-title">{local.title}</div>
        </Show>
        <Show when={realtime()}>
          <div class="chart-monitoring-status">
            <div class="chart-monitoring-dot" />
            <span>Live</span>
          </div>
        </Show>
      </div>

      <LineChart
        series={internalSeries()}
        labels={internalLabels()}
        height={local.height}
        showGrid={local.showGrid}
        showLegend={local.showLegend}
        showPoints={false}
        showArea
        smooth={smooth()}
        animate={false}
        variant="gradient"
        yMin={local.yMin}
        yMax={local.yMax}
        formatYTick={local.formatYTick}
        formatTooltipValue={local.formatTooltipValue}
        maxXAxisLabels={local.maxXAxisLabels}
      />
    </div>
  );
}

export default {
  LineChart,
  AreaChart,
  DataBarChart,
  DataPieChart,
  MonitoringChart,
};
