import { For, Show, onCleanup, type Accessor, type JSX } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { createSimpleContext } from './createSimpleContext';
import { cn } from '../utils/cn';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationStore {
  notifications: Notification[];
}

export interface NotificationContextValue {
  notifications: Accessor<Notification[]>;
  show: (notification: Omit<Notification, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  info: (title: string, message?: string) => string;
  success: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
}

const DEFAULT_DURATION = 5000;

export function createNotificationService(): NotificationContextValue {
  const [store, setStore] = createStore<NotificationStore>({
    notifications: [],
  });

  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

  onCleanup(() => {
    timeouts.forEach((t) => clearTimeout(t));
    timeouts.clear();
  });

  const dismiss = (id: string) => {
    const timeout = timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(id);
    }
    setStore(
      produce((s) => {
        s.notifications = s.notifications.filter((n) => n.id !== id);
      })
    );
  };

  const show = (notification: Omit<Notification, 'id'>): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const duration = notification.duration ?? DEFAULT_DURATION;

    setStore(
      produce((s) => {
        s.notifications.push({ ...notification, id });
      })
    );

    // Auto-dismiss after duration (if not 0)
    if (duration > 0) {
      const timeout = setTimeout(() => dismiss(id), duration);
      timeouts.set(id, timeout);
    }

    return id;
  };

  return {
    notifications: () => store.notifications,
    show,
    dismiss,
    dismissAll: () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      setStore('notifications', []);
    },
    info: (title, message) => show({ type: 'info', title, message }),
    success: (title, message) => show({ type: 'success', title, message }),
    warning: (title, message) => show({ type: 'warning', title, message }),
    error: (title, message) => show({ type: 'error', title, message }),
  };
}

export const { Provider: NotificationProvider, use: useNotification } =
  createSimpleContext<NotificationContextValue>({
    name: 'Notification',
    init: createNotificationService,
  });

/**
 * Notification toast container component
 * Place this at the root of your app
 */
export function NotificationContainer() {
  const { notifications, dismiss } = useNotification();

  return (
    <div class="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <For each={notifications()}>
        {(notification) => (
          <NotificationToast notification={notification} onDismiss={() => dismiss(notification.id)} />
        )}
      </For>
    </div>
  );
}

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
}

function NotificationToast(props: NotificationToastProps) {
  const typeStyles: Record<NotificationType, string> = {
    info: 'border-l-info',
    success: 'border-l-success',
    warning: 'border-l-warning',
    error: 'border-l-error',
  };

  const typeIcons: Record<NotificationType, () => JSX.Element> = {
    info: () => (
      <svg class="w-4 h-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    success: () => (
      <svg class="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    warning: () => (
      <svg class="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: () => (
      <svg class="w-4 h-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path stroke-linecap="round" d="M15 9l-6 6M9 9l6 6" />
      </svg>
    ),
  };

  return (
    <div
      class={cn(
        'animate-in slide-in-from-right fade-in duration-200',
        'rounded-lg border border-border border-l-[3px] p-3.5',
        'shadow-md',
        'bg-card text-card-foreground',
        typeStyles[props.notification.type]
      )}
      role="alert"
    >
      <div class="flex items-start gap-3">
        <span class="flex-shrink-0 mt-0.5">{typeIcons[props.notification.type]()}</span>
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm">{props.notification.title}</p>
          <Show when={props.notification.message}>
            <p class="mt-1 text-sm text-muted-foreground">{props.notification.message}</p>
          </Show>
          <Show when={props.notification.action}>
            <button
              type="button"
              class="mt-2 text-sm font-medium text-foreground hover:underline"
              onClick={() => props.notification.action?.onClick()}
            >
              {props.notification.action!.label}
            </button>
          </Show>
        </div>
        <button
          type="button"
          class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => props.onDismiss()}
          aria-label="Dismiss"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
