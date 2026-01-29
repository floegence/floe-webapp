import { type JSX, Show, splitProps, createEffect, createSignal, onCleanup, For, createUniqueId } from 'solid-js';
import { cn } from '../../utils/cn';

export type ProcessingIndicatorVariant =
  | 'default'
  | 'minimal'
  | 'pill'
  | 'card'
  | 'elegant'
  | 'aurora'
  | 'neural'
  | 'orbit'
  | 'quantum'
  | 'pulse';

export type ProcessingIndicatorStatus = 'thinking' | 'working' | 'processing' | 'loading' | 'analyzing';

export interface ProcessingIndicatorProps {
  /** Display status text */
  status?: ProcessingIndicatorStatus | string;
  /** Visual variant */
  variant?: ProcessingIndicatorVariant;
  /** Custom icon */
  icon?: JSX.Element;
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
 * Features multiple elegant visual variants with advanced animations:
 * - Aurora: Flowing gradient aurora effect
 * - Neural: AI-inspired neural network particles
 * - Hologram: Futuristic holographic with scan lines
 * - Quantum: Particle wave quantum visualization
 * - Prism: Rainbow light refraction effect
 * - DNA: Double helix animation
 * - Constellation: Star particles with connections
 *
 * All variants feature animated text with light sweep effects.
 */
export function ProcessingIndicator(props: ProcessingIndicatorProps) {
  const [local, rest] = splitProps(props, [
    'status',
    'variant',
    'icon',
    'showElapsed',
    'startTime',
    'description',
    'pulseIntensity',
    'class',
  ]);

  const variant = () => local.variant ?? 'default';
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
      <Show when={variant() === 'default'}>
        <DefaultVariant label={getStatusLabel()} description={local.description} elapsed={elapsedText()} />
      </Show>
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
// Default Variant - Animated rings with breathing icon
// =============================================================================
function DefaultVariant(props: VariantProps) {
  const id = createUniqueId();

  return (
    <div class="flex items-center gap-3">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          <defs>
            <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '1' }} />
              <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.3' }} />
            </linearGradient>
          </defs>
          <circle
            cx="20" cy="20" r="18"
            fill="none" stroke={`url(#grad-${id})`}
            stroke-width="2" stroke-linecap="round"
            stroke-dasharray="28 85"
            class="processing-ring-spin"
          />
          <circle
            cx="20" cy="20" r="12"
            fill="none" stroke="var(--primary)"
            stroke-width="1.5" stroke-opacity="0.3"
            stroke-dasharray="19 57"
            class="processing-ring-spin-reverse"
          />
        </svg>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center processing-breathe">
            <svg class="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v3m0 12v3M3 12h3m12 0h3" stroke-linecap="round" class="processing-sparkle" />
              <circle cx="12" cy="12" r="4" class="processing-sparkle-delayed" />
            </svg>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-0.5">
        <div class="flex items-center gap-2">
          <ShimmerText class="text-xs font-medium">{props.label}</ShimmerText>
          <WaveformDots />
        </div>
        <Show when={props.description || props.elapsed}>
          <span class="text-[10px] text-muted-foreground">
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
            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 44 44">
              <defs>
                <radialGradient id={`orb-${id}`} cx="30%" cy="30%">
                  <stop offset="0%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.6' }} />
                  <stop offset="100%" style={{ 'stop-color': 'var(--primary)', 'stop-opacity': '0.1' }} />
                </radialGradient>
                <filter id={`glow-${id}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <circle cx="22" cy="22" r="16" fill={`url(#orb-${id})`} class="processing-breathe" />
              <g filter={`url(#glow-${id})`}>
                <path d="M 22 6 A 16 16 0 0 1 38 22" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" class="processing-arc-spin" />
                <path d="M 22 38 A 16 16 0 0 1 6 22" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-opacity="0.5" class="processing-arc-spin" />
              </g>
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
  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          {/* Outer arc - slow rotation */}
          <circle
            cx="20" cy="20" r="18"
            fill="none"
            stroke="var(--primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-dasharray="28 85"
            class="processing-aurora-arc-1"
          />
          {/* Middle arc - medium rotation, opposite direction */}
          <circle
            cx="20" cy="20" r="13"
            fill="none"
            stroke="var(--primary)"
            stroke-width="1.5"
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
            stroke-width="1.5"
            stroke-opacity="0.3"
            stroke-linecap="round"
            stroke-dasharray="12 38"
            class="processing-aurora-arc-3"
          />
          {/* Center dot */}
          <circle cx="20" cy="20" r="2" fill="var(--primary)" />
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
  const nodes = [
    { x: 20, y: 8 }, { x: 8, y: 20 }, { x: 32, y: 20 },
    { x: 14, y: 32 }, { x: 26, y: 32 }, { x: 20, y: 20 },
  ];

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
          <g stroke="var(--primary)" stroke-opacity="0.3" fill="none">
            <For each={[[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [0, 1], [0, 2], [1, 3], [2, 4], [3, 4]]}>
              {([from, to], i) => (
                <line x1={nodes[from].x} y1={nodes[from].y} x2={nodes[to].x} y2={nodes[to].y} stroke-width="1" class="processing-neural-line" style={{ 'animation-delay': `${i() * 100}ms` }} />
              )}
            </For>
          </g>
          <g filter={`url(#neural-glow-${id})`}>
            <For each={[0, 1, 2, 3, 4]}>
              {(i) => (
                <circle r="1.5" fill="var(--primary)" class="processing-neural-pulse" style={{ '--pulse-index': i }}>
                  <animateMotion dur="1.5s" repeatCount="indefinite" begin={`${i * 0.3}s`} path={`M${nodes[i].x},${nodes[i].y} L${nodes[5].x},${nodes[5].y}`} />
                </circle>
              )}
            </For>
          </g>
          <g filter={`url(#neural-glow-${id})`}>
            <For each={nodes}>
              {(node, i) => (
                <circle cx={node.x} cy={node.y} r={i() === 5 ? 4 : 2.5} fill="var(--primary)" fill-opacity={i() === 5 ? 1 : 0.7} class="processing-neural-node" style={{ 'animation-delay': `${i() * 150}ms` }} />
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
// Quantum Variant - Clean dot grid with wave animation
// =============================================================================
function QuantumVariant(props: VariantProps) {
  // 3x3 grid of dots
  const dots = [
    { x: 10, y: 10 }, { x: 20, y: 10 }, { x: 30, y: 10 },
    { x: 10, y: 20 }, { x: 20, y: 20 }, { x: 30, y: 20 },
    { x: 10, y: 30 }, { x: 20, y: 30 }, { x: 30, y: 30 },
  ];

  return (
    <div class="flex items-center gap-4">
      <div class="relative w-10 h-10">
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 40 40">
          <For each={dots}>
            {(dot, i) => (
              <circle
                cx={dot.x}
                cy={dot.y}
                r="2.5"
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
