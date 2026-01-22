import { splitProps, type JSX, createSignal, onCleanup } from 'solid-js';
import { cn } from '../../utils/cn';

export type CardVariant = 'default' | 'hover-lift' | 'gradient-border' | 'glass' | 'spotlight' | 'shimmer' | 'glow';

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Enable 3D perspective tilt on hover (works best with hover-lift and spotlight variants) */
  enableTilt?: boolean;
  /** Custom gradient colors for gradient-border variant */
  gradientColors?: string;
  /** Glow color for glow variant */
  glowColor?: string;
}

/**
 * Base Card component
 */
export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, [
    'variant',
    'enableTilt',
    'gradientColors',
    'glowColor',
    'class',
    'children',
    'style',
  ]);

  const variant = () => local.variant ?? 'default';

  // 3D tilt effect state
  const [tiltStyle, setTiltStyle] = createSignal<JSX.CSSProperties>({});
  let cardRef: HTMLDivElement | undefined;

  let rafId: number | null = null;
  let pendingClientX = 0;
  let pendingClientY = 0;

  const flushMouseMove = () => {
    rafId = null;
    if (!cardRef) return;
    if (!local.enableTilt && variant() !== 'spotlight') return;

    const rect = cardRef.getBoundingClientRect();
    const x = pendingClientX - rect.left;
    const y = pendingClientY - rect.top;

    if (local.enableTilt) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      setTiltStyle({
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      });
    }

    if (variant() === 'spotlight') {
      setSpotlightPos({ x, y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef) return;
    if (!local.enableTilt && variant() !== 'spotlight') return;
    pendingClientX = e.clientX;
    pendingClientY = e.clientY;

    // RAF throttle for performance (mousemove can fire at a much higher rate than 60fps).
    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      flushMouseMove();
      return;
    }
    rafId = requestAnimationFrame(flushMouseMove);
  };

  const handleMouseLeave = () => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (!local.enableTilt) return;
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  };

  // Spotlight tracking for spotlight variant
  const [spotlightPos, setSpotlightPos] = createSignal({ x: 0, y: 0 });

  onCleanup(() => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  const baseStyles = 'rounded-lg transition-all duration-300 ease-out';

  const variantStyles: Record<CardVariant, string> = {
    default: 'bg-card border border-border shadow-sm hover:shadow-md',
    'hover-lift': 'bg-card border border-border shadow-sm hover:shadow-xl hover:-translate-y-1',
    'gradient-border': 'relative bg-card overflow-hidden',
    glass: 'backdrop-blur-xl bg-card/30 border border-white/10 shadow-lg',
    spotlight: 'relative bg-card border border-border overflow-hidden',
    shimmer: 'relative bg-card border border-border overflow-hidden',
    glow: 'bg-card border border-border shadow-sm',
  };

  const gradientBorderContent = () => {
    if (variant() !== 'gradient-border') return null;
    const colors = local.gradientColors ?? 'from-primary via-accent to-secondary';
    return (
      <>
        {/* Animated gradient border */}
        <div
          class={cn(
            'absolute inset-0 bg-gradient-to-r opacity-75',
            colors,
            'animate-[gradient-rotate_3s_linear_infinite]'
          )}
          style={{
            'background-size': '200% 200%',
            animation: 'gradient-shift 3s ease infinite',
          }}
        />
        {/* Inner card content with background */}
        <div class="absolute inset-[1px] rounded-[7px] bg-card" />
      </>
    );
  };

  const spotlightContent = () => {
    if (variant() !== 'spotlight') return null;
    return (
      <div
        class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${spotlightPos().x}px ${spotlightPos().y}px, rgba(var(--primary-rgb, 99, 102, 241), 0.15), transparent 40%)`,
        }}
      />
    );
  };

  const shimmerContent = () => {
    if (variant() !== 'shimmer') return null;
    return (
      <div
        class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    );
  };

  const glowStyles = (): JSX.CSSProperties => {
    if (variant() !== 'glow') return {};
    const color = local.glowColor ?? 'var(--primary)';
    return {
      'box-shadow': `0 0 0 1px ${color}, 0 0 20px -5px ${color}, 0 0 40px -10px ${color}`,
    };
  };

  return (
    <div
      ref={cardRef}
      class={cn(
        baseStyles,
        variantStyles[variant()],
        variant() === 'spotlight' && 'group',
        local.class
      )}
      style={{
        ...(typeof local.style === 'object' ? local.style : {}),
        ...tiltStyle(),
        ...glowStyles(),
        'transform-style': 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      {gradientBorderContent()}
      {spotlightContent()}
      {shimmerContent()}
      <div class={cn('relative z-10', variant() === 'gradient-border' && 'relative')}>
        {local.children}
      </div>
    </div>
  );
}

/**
 * Card header component
 */
export type CardHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export function CardHeader(props: CardHeaderProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('flex flex-col space-y-1.5 p-4', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

/**
 * Card title component
 */
export type CardTitleProps = JSX.HTMLAttributes<HTMLHeadingElement>;

export function CardTitle(props: CardTitleProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <h3 class={cn('text-sm font-semibold leading-none tracking-tight', local.class)} {...rest}>
      {local.children}
    </h3>
  );
}

/**
 * Card description component
 */
export type CardDescriptionProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export function CardDescription(props: CardDescriptionProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <p class={cn('text-xs text-muted-foreground', local.class)} {...rest}>
      {local.children}
    </p>
  );
}

/**
 * Card content component
 */
export type CardContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export function CardContent(props: CardContentProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('p-4 pt-0', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

/**
 * Card footer component
 */
export type CardFooterProps = JSX.HTMLAttributes<HTMLDivElement>;

export function CardFooter(props: CardFooterProps) {
  const [local, rest] = splitProps(props, ['class', 'children']);
  return (
    <div class={cn('flex items-center p-4 pt-0', local.class)} {...rest}>
      {local.children}
    </div>
  );
}

/**
 * Interactive 3D Card with mouse tracking
 */
export interface Interactive3DCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Intensity of the 3D effect (1-20, default 10) */
  intensity?: number;
  /** Enable shine effect */
  shine?: boolean;
  /** Border glow on hover */
  borderGlow?: boolean;
}

export function Interactive3DCard(props: Interactive3DCardProps) {
  const [local, rest] = splitProps(props, [
    'intensity',
    'shine',
    'borderGlow',
    'class',
    'children',
    'style',
  ]);

  const [transform, setTransform] = createSignal('');
  const [shinePos, setShinePos] = createSignal({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = createSignal(false);
  let cardRef: HTMLDivElement | undefined;
  let rafId: number | null = null;
  let pendingClientX = 0;
  let pendingClientY = 0;

  const intensity = () => local.intensity ?? 10;

  const flushMouseMove = () => {
    rafId = null;
    if (!cardRef) return;

    const rect = cardRef.getBoundingClientRect();
    const x = pendingClientX - rect.left;
    const y = pendingClientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * intensity();
    const rotateY = ((centerX - x) / centerX) * intensity();

    setTransform(`perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`);

    if (local.shine) {
      setShinePos({
        x: (x / rect.width) * 100,
        y: (y / rect.height) * 100,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef) return;
    pendingClientX = e.clientX;
    pendingClientY = e.clientY;

    if (rafId !== null) return;
    if (typeof requestAnimationFrame === 'undefined') {
      flushMouseMove();
      return;
    }
    rafId = requestAnimationFrame(flushMouseMove);
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    setIsHovered(false);
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  };

  onCleanup(() => {
    if (rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  return (
    <div
      ref={cardRef}
      class={cn(
        'relative rounded-xl bg-card border border-border overflow-hidden',
        'transition-all duration-200 ease-out',
        local.borderGlow && isHovered() && 'shadow-[0_0_30px_-5px_var(--primary)]',
        local.class
      )}
      style={{
        ...(typeof local.style === 'object' ? local.style : {}),
        transform: transform(),
        'transform-style': 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      {/* Shine overlay */}
      {local.shine && (
        <div
          class="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300"
          classList={{ 'opacity-100': isHovered() }}
          style={{
            background: `radial-gradient(circle at ${shinePos().x}% ${shinePos().y}%, rgba(255,255,255,0.2) 0%, transparent 50%)`,
          }}
        />
      )}
      <div class="relative z-10" style={{ transform: 'translateZ(20px)' }}>
        {local.children}
      </div>
    </div>
  );
}

/**
 * Animated Border Card with rotating gradient
 */
export interface AnimatedBorderCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Animation duration in seconds */
  duration?: number;
  /** Border width in pixels */
  borderWidth?: number;
  /** Gradient colors (Tailwind classes) */
  colors?: string;
}

export function AnimatedBorderCard(props: AnimatedBorderCardProps) {
  const [local, rest] = splitProps(props, [
    'duration',
    'borderWidth',
    'colors',
    'class',
    'children',
    'style',
  ]);

  const duration = () => local.duration ?? 3;
  const borderWidth = () => local.borderWidth ?? 2;

  return (
    <div
      class={cn('relative rounded-xl p-[2px] overflow-hidden', local.class)}
      style={{
        ...(typeof local.style === 'object' ? local.style : {}),
        padding: `${borderWidth()}px`,
      }}
      {...rest}
    >
      {/* Animated gradient background */}
      <div
        class="absolute inset-0"
        style={{
          background: 'conic-gradient(from 0deg, var(--primary), var(--accent), var(--secondary), var(--primary))',
          animation: `spin ${duration()}s linear infinite`,
        }}
      />
      {/* Inner content */}
      <div class="relative rounded-[10px] bg-card h-full">
        {local.children}
      </div>
    </div>
  );
}

/**
 * Neon Glow Card
 */
export interface NeonCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Neon color (CSS color value) */
  color?: string;
  /** Pulse animation */
  pulse?: boolean;
}

export function NeonCard(props: NeonCardProps) {
  const [local, rest] = splitProps(props, ['color', 'pulse', 'class', 'children', 'style']);

  const color = () => local.color ?? 'var(--primary)';

  return (
    <div
      class={cn(
        'relative rounded-xl bg-card border-2 transition-shadow duration-300',
        local.pulse && 'animate-pulse',
        local.class
      )}
      style={{
        ...(typeof local.style === 'object' ? local.style : {}),
        'border-color': color(),
        'box-shadow': `0 0 5px ${color()}, 0 0 20px ${color()}, 0 0 40px ${color()}, inset 0 0 20px ${color()}20`,
      }}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/**
 * Morphing Card with blob-like background
 */
export type MorphCardProps = JSX.HTMLAttributes<HTMLDivElement>;

export function MorphCard(props: MorphCardProps) {
  const [local, rest] = splitProps(props, ['class', 'children', 'style']);

  return (
    <div
      class={cn(
        'relative rounded-2xl bg-card/80 backdrop-blur-sm border border-border overflow-hidden',
        local.class
      )}
      style={local.style}
      {...rest}
    >
      {/* Morphing blob background */}
      <div class="absolute inset-0 -z-10 overflow-hidden">
        <div
          class="absolute -top-1/2 -left-1/2 w-full h-full rounded-full bg-primary/20"
          style={{
            animation: 'morph 8s ease-in-out infinite',
            filter: 'blur(40px)',
          }}
        />
        <div
          class="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full bg-accent/20"
          style={{
            animation: 'morph 8s ease-in-out infinite reverse',
            filter: 'blur(40px)',
          }}
        />
      </div>
      <div class="relative z-10">{local.children}</div>
    </div>
  );
}
