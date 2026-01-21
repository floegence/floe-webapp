import { For, Show, type Accessor } from 'solid-js';
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
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
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
    info: 'border-info/50 bg-info/10',
    success: 'border-success/50 bg-success/10',
    warning: 'border-warning/50 bg-warning/10',
    error: 'border-error/50 bg-error/10',
  };

  return (
    <div
      class={cn(
        'animate-in slide-in-from-right fade-in',
        'rounded-lg border p-4 shadow-lg backdrop-blur-sm',
        'bg-card text-card-foreground',
        typeStyles[props.notification.type]
      )}
      role="alert"
    >
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm">{props.notification.title}</p>
          <Show when={props.notification.message}>
            <p class="mt-1 text-sm text-muted-foreground">{props.notification.message}</p>
          </Show>
          <Show when={props.notification.action}>
            <button
              type="button"
              class="mt-2 text-sm font-medium text-primary hover:underline"
              onClick={() => props.notification.action?.onClick()}
            >
              {props.notification.action!.label}
            </button>
          </Show>
        </div>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => props.onDismiss()}
          aria-label="Dismiss"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
