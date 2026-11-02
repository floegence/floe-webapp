import {
  createContext,
  useContext,
  splitProps,
  type JSX,
  Show,
  createSignal,
  createUniqueId,
  type Accessor,
  onCleanup,
  For,
} from 'solid-js';
import { cn } from '../../utils/cn';
import { FormFieldContext, useFormField, useFormControl, type FormFieldBinding } from './formFieldContext';

// ============================================================================
// Form Context
// ============================================================================

interface FormContextValue {
  /** Whether form is currently submitting */
  isSubmitting: Accessor<boolean>;
  /** Set submitting state */
  setSubmitting: (value: boolean) => void;
  errors: Accessor<Record<string, string>>;
}

const FormContext = createContext<FormContextValue>();

function useFormContext() {
  return useContext(FormContext);
}

// ============================================================================
// Form Component
// ============================================================================

export interface FormProps extends Omit<JSX.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onReset'> {
  /** Called when form is submitted */
  onSubmit?: (e: SubmitEvent, context: { form: HTMLFormElement; data: FormData }) => void | Promise<void>;
  /** Host-owned validation. Return field messages; undefined means valid. */
  validate?: (data: FormData) => Record<string, string> | undefined | Promise<Record<string, string> | undefined>;
  onReset?: (event: Event) => void;
  onSubmitError?: (error: unknown) => void;
  /** Additional class names */
  class?: string;
  children: JSX.Element;
}

/**
 * Form wrapper with built-in submission state management.
 * Automatically prevents default form behavior and tracks submitting state.
 */
export function Form(props: FormProps) {
  const [local, rest] = splitProps(props, ['onSubmit', 'onReset', 'validate', 'onSubmitError', 'class', 'children']);
  const [isSubmitting, setSubmitting] = createSignal(false);
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  let generation = 0;
  onCleanup(() => { generation++; });

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (isSubmitting()) return;

    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form, e.submitter);
    const current = ++generation;
    setSubmitting(true);
    try {
      const result = local.validate ? await local.validate(data) : undefined;
      if (current !== generation) return;
      setErrors(result ?? {});
      if (result && Object.values(result).some(Boolean)) {
        const control = Array.from(form.elements).find(element => 'name' in element && result[String(element.name)]);
        if (control instanceof HTMLElement) {
          const field = control.closest('[data-field]');
          (field?.querySelector<HTMLElement>('[role="combobox"]') ?? control).focus();
        }
        return;
      }
      await local.onSubmit?.(e, { form, data });
    } catch (error) {
      if (current !== generation) return;
      if (local.onSubmitError) local.onSubmitError(error);
      else throw error;
    } finally {
      if (current === generation) setSubmitting(false);
    }
  };

  const contextValue: FormContextValue = {
    isSubmitting,
    setSubmitting,
    errors,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <form
        onSubmit={handleSubmit}
        onReset={event => {
          local.onReset?.(event);
          if (event.defaultPrevented) return;
          generation++; setErrors({}); setSubmitting(false);
        }}
        aria-busy={isSubmitting() || undefined}
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

export interface FormFieldProps {
  /** Put explicit control identities here so the label shares the same ID. */
  id?: string;
  error?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
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
  const form = useFormContext();
  const [local, rest] = splitProps(props, ['id', 'name', 'error', 'description', 'required', 'disabled', 'readOnly', 'class', 'children']);
  const generatedId = createUniqueId();
  const id = () => local.id ?? `field-${generatedId}`;
  const [descriptions, setDescriptions] = createSignal<string[]>([]);
  const [messages, setMessages] = createSignal<{ id: string; error: Accessor<string | undefined> }[]>([]);
  const contextValue: FormFieldBinding = {
    id, name: () => local.name,
    error: () => local.error || (local.name ? form?.errors()[local.name] : undefined) || messages().map(item => item.error()).find(Boolean),
    required: () => local.required, disabled: () => local.disabled, readOnly: () => local.readOnly,
    descriptionIds: () => [...(local.description ? [`${id()}-helper`] : []), ...descriptions()],
    messageIds: () => [...((local.error || (local.name && form?.errors()[local.name])) ? [`${id()}-error`] : []), ...messages().filter(item => item.error()).map(item => item.id)],
    registerDescription: entry => {
      setDescriptions(items => [...items, entry]);
      return () => setDescriptions(items => items.filter(item => item !== entry));
    },
    registerMessage: (entry, error) => {
      setMessages(items => [...items, { id: entry, error }]);
      return () => setMessages(items => items.filter(item => item.id !== entry));
    },
  };

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div class={cn('space-y-1.5', local.class)} data-field={local.name} {...rest}>
        {local.children}
        <Show when={local.description}><p id={`${id()}-helper`} class="text-caption text-muted-foreground">{local.description}</p></Show>
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
      for={fieldCtx?.id()}
      class={cn(
        'block text-xs font-medium text-foreground',
        fieldCtx?.error() && 'text-error',
        local.class
      )}
      {...rest}
    >
      {local.children}
      <Show when={local.required ?? fieldCtx?.required()}>
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
  children: JSX.Element | ((control: ReturnType<typeof useFormControl>) => JSX.Element);
}

/**
 * Layout wrapper. Floe inputs consume the context directly. Custom controls
 * can use the render function to spread the same reactive field properties.
 */
export function FormControl(props: FormControlProps) {
  const [local] = splitProps(props, ['class', 'children']);
  const fieldCtx = useFormField();

  const control = useFormControl();
  return (
    <div
      class={cn('relative', local.class)}
      data-field-control
      data-field-id={fieldCtx?.id()}
    >
      {typeof local.children === 'function' ? local.children(control) : local.children}
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
  const generatedId = createUniqueId();
  const id = `${fieldCtx?.id() ?? generatedId}-description-${generatedId}`;
  if (fieldCtx) onCleanup(fieldCtx.registerDescription(id));

  return (
    <p
      id={id}
      class={cn('text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)]', local.class)}
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
  /** Issues from validators implementing Standard Schema. */
  errors?: readonly { message: string }[];
  /** Additional class names */
  class?: string;
  children?: JSX.Element;
}

/**
 * Error or validation message for a form field.
 * Automatically uses field context for accessibility.
 */
export function FormMessage(props: FormMessageProps) {
  const field = useFormField();
  const generatedId = createUniqueId();
  const ownId = `message-${generatedId}`;
  const ownError = () => props.error || props.errors?.map(item => item.message).join(' ') || (props.children ? String(props.children) : undefined);
  if (field) onCleanup(field.registerMessage(ownId, () => ownError()));
  return <Show when={ownError() || field?.error()}>
    <div id={ownError() ? ownId : `${field?.id() ?? generatedId}-error`} class={cn('text-caption text-error', props.class)} role="alert">
      <Show when={props.errors?.length} fallback={props.error ?? props.children ?? field?.error()}>
        <ul><For each={props.errors}>{issue => <li>{issue.message}</li>}</For></ul>
      </Show>
    </div>
  </Show>;
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
            <p class="text-[length:var(--floe-type-caption)] text-[var(--floe-ink-soft)]">{local.description}</p>
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
        <span class="text-[length:var(--floe-type-caption)] text-[var(--floe-ink-quiet)] uppercase tracking-[0.06em]">
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
