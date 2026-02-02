import { Show, splitProps, createEffect, createSignal, onCleanup, For, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type ProcessingIndicatorVariant =
  | 'minimal'
  | 'pill'
  | 'card'
  | 'elegant'
  | 'aurora'
  | 'neural'
  | 'orbit'
  | 'quantum'
  | 'pulse'
  | 'atom';

export type ProcessingIndicatorStatus = 'thinking' | 'working' | 'processing' | 'loading' | 'analyzing';

export interface ProcessingIndicatorProps {
  /** Display status text */
  status?: ProcessingIndicatorStatus | string;
  /** Visual variant - each has unique built-in animations */
  variant?: ProcessingIndicatorVariant;
  /** Show elapsed time */
  showElapsed?: boolean;
  /** Start time for elapsed calculation (defaults to mount time) */
  startTime?: number;
  /** Additional descriptive text */
  description?: string;
  /** Pulse animation intensity */
  pulseIntensity?: 'subtle' | 'normal' | 'strong';
  /** Additional class names */
  class?: string;
}

const statusLabels: Record<ProcessingIndicatorStatus, string> = {
  thinking: 'Thinking',
  working: 'Working',
  processing: 'Processing',
  loading: 'Loading',
  analyzing: 'Analyzing',
};

/**
 * ProcessingIndicator - A premium status indicator with sophisticated animations.
 *
 * Features multiple visual variants:
 * - Minimal: Sleek inline bars
 * - Pill: Gradient border chip
 * - Card: Glassmorphism container
 * - Elegant: Layered orb
 * - Aurora: Flowing arc segments
 * - Neural: AI network visualization
 * - Orbit: Multi-layer orbital system
 * - Quantum: Dot grid wave
 * - Pulse: Expanding rings
 * - Atom: 3D electron orbits
 */
export function ProcessingIndicator(props: ProcessingIndicatorProps) {
  const [local, rest] = splitProps(props, [
    'status',
    'variant',
    'showElapsed',
    'startTime',
    'description',
    'pulseIntensity',
    'class',
  ]);

  const variant = () => local.variant ?? 'minimal';
  const status = () => local.status ?? 'working';

  // Elapsed time tracking
  const [elapsed, setElapsed] = createSignal(0);
  const mountTime = Date.now();

  createEffect(() => {
    if (!local.showElapsed) {
      setElapsed(0);
      return;
    }

    const startTime = local.startTime ?? mountTime;
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    onCleanup(() => clearInterval(interval));
  });

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusLabel = () => {
    const s = status();
    if (s in statusLabels) {
      return statusLabels[s as ProcessingIndicatorStatus];
    }
    return s;
  };

  const elapsedText = () => (local.showElapsed ? formatElapsed(elapsed()) : undefined);

  return (
    <div class={cn('processing-indicator', local.class)} {...rest}>
      <Show when={variant() === 'minimal'}>
        <MinimalVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'pill'}>
        <PillVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'card'}>
        <CardVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'elegant'}>
        <ElegantVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'aurora'}>
        <AuroraVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'neural'}>
        <NeuralVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'orbit'}>
        <OrbitVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'quantum'}>
        <QuantumVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'pulse'}>
        <PulseVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
      <Show when={variant() === 'atom'}>
        <AtomVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
    </div>
  );
}

interface VariantProps {
  label: string;
  description?: string;
  elapsed?: string;
}

// =============================================================================
// Animated Text Components - Minimal and Professional
// =============================================================================

/** Text with subtle shimmer effect - only used for premium variants */
function ShimmerText(props: { children: string; class?: string }) {
  return (
    <span class={cn('processing-text-shimmer', props.class)}>
      {props.children}
    </span>
  );
}

/** Text with subtle glow pulse - only used for neural variant */
function GlowText(props: { children: string; class?: string }) {
  return (
    <span class={cn('processing-text-glow', props.class)}>
      {props.children}
    </span>
  );
}

// =============================================================================
// Minimal Variant - Sleek inline with animated bar
// =============================================================================
function MinimalVariant(props: VariantProps) {
  return (
    <div class="inline-flex items-center gap-2.5">
      <div class="flex items-end gap-0.5 h-3">
        <For each={[0, 1, 2, 3]}>
          {(i) => (
            <div class="w-0.5 bg-primary rounded-full processing-bar" style={{ 'animation-delay': `${i * 100}ms` }} />
          )}
        </For>
      </div>
      <span class="text-[11px] text-muted-foreground processing-text-shimmer">
        {props.label}
        <Show when={props.elapsed}>
          <span class="ml-1.5 font-mono text-[10px] opacity-50">{props.elapsed}</span>
        </Show>
      </span>
    </div>
  );
}

