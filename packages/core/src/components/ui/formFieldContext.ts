import { createContext, useContext, type Accessor } from 'solid-js';

export interface FormFieldBinding {
  id: Accessor<string>;
  name: Accessor<string | undefined>;
  error: Accessor<string | undefined>;
  required: Accessor<boolean | undefined>;
  disabled: Accessor<boolean | undefined>;
  readOnly: Accessor<boolean | undefined>;
  descriptionIds: Accessor<string[]>;
  messageIds: Accessor<string[]>;
  registerDescription: (id: string) => () => void;
  registerMessage: (id: string, error: Accessor<string | undefined>) => () => void;
}

export const FormFieldContext = createContext<FormFieldBinding>();
export function useFormField() {
  return useContext(FormFieldContext);
}

export function joinAriaIds(...values: (string | undefined)[]): string | undefined {
  return (
    [...new Set(values.flatMap((value) => value?.split(/\s+/).filter(Boolean) ?? []))].join(' ') ||
    undefined
  );
}

/** Spread these reactive properties on a native or third-party field control. */
export function useFormControl() {
  const field = useFormField();
  return {
    get id() {
      return field?.id();
    },
    get name() {
      return field?.name();
    },
    get required() {
      return field?.required();
    },
    get disabled() {
      return field?.disabled();
    },
    get readOnly() {
      return field?.readOnly();
    },
    get 'aria-invalid'() {
      return field?.error() ? (true as const) : undefined;
    },
    get 'aria-describedby'() {
      return joinAriaIds(...(field?.descriptionIds() ?? []), ...(field?.messageIds() ?? []));
    },
  };
}
