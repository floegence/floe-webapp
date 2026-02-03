/**
 * Stepper component for multi-step workflows.
 * Displays a horizontal or vertical list of steps with visual indicators for progress.
 */
import { For, Show, splitProps, type JSX, type Accessor, createMemo } from 'solid-js';
import { cn } from '../../utils/cn';
import { Check } from '../icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepItem {
  /** Unique identifier for the step */
  id: string;
  /** Display label for the step */
  label: string;
  /** Optional description shown below the label */
  description?: string;
  /** Optional icon to show instead of step number */
  icon?: JSX.Element;
  /** Whether this step is optional (shows "(Optional)" badge) */
  optional?: boolean;
  /** Whether this step is disabled and cannot be clicked */
  disabled?: boolean;
}

export type StepperVariant = 'default' | 'minimal' | 'dots';
export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperSize = 'sm' | 'md' | 'lg';

export interface StepperProps {
  /** List of steps to display */
  steps: StepItem[];
  /** Current active step (0-indexed) */
  currentStep: number | Accessor<number>;
  /** Callback when user clicks a step */
  onStepClick?: (stepIndex: number, step: StepItem) => void;
  /** Visual variant */
  variant?: StepperVariant;
  /** Layout orientation */
  orientation?: StepperOrientation;
  /** Size of step indicators */
  size?: StepperSize;
  /** Whether to show connector lines between steps */
  showConnector?: boolean;
  /** Whether clicking on completed steps is allowed */
  allowClickCompleted?: boolean;
  /** Whether clicking on future steps is allowed */
  allowClickFuture?: boolean;
  /** Additional CSS class */
  class?: string;
}

// ─── Size configurations ──────────────────────────────────────────────────────

const sizeConfig = {
  sm: {
    indicator: 'w-6 h-6 text-[10px]',
    iconSize: 'w-3 h-3',
    label: 'text-xs',
    description: 'text-[10px]',
    connector: 'h-px',
    connectorVertical: 'w-px min-h-4',
    gap: 'gap-1',
  },
  md: {
    indicator: 'w-8 h-8 text-xs',
    iconSize: 'w-4 h-4',
    label: 'text-sm',
    description: 'text-xs',
    connector: 'h-0.5',
    connectorVertical: 'w-0.5 min-h-6',
    gap: 'gap-1.5',
  },
  lg: {
    indicator: 'w-10 h-10 text-sm',
    iconSize: 'w-5 h-5',
    label: 'text-base',
    description: 'text-sm',
    connector: 'h-0.5',
    connectorVertical: 'w-0.5 min-h-8',
    gap: 'gap-2',
  },
};

// ─── Step Indicator Component ─────────────────────────────────────────────────

interface StepIndicatorProps {
  step: StepItem;
  index: number;
  status: 'completed' | 'current' | 'upcoming';
  variant: StepperVariant;
  size: StepperSize;
  onClick?: () => void;
  clickable: boolean;
}

