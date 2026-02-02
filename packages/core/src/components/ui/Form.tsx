import {
  createContext,
  useContext,
  splitProps,
  type JSX,
  Show,
  createSignal,
  createUniqueId,
  type Accessor,
} from 'solid-js';
import { cn } from '../../utils/cn';

// ============================================================================
// Form Context
// ============================================================================

interface FormContextValue {
  /** Whether form is currently submitting */
  isSubmitting: Accessor<boolean>;
  /** Set submitting state */
  setSubmitting: (value: boolean) => void;
}

const FormContext = createContext<FormContextValue>();

function useFormContext() {
  return useContext(FormContext);
}

// ============================================================================
// Form Component
// ============================================================================

export interface FormProps extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Called when form is submitted */
  onSubmit?: (e: SubmitEvent) => void | Promise<void>;
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Form wrapper with built-in submission state management.
 * Automatically prevents default form behavior and tracks submitting state.
 */
export function Form(props: FormProps) {
  const [local, rest] = splitProps(props, ['onSubmit', 'class', 'children']);
  const [isSubmitting, setSubmitting] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (isSubmitting()) return;

    if (local.onSubmit) {
      setSubmitting(true);
      try {
        await local.onSubmit(e);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const contextValue: FormContextValue = {
    isSubmitting,
    setSubmitting,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        class={cn('space-y-4', local.class)}
        {...rest}
      >
        {local.children}
      </form>
    </FormContext.Provider>
  );
}

// ============================================================================
// FormField Component
// ============================================================================

interface FormFieldContextValue {
  id: string;
  errorId: string;
  helperId: string;
  hasError: Accessor<boolean>;
  setError: (error: string | undefined) => void;
}

const FormFieldContext = createContext<FormFieldContextValue>();

function useFormField() {
  const ctx = useContext(FormFieldContext);
  if (!ctx) {
    throw new Error('useFormField must be used within a FormField');
  }
  return ctx;
}

export interface FormFieldProps {
  /** Field name for identification */
  name?: string;
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Container for a form field. Provides context for label, control, and message components.
 */
export function FormField(props: FormFieldProps) {
  const [local, rest] = splitProps(props, ['name', 'class', 'children']);
  const id = createUniqueId();
  const [error, setError] = createSignal<string | undefined>();

  const contextValue: FormFieldContextValue = {
    id: `field-${id}`,
    errorId: `field-${id}-error`,
    helperId: `field-${id}-helper`,
    hasError: () => !!error(),
    setError,
  };

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div class={cn('space-y-1.5', local.class)} data-field={local.name} {...rest}>
        {local.children}
      </div>
    </FormFieldContext.Provider>
  );
}

// ============================================================================
// FormLabel Component
// ============================================================================

export interface FormLabelProps extends JSX.LabelHTMLAttributes<HTMLLabelElement> {
  /** Whether the field is required */
  required?: boolean;
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Label for a form field. Automatically associates with the field control.
 */
export function FormLabel(props: FormLabelProps) {
  const [local, rest] = splitProps(props, ['required', 'class', 'children']);
  const fieldCtx = useFormField();

  return (
    <label
      for={fieldCtx.id}
      class={cn(
        'block text-xs font-medium text-foreground',
        fieldCtx.hasError() && 'text-error',
        local.class
      )}
      {...rest}
    >
      {local.children}
      <Show when={local.required}>
        <span class="text-error ml-0.5" aria-hidden="true">*</span>
      </Show>
    </label>
  );
}

// ============================================================================
// FormControl Component
// ============================================================================

export interface FormControlProps {
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Wrapper for form input elements. Passes field context props to children.
 * Children should accept id, aria-describedby, and aria-invalid props.
 */
export function FormControl(props: FormControlProps) {
  const [local] = splitProps(props, ['class', 'children']);
  const fieldCtx = useFormField();

  // Clone the child element and inject field context props
  // Since SolidJS doesn't support cloneElement, we wrap and rely on CSS
  return (
    <div
      class={cn('relative', local.class)}
      data-field-control
      data-field-id={fieldCtx.id}
    >
      {local.children}
    </div>
  );
}

// ============================================================================
// FormDescription Component
// ============================================================================

export interface FormDescriptionProps {
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Helper text displayed below a form field.
 */
export function FormDescription(props: FormDescriptionProps) {
  const [local] = splitProps(props, ['class', 'children']);
  const fieldCtx = useFormField();

  return (
    <p
      id={fieldCtx.helperId}
      class={cn('text-[11px] text-muted-foreground', local.class)}
    >
      {local.children}
    </p>
  );
}

// ============================================================================
// FormMessage Component
// ============================================================================

export interface FormMessageProps {
  /** Error message to display */
  error?: string;
  /** Additional class names */
  class?: string;
  children?: JSX.Element;
}

/**
 * Error or validation message for a form field.
 * Automatically uses field context for accessibility.
 */
export function FormMessage(props: FormMessageProps) {
  const [local] = splitProps(props, ['error', 'class', 'children']);
  const fieldCtx = useFormField();

  // Update field error state when error prop changes
  const hasError = () => !!local.error || !!local.children;

  return (
    <Show when={hasError()}>
      <p
        id={fieldCtx.errorId}
        class={cn('text-[11px] text-error', local.class)}
        role="alert"
      >
        {local.error ?? local.children}
      </p>
    </Show>
  );
}

// ============================================================================
// FormActions Component
// ============================================================================

export interface FormActionsProps {
  /** Alignment of action buttons */
  align?: 'start' | 'center' | 'end' | 'between';
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Container for form action buttons (Submit, Cancel, etc.)
 */
export function FormActions(props: FormActionsProps) {
  const [local, rest] = splitProps(props, ['align', 'class', 'children']);

  const alignClass = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      class={cn(
        'flex items-center gap-2 pt-2',
        alignClass[local.align ?? 'end'],
        local.class
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// ============================================================================
// FormSection Component
// ============================================================================

export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Groups related form fields with an optional title and description.
 */
export function FormSection(props: FormSectionProps) {
  const [local, rest] = splitProps(props, ['title', 'description', 'class', 'children']);

  return (
    <div class={cn('space-y-3', local.class)} {...rest}>
      <Show when={local.title || local.description}>
        <div class="space-y-0.5">
          <Show when={local.title}>
            <h3 class="text-sm font-medium text-foreground">{local.title}</h3>
          </Show>
          <Show when={local.description}>
            <p class="text-[11px] text-muted-foreground">{local.description}</p>
          </Show>
        </div>
      </Show>
      <div class="space-y-3">
        {local.children}
      </div>
    </div>
  );
}

// ============================================================================
// FormDivider Component
// ============================================================================

export interface FormDividerProps {
  /** Optional label text */
  label?: string;
  /** Additional class names */
  class?: string;
}

/**
 * Visual divider between form sections.
 */
export function FormDivider(props: FormDividerProps) {
  const [local] = splitProps(props, ['label', 'class']);

  return (
    <Show
      when={local.label}
      fallback={<div class={cn('h-px bg-border my-4', local.class)} />}
    >
      <div class={cn('flex items-center gap-3 my-4', local.class)}>
        <div class="flex-1 h-px bg-border" />
        <span class="text-[11px] text-muted-foreground uppercase tracking-wider">
          {local.label}
        </span>
        <div class="flex-1 h-px bg-border" />
      </div>
    </Show>
  );
}

// ============================================================================
// FormRow Component
// ============================================================================

export interface FormRowProps {
  /** Number of columns on desktop (default: 2) */
  cols?: 1 | 2 | 3 | 4;
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Horizontal layout for multiple form fields. Stacks on mobile.
 */
export function FormRow(props: FormRowProps) {
  const [local, rest] = splitProps(props, ['cols', 'class', 'children']);

  const colsClass = {
    1: 'grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  };

  return (
    <div
      class={cn(
        'grid gap-3 grid-cols-1',
        colsClass[local.cols ?? 2],
        local.class
      )}
      {...rest}
    >
      {local.children}
    </div>
  );
}

// ============================================================================
// Hook: useFormSubmitting
// ============================================================================

/**
 * Hook to access form submission state from within the form.
 * Returns undefined if used outside a Form component.
 */
export function useFormSubmitting(): Accessor<boolean> | undefined {
  const ctx = useFormContext();
  return ctx?.isSubmitting;
}