// =============================================================================
// Pill Variant - Gradient border with flowing animation
// =============================================================================
function PillVariant(props: VariantProps) {
  return (
    <div class="relative inline-flex">
      <div class="absolute -inset-[1px] rounded-full processing-gradient-border overflow-hidden">
        <div
          class="absolute inset-0 processing-gradient-spin"
          style={{ background: `conic-gradient(from 0deg, var(--primary), transparent, var(--primary))` }}
        />
      </div>
      <div class="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background">
        <div class="relative w-4 h-4">
          <For each={[0, 1, 2]}>
            {(i) => (
              <div
                class="absolute w-1.5 h-1.5 rounded-full bg-primary processing-orbit-dot"
                style={{ 'animation-delay': `${i * 200}ms` }}
              />
            )}
          </For>
        </div>
        <ShimmerText class="text-[11px] font-medium">{props.label}</ShimmerText>
        <Show when={props.elapsed}>
          <span class="text-[10px] font-mono text-muted-foreground">{props.elapsed}</span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Card Variant - Glassmorphism with shimmer
// =============================================================================
function CardVariant(props: VariantProps) {
  const id = createUniqueId();

  return (
    <div class="relative rounded-xl overflow-hidden">
      <div class="absolute inset-0 rounded-xl processing-card-border" />
      <div class="relative m-[1px] rounded-[11px] bg-card/95 backdrop-blur-sm px-4 py-3">
        <div class="absolute inset-0 processing-shimmer-sweep" />
        <div class="relative flex items-center gap-3">
          <div class="relative w-11 h-11">
            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 44 44" shape-rendering="geometricPrecision">
              <defs>
                <radialGradient id={`orb-${id}`} cx="30%" cy="30%">
                  <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.35' }} />
                  <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.04' }} />
                </radialGradient>
              </defs>
              <circle cx="22" cy="22" r="16" fill={`url(#orb-${id})`} class="processing-breathe" />
              {/* Crisp ring + arcs (no blurry glow) */}
              <circle cx="22" cy="22" r="16" fill="none" stroke="var(--primary)" stroke-opacity="0.12" stroke-width="1.5" />
              <path d="M 22 6 A 16 16 0 0 1 38 22" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-opacity="0.85" class="processing-arc-spin" />
              <path d="M 22 38 A 16 16 0 0 1 6 22" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-opacity="0.35" class="processing-arc-spin" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <svg class="w-4 h-4 text-primary processing-icon-morph" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M5.6 5.6L8.5 8.5M15.5 15.5L18.4 18.4M5.6 18.4L8.5 15.5M15.5 8.5L18.4 5.6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity="0.5" />
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <GlowText class="text-xs font-semibold">{props.label}</GlowText>
              <WaveformDots size="sm" />
            </div>
            <Show when={props.description || props.elapsed}>
              <p class="text-[10px] text-muted-foreground mt-0.5 truncate">
                {props.description}
                <Show when={props.description && props.elapsed}> · </Show>
                <Show when={props.elapsed}><span class="font-mono">{props.elapsed}</span></Show>
              </p>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Elegant Variant - Sophisticated layered orb
// =============================================================================
function ElegantVariant(props: VariantProps) {
  const id = createUniqueId();

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-8 h-8">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 32 32">
          <defs>
            <linearGradient id={`elegant-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '1' }}>
                <animate attributeName="stop-opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
              </stop>
              <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.3' }}>
                <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
              </stop>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="none" stroke={`url(#elegant-grad-${id})`} stroke-width="1.5" stroke-dasharray="22 66" class="processing-ring-spin" />
          <circle cx="16" cy="16" r="8" fill="var(--primary)" fill-opacity="0.15" class="processing-morph-circle" />
          <circle cx="16" cy="16" r="3" fill="var(--primary)" class="processing-breathe" />
        </svg>
        <For each={[0, 1, 2]}>
          {(i) => (
            <div class="absolute w-1 h-1 rounded-full bg-primary processing-particle" style={{ 'animation-delay': `${i * 400}ms`, '--particle-index': i }} />
          )}
        </For>
      </div>
      <div class="flex flex-col">
        <div class="flex items-baseline gap-2">
          <ShimmerText class="text-xs font-medium tracking-wide">{props.label}</ShimmerText>
          <Show when={props.elapsed}>
            <span class="text-[10px] font-mono text-muted-foreground">{props.elapsed}</span>
          </Show>
        </div>
        <Show when={props.description}>
          <span class="text-[10px] text-muted-foreground/70 mt-0.5">{props.description}</span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Aurora Variant - Clean rotating arc segments
// =============================================================================
function AuroraVariant(props: VariantProps) {
  const id = createUniqueId();

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          <defs>
            <radialGradient id={`aurora-center-${id}`} cx="30%" cy="30%">
              <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '1' }} />
              <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.6' }} />
            </radialGradient>
          </defs>
          {/* Outer arc - slow rotation */}
          <circle
            cx="20" cy="20" r="18"
            fill="none"
            stroke="var(--primary)"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-dasharray="28 85"
            class="processing-aurora-arc-1"
          />
          {/* Middle arc - medium rotation, opposite direction */}
          <circle
            cx="20" cy="20" r="13"
            fill="none"
            stroke="var(--primary)"
            stroke-width="2.5"
            stroke-opacity="0.6"
            stroke-linecap="round"
            stroke-dasharray="20 62"
            class="processing-aurora-arc-2"
          />
          {/* Inner arc - fast rotation */}
          <circle
            cx="20" cy="20" r="8"
            fill="none"
            stroke="var(--primary)"
            stroke-width="2"
            stroke-opacity="0.3"
            stroke-linecap="round"
            stroke-dasharray="12 38"
            class="processing-aurora-arc-3"
          />
          {/* Center dot with breathing effect */}
          <circle
            cx="20"
            cy="20"
            r="3"
            fill={`url(#aurora-center-${id})`}
            class="processing-aurora-center"
          />
        </svg>
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-foreground">{props.label}</span>
          <FlowingDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground mt-0.5">
            {props.description}
            <Show when={props.description && props.elapsed}> · </Show>
            <Show when={props.elapsed}><span class="font-mono">{props.elapsed}</span></Show>
          </span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Neural Variant - AI neural network inspired
// =============================================================================
function NeuralVariant(props: VariantProps) {
  const id = createUniqueId();

  // 基础节点位置
  const baseNodes = [
    { x: 20, y: 8 },   // 0: top
    { x: 8, y: 20 },   // 1: left
    { x: 32, y: 20 },  // 2: right
    { x: 14, y: 32 },  // 3: bottom-left
    { x: 26, y: 32 },  // 4: bottom-right
    { x: 20, y: 20 },  // 5: center
  ];

  // 每个节点的动画参数（振幅、频率、相位）
  const nodeAnimParams = [
    { ax: 2, ay: 1.5, fx: 1.2, fy: 0.8, px: 0, py: 0.5 },
    { ax: 1.5, ay: 2, fx: 0.9, fy: 1.1, px: 1, py: 0.3 },
    { ax: 1.5, ay: 2, fx: 0.9, fy: 1.1, px: 2, py: 0.7 },
    { ax: 2, ay: 1.5, fx: 1.1, fy: 0.9, px: 0.5, py: 1.2 },
    { ax: 2, ay: 1.5, fx: 1.1, fy: 0.9, px: 1.5, py: 0.8 },
    { ax: 0, ay: 0, fx: 0, fy: 0, px: 0, py: 0 }, // 中心点不动
  ];

  // 使用 signal 存储动态节点位置
  const [nodePositions, setNodePositions] = createSignal(baseNodes.map(n => ({ x: n.x, y: n.y })));

  // 动画循环
  createEffect(() => {
    let animationId: number;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000; // 转换为秒

      setNodePositions(
        baseNodes.map((base, i) => {
          const params = nodeAnimParams[i];
          return {
            x: base.x + Math.sin(elapsed * params.fx + params.px) * params.ax,
            y: base.y + Math.sin(elapsed * params.fy + params.py) * params.ay,
          };
        })
      );

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    onCleanup(() => cancelAnimationFrame(animationId));
  });

  // 连接关系
  const connections = [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [0, 1], [0, 2], [1, 3], [2, 4], [3, 4]];

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          <defs>
            <filter id={`neural-glow-${id}`}>
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* 连线 - 跟随节点位置 */}
          <g stroke="var(--primary)" stroke-opacity="0.3" fill="none">
            <For each={connections}>
              {([from, to]) => (
                <line
                  x1={nodePositions()[from].x}
                  y1={nodePositions()[from].y}
                  x2={nodePositions()[to].x}
                  y2={nodePositions()[to].y}
                  stroke-width="1"
                />
              )}
            </For>
          </g>
          {/* 流动粒子 */}
          <g filter={`url(#neural-glow-${id})`}>
            <For each={[0, 1, 2, 3, 4]}>
              {(i) => (
                <circle r="1.5" fill="var(--primary)" class="processing-neural-pulse">
                  <animateMotion
                    dur="1.5s"
                    repeatCount="indefinite"
                    begin={`${i * 0.3}s`}
                    path={`M${baseNodes[i].x},${baseNodes[i].y} L${baseNodes[5].x},${baseNodes[5].y}`}
                  />
                </circle>
              )}
            </For>
          </g>
          {/* 节点 - 动态位置 */}
          <g filter={`url(#neural-glow-${id})`}>
            <For each={nodePositions()}>
              {(node, i) => (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={i() === 5 ? 4 : 2.5}
                  fill="var(--primary)"
                  fill-opacity={i() === 5 ? 1 : 0.7}
                />
              )}
            </For>
          </g>
        </svg>
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <GlowText class="text-xs font-medium">{props.label}</GlowText>
          <NeuralDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground mt-0.5">
            {props.description}
            <Show when={props.description && props.elapsed}> · </Show>
            <Show when={props.elapsed}><span class="font-mono">{props.elapsed}</span></Show>
          </span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Orbit Variant - Multi-layer planetary orbit system
// =============================================================================
function OrbitVariant(props: VariantProps) {
  const id = createUniqueId();

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-12 h-12">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 48 48">
          <defs>
            <radialGradient id={`orbit-center-${id}`}>
              <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '1' }} />
              <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.4' }} />
            </radialGradient>
            <filter id={`orbit-blur-${id}`}><feGaussianBlur stdDeviation="0.5" /></filter>
          </defs>
          <circle cx="24" cy="24" r="10" fill="none" stroke="var(--primary)" stroke-opacity="0.1" stroke-width="1" />
          <circle cx="24" cy="24" r="16" fill="none" stroke="var(--primary)" stroke-opacity="0.08" stroke-width="1" />
          <circle cx="24" cy="24" r="22" fill="none" stroke="var(--primary)" stroke-opacity="0.05" stroke-width="1" />
          <circle cx="24" cy="24" r="5" fill={`url(#orbit-center-${id})`} class="processing-breathe" />
          <circle cx="24" cy="24" r="3" fill="var(--primary)" />
          <g filter={`url(#orbit-blur-${id})`}>
            <circle r="2" fill="var(--primary)"><animateMotion dur="2s" repeatCount="indefinite" path="M24,14 A10,10 0 1,1 23.99,14" /></circle>
            <circle r="1.5" fill="var(--primary)" fill-opacity="0.8"><animateMotion dur="3s" repeatCount="indefinite" path="M24,8 A16,16 0 1,1 23.99,8" begin="0.5s" /></circle>
            <circle r="1.5" fill="var(--primary)" fill-opacity="0.6"><animateMotion dur="3s" repeatCount="indefinite" path="M24,8 A16,16 0 1,1 23.99,8" begin="2s" /></circle>
            <circle r="1" fill="var(--primary)" fill-opacity="0.5"><animateMotion dur="4s" repeatCount="indefinite" path="M24,2 A22,22 0 1,1 23.99,2" begin="1s" /></circle>
          </g>
          <For each={[0, 60, 120, 180, 240, 300]}>
            {(angle) => (
              <line x1="24" y1="24" x2={24 + 20 * Math.cos((angle * Math.PI) / 180)} y2={24 + 20 * Math.sin((angle * Math.PI) / 180)} stroke="var(--primary)" stroke-opacity="0.1" stroke-width="0.5" class="processing-ray" style={{ 'animation-delay': `${angle * 5}ms` }} />
            )}
          </For>
        </svg>
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <ShimmerText class="text-xs font-medium">{props.label}</ShimmerText>
          <OrbitDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground mt-0.5">
            {props.description}
            <Show when={props.description && props.elapsed}> · </Show>
            <Show when={props.elapsed}><span class="font-mono">{props.elapsed}</span></Show>
          </span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Quantum Variant - Compact 3x3 square grid with wave animation
// =============================================================================
function QuantumVariant(props: VariantProps) {
  // 3x3 grid of squares - more compact layout
  const squareSize = 5;
  const gap = 2;
  const startOffset = 20 - (squareSize * 1.5 + gap); // Center the grid

  const squares = [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
  ];

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          <For each={squares}>
            {(sq, i) => (
              <rect
                x={startOffset + sq.col * (squareSize + gap)}
                y={startOffset + sq.row * (squareSize + gap)}
                width={squareSize}
                height={squareSize}
                rx="1"
                fill="var(--primary)"
                class="processing-quantum-dot-wave"
                style={{ 'animation-delay': `${i() * 80}ms` }}
              />
            )}
          </For>
        </svg>
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-foreground">{props.label}</span>
          <SequentialDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground mt-0.5">
            {props.description}
            <Show when={props.description && props.elapsed}> · </Show>
            <Show when={props.elapsed}><span class="font-mono">{props.elapsed}</span></Show>
          </span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Pulse Variant - Simple expanding concentric circles
// =============================================================================
function PulseVariant(props: VariantProps) {
  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          {/* Expanding rings */}
          <For each={[0, 1, 2]}>
            {(i) => (
              <circle
                cx="20" cy="20" r="5"
                fill="none"
                stroke="var(--primary)"
                stroke-width="1.5"
                class="processing-pulse-ring"
                style={{ 'animation-delay': `${i * 500}ms` }}
              />
            )}
          </For>
          {/* Static outer ring */}
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="var(--primary)"
            stroke-width="1"
            stroke-opacity="0.15"
          />
          {/* Center dot with pulse */}
          <circle cx="20" cy="20" r="4" fill="var(--primary)" class="processing-pulse-center" />
        </svg>
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-foreground">{props.label}</span>
          <SequentialDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground mt-0.5">
            {props.description}
            <Show when={props.description && props.elapsed}> · </Show>
            <Show when={props.elapsed}><span class="font-mono">{props.elapsed}</span></Show>
          </span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Atom Variant - 3D electron orbits around nucleus
// =============================================================================
function AtomVariant(props: VariantProps) {
  const id = createUniqueId();

  // 定义三个轨道平面，每个有不同的旋转角度来创造3D效果
  // rx/ry 的比例模拟轨道倾斜，rotateZ 控制轨道在平面上的旋转方向
  const orbits = [
    { rx: 16, ry: 6, rotateZ: 0, speed: 2 },     // 水平轨道
    { rx: 14, ry: 5, rotateZ: 60, speed: 2.5 },  // 60度旋转
    { rx: 14, ry: 5, rotateZ: 120, speed: 3 },   // 120度旋转
  ];

  // 电子位置状态
  const [electronAngles, setElectronAngles] = createSignal(
    orbits.map(() => Math.random() * Math.PI * 2) // 随机初始角度
  );

  // 动画循环
  createEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setElectronAngles((prev) =>
        prev.map((angle, i) => angle + deltaTime * orbits[i].speed)
      );

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    onCleanup(() => cancelAnimationFrame(animationId));
  });

  // 计算电子在椭圆轨道上的位置
  const getElectronPosition = (orbitIndex: number, angle: number) => {
    const orbit = orbits[orbitIndex];

    // 在椭圆轨道上的位置
    const x2d = Math.cos(angle) * orbit.rx;
    const y2d = Math.sin(angle) * orbit.ry;

    // 应用 rotateZ 变换（与轨道椭圆的旋转一致）
    const rotateZRad = (orbit.rotateZ * Math.PI) / 180;
    const finalX = x2d * Math.cos(rotateZRad) - y2d * Math.sin(rotateZRad);
    const finalY = x2d * Math.sin(rotateZRad) + y2d * Math.cos(rotateZRad);

    // z 深度基于椭圆上的 y 位置（y2d > 0 表示在前面）
    return { x: finalX + 20, y: finalY + 20, z: y2d };
  };

  // 获取所有电子及其深度信息
  const getElectronsWithDepth = () => {
    const electrons: { x: number; y: number; z: number; orbitIndex: number }[] = [];
    electronAngles().forEach((angle, orbitIndex) => {
      const pos = getElectronPosition(orbitIndex, angle);
      electrons.push({ ...pos, orbitIndex });
    });
    // 按z排序，z小的（后面）先绘制
    return electrons.sort((a, b) => a.z - b.z);
  };

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          <defs>
            <filter id={`atom-glow-${id}`}>
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id={`nucleus-grad-${id}`} cx="35%" cy="35%">
              <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '1' }} />
              <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.6' }} />
            </radialGradient>
          </defs>

          {/* 轨道环 */}
          <g opacity="0.2">
            <For each={orbits}>
              {(orbit) => (
                <ellipse
                  cx="20"
                  cy="20"
                  rx={orbit.rx}
                  ry={orbit.ry}
                  fill="none"
                  stroke="var(--primary)"
                  stroke-width="0.5"
                  transform={`rotate(${orbit.rotateZ} 20 20)`}
                />
              )}
            </For>
          </g>

          {/* 后面的电子（z < 0） */}
          <For each={getElectronsWithDepth().filter((e) => e.z < 0)}>
            {(electron) => (
              <circle
                cx={electron.x}
                cy={electron.y}
                r={2}
                fill="var(--primary)"
                opacity={0.5}
              />
            )}
          </For>

          {/* 原子核 */}
          <g filter={`url(#atom-glow-${id})`}>
            <circle cx="20" cy="20" r="4" fill={`url(#nucleus-grad-${id})`} />
            {/* 核内质子/中子效果 */}
            <circle cx="19" cy="19" r="1.2" fill="var(--primary)" opacity="0.8" />
            <circle cx="21" cy="20.5" r="1" fill="var(--primary)" opacity="0.6" />
            <circle cx="19.5" cy="21" r="0.8" fill="var(--primary)" opacity="0.5" />
          </g>

          {/* 前面的电子（z >= 0） */}
          <g filter={`url(#atom-glow-${id})`}>
            <For each={getElectronsWithDepth().filter((e) => e.z >= 0)}>
              {(electron) => (
                <circle
                  cx={electron.x}
                  cy={electron.y}
                  r={2}
                  fill="var(--primary)"
                  opacity={1}
                />
              )}
            </For>
          </g>
        </svg>
      </div>
      <div class="flex flex-col">
        <div class="flex items-center gap-2">
          <GlowText class="text-xs font-medium">{props.label}</GlowText>
          <OrbitDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground mt-0.5">
            {props.description}
            <Show when={props.description && props.elapsed}> · </Show>
            <Show when={props.elapsed}>
              <span class="font-mono">{props.elapsed}</span>
            </Show>
          </span>
        </Show>
      </div>
    </div>
  );
}

// =============================================================================
// Animated Dot Components - Clean and Minimal
// =============================================================================

/** Waveform bars - vertical bars with staggered animation */
function WaveformDots(props: { size?: 'sm' | 'md' }) {
  const h = () => (props.size === 'sm' ? 'h-2' : 'h-3');
  return (
    <div class={cn('flex items-end gap-0.5', h())}>
      <For each={[0, 1, 2, 3, 4]}>{(i) => <div class="w-0.5 bg-primary/60 rounded-full processing-waveform" style={{ 'animation-delay': `${i * 80}ms` }} />}</For>
    </div>
  );
}

/** Flowing dots - horizontal dots with flow animation */
function FlowingDots() {
  return (
    <div class="flex items-center gap-1">
      <For each={[0, 1, 2]}>{(i) => <div class="w-1 h-1 rounded-full bg-primary processing-flow-dot" style={{ 'animation-delay': `${i * 200}ms` }} />}</For>
    </div>
  );
}

/** Neural dots - small dots with neural pulse */
function NeuralDots() {
  return (
    <div class="flex items-center gap-0.5">
      <For each={[0, 1, 2, 3]}>{(i) => <div class="w-1 h-1 rounded-full bg-primary processing-neural-dot" style={{ 'animation-delay': `${i * 150}ms` }} />}</For>
    </div>
  );
}

/** Orbit dots - dots orbiting a center */
function OrbitDots() {
  return (
    <div class="relative w-4 h-4">
      <div class="absolute inset-0 flex items-center justify-center"><div class="w-1 h-1 rounded-full bg-primary" /></div>
      <For each={[0, 1, 2]}>{(i) => <div class="absolute w-0.5 h-0.5 rounded-full bg-primary/70 processing-micro-orbit" style={{ 'animation-delay': `${i * 300}ms`, '--orbit-index': i }} />}</For>
    </div>
  );
}

/** Sequential dots - simple three-dot sequence animation */
function SequentialDots() {
  return (
    <div class="flex items-center gap-1">
      <For each={[0, 1, 2]}>{(i) => <div class="w-1 h-1 rounded-full bg-primary processing-sequential-dot" style={{ 'animation-delay': `${i * 200}ms` }} />}</For>
    </div>
  );
}

export default ProcessingIndicator;