function StepIndicator(props: StepIndicatorProps) {
  const config = () => sizeConfig[props.size];
  const isCompleted = () => props.status === 'completed';
  const isCurrent = () => props.status === 'current';

  const baseClasses = () => cn(
    'flex items-center justify-center rounded-full transition-all duration-200',
    'font-medium select-none',
    config().indicator,
    props.clickable && !props.step.disabled
      ? 'cursor-pointer hover:scale-110'
      : props.step.disabled
        ? 'cursor-not-allowed opacity-50'
        : ''
  );

  const variantClasses = () => {
    if (props.variant === 'dots') {
      return cn(
        'w-3 h-3 md:w-4 md:h-4',
        isCompleted() && 'bg-primary',
        isCurrent() && 'bg-primary ring-4 ring-primary/20',
        !isCompleted() && !isCurrent() && 'bg-muted'
      );
    }

    if (props.variant === 'minimal') {
      return cn(
        'border-2',
        isCompleted() && 'border-primary bg-primary text-primary-foreground',
        isCurrent() && 'border-primary text-primary bg-transparent',
        !isCompleted() && !isCurrent() && 'border-muted text-muted-foreground bg-transparent'
      );
    }

    // Default variant
    return cn(
      isCompleted() && 'bg-primary text-primary-foreground shadow-sm',
      isCurrent() && 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20',
      !isCompleted() && !isCurrent() && 'bg-muted text-muted-foreground'
    );
  };

  const handleClick = () => {
    if (props.clickable && !props.step.disabled && props.onClick) {
      props.onClick();
    }
  };

  return (
    <div
      class={cn(baseClasses(), variantClasses())}
      onClick={handleClick}
      role={props.clickable ? 'button' : undefined}
      tabIndex={props.clickable && !props.step.disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <Show when={props.variant !== 'dots'}>
        <Show
          when={isCompleted() && !props.step.icon}
          fallback={
            <Show when={props.step.icon} fallback={<span>{props.index + 1}</span>}>
              <span class={config().iconSize}>{props.step.icon}</span>
            </Show>
          }
        >
          <Check class={config().iconSize} />
        </Show>
      </Show>
    </div>
  );
}

// ─── Step Label Component ─────────────────────────────────────────────────────

interface StepLabelProps {
  step: StepItem;
  status: 'completed' | 'current' | 'upcoming';
  size: StepperSize;
  orientation: StepperOrientation;
}

function StepLabel(props: StepLabelProps) {
  const config = () => sizeConfig[props.size];
  const isCurrent = () => props.status === 'current';
  const isUpcoming = () => props.status === 'upcoming';

  return (
    <div class={cn(
      'flex flex-col',
      config().gap,
      props.orientation === 'horizontal' ? 'items-center text-center' : 'items-start'
    )}>
      <div class={cn(
        'flex items-center gap-1',
        config().label,
        'font-medium transition-colors duration-200',
        isCurrent() && 'text-foreground',
        !isCurrent() && 'text-muted-foreground',
        props.step.disabled && 'opacity-50'
      )}>
        <span>{props.step.label}</span>
        <Show when={props.step.optional}>
          <span class="text-muted-foreground/60 font-normal">(Optional)</span>
        </Show>
      </div>
      <Show when={props.step.description}>
        <p class={cn(
          config().description,
          'text-muted-foreground',
          isUpcoming() && 'opacity-60',
          props.step.disabled && 'opacity-50'
        )}>
          {props.step.description}
        </p>
      </Show>
    </div>
  );
}

// ─── Connector Component ──────────────────────────────────────────────────────

interface ConnectorProps {
  completed: boolean;
  size: StepperSize;
  orientation: StepperOrientation;
}

function Connector(props: ConnectorProps) {
  const config = () => sizeConfig[props.size];

  return (
    <div
      class={cn(
        'transition-colors duration-300',
        props.orientation === 'horizontal'
          ? cn('flex-1', config().connector)
          : cn(config().connectorVertical, 'mx-auto'),
        props.completed ? 'bg-primary' : 'bg-muted'
      )}
    />
  );
}

// ─── Main Stepper Component ───────────────────────────────────────────────────

export function Stepper(props: StepperProps) {
  const [local, _rest] = splitProps(props, [
    'steps',
    'currentStep',
    'onStepClick',
    'variant',
    'orientation',
    'size',
    'showConnector',
    'allowClickCompleted',
    'allowClickFuture',
    'class',
  ]);

  const variant = () => local.variant ?? 'default';
  const orientation = () => local.orientation ?? 'horizontal';
  const size = () => local.size ?? 'md';
  const showConnector = () => local.showConnector ?? true;
  const allowClickCompleted = () => local.allowClickCompleted ?? true;
  const allowClickFuture = () => local.allowClickFuture ?? false;

  const currentStepValue = createMemo(() =>
    typeof local.currentStep === 'function' ? local.currentStep() : local.currentStep
  );

  const getStepStatus = (index: number): 'completed' | 'current' | 'upcoming' => {
    const current = currentStepValue();
    if (index < current) return 'completed';
    if (index === current) return 'current';
    return 'upcoming';
  };

  const isClickable = (index: number): boolean => {
    if (!local.onStepClick) return false;
    const status = getStepStatus(index);
    if (status === 'completed') return allowClickCompleted();
    if (status === 'upcoming') return allowClickFuture();
    return false;
  };

  const handleStepClick = (index: number, step: StepItem) => {
    if (isClickable(index) && !step.disabled) {
      local.onStepClick?.(index, step);
    }
  };

  return (
    <nav
      class={cn(
        'flex',
        orientation() === 'horizontal'
          ? 'flex-row items-start justify-between'
          : 'flex-col',
        local.class
      )}
      aria-label="Progress"
    >
      <For each={local.steps}>
        {(step, index) => {
          const status = () => getStepStatus(index());
          const clickable = () => isClickable(index());
          const isLast = () => index() === local.steps.length - 1;

          return (
            <div
              class={cn(
                'flex',
                orientation() === 'horizontal'
                  ? cn('flex-col items-center', !isLast() && 'flex-1')
                  : 'flex-row items-start gap-3'
              )}
            >
              {/* Step indicator and connector for horizontal */}
              <Show when={orientation() === 'horizontal'}>
                <div class="flex items-center w-full">
                  <StepIndicator
                    step={step}
                    index={index()}
                    status={status()}
                    variant={variant()}
                    size={size()}
                    onClick={() => handleStepClick(index(), step)}
                    clickable={clickable()}
                  />
                  <Show when={showConnector() && !isLast()}>
                    <Connector
                      completed={status() === 'completed'}
                      size={size()}
                      orientation="horizontal"
                    />
                  </Show>
                </div>
                <div class="mt-2">
                  <StepLabel
                    step={step}
                    status={status()}
                    size={size()}
                    orientation="horizontal"
                  />
                </div>
              </Show>

              {/* Vertical layout */}
              <Show when={orientation() === 'vertical'}>
                <div class="flex flex-col items-center">
                  <StepIndicator
                    step={step}
                    index={index()}
                    status={status()}
                    variant={variant()}
                    size={size()}
                    onClick={() => handleStepClick(index(), step)}
                    clickable={clickable()}
                  />
                  <Show when={showConnector() && !isLast()}>
                    <Connector
                      completed={status() === 'completed'}
                      size={size()}
                      orientation="vertical"
                    />
                  </Show>
                </div>
                <div class="flex-1 pb-4">
                  <StepLabel
                    step={step}
                    status={status()}
                    size={size()}
                    orientation="vertical"
                  />
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </nav>
  );
}

// ─── Wizard Component (Stepper + Content) ─────────────────────────────────────

export interface WizardStepContent {
  /** Content to render for this step */
  content: JSX.Element;
}

export interface WizardProps extends Omit<StepperProps, 'steps'> {
  /** Steps with content */
  steps: (StepItem & WizardStepContent)[];
  /** Footer content (e.g., navigation buttons) */
  footer?: JSX.Element;
  /** Class for the content area */
  contentClass?: string;
  /** Class for the footer area */
  footerClass?: string;
}

export function Wizard(props: WizardProps) {
  const [local, stepperProps] = splitProps(props, [
    'steps',
    'footer',
    'contentClass',
    'footerClass',
  ]);

  const stepItems = () => local.steps.map(({ content: _, ...step }) => step);

  const currentStepValue = createMemo(() =>
    typeof props.currentStep === 'function' ? props.currentStep() : props.currentStep
  );

  const currentContent = () => local.steps[currentStepValue()]?.content;

  return (
    <div class="flex flex-col h-full">
      {/* Stepper header */}
      <div class="flex-shrink-0 mb-6">
        <Stepper
          {...stepperProps}
          steps={stepItems()}
        />
      </div>

      {/* Step content */}
      <div class={cn('flex-1 min-h-0', local.contentClass)}>
        {currentContent()}
      </div>

      {/* Footer (navigation buttons) */}
      <Show when={local.footer}>
        <div class={cn('flex-shrink-0 mt-6', local.footerClass)}>
          {local.footer}
        </div>
      </Show>
    </div>
  );
}

// ─── Helper hook for wizard state ─────────────────────────────────────────────

import { createSignal } from 'solid-js';

export interface UseWizardOptions {
  /** Total number of steps */
  totalSteps: number;
  /** Initial step (default: 0) */
  initialStep?: number;
  /** Callback when step changes */
  onStepChange?: (step: number) => void;
}

export interface UseWizardReturn {
  /** Current step (0-indexed) */
  currentStep: Accessor<number>;
  /** Go to next step */
  nextStep: () => void;
  /** Go to previous step */
  prevStep: () => void;
  /** Go to specific step */
  goToStep: (step: number) => void;
  /** Whether currently on first step */
  isFirstStep: Accessor<boolean>;
  /** Whether currently on last step */
  isLastStep: Accessor<boolean>;
  /** Reset to initial step */
  reset: () => void;
}

export function useWizard(options: UseWizardOptions): UseWizardReturn {
  const { totalSteps, initialStep = 0, onStepChange } = options;
  const [currentStep, setCurrentStep] = createSignal(initialStep);

  const goToStep = (step: number) => {
    const clamped = Math.max(0, Math.min(step, totalSteps - 1));
    setCurrentStep(clamped);
    onStepChange?.(clamped);
  };

  const nextStep = () => {
    if (currentStep() < totalSteps - 1) {
      goToStep(currentStep() + 1);
    }
  };

  const prevStep = () => {
    if (currentStep() > 0) {
      goToStep(currentStep() - 1);
    }
  };

  const isFirstStep = createMemo(() => currentStep() === 0);
  const isLastStep = createMemo(() => currentStep() === totalSteps - 1);

  const reset = () => {
    goToStep(initialStep);
  };

  return {
    currentStep,
    nextStep,
    prevStep,
    goToStep,
    isFirstStep,
    isLastStep,
    reset,
  };
}
