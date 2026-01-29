import { type Component, createSignal, For, Show } from 'solid-js';
import {
  SidebarContent,
  SidebarSection,
  SidebarItemList,
  Button,
  MessageSquare,
  Plus,
} from '@floegence/floe-webapp-core';

interface Thread {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  unread?: boolean;
}

// Demo threads
const createDemoThreads = (): Thread[] => [
  {
    id: 'thread-1',
    title: 'Chat Component Demo',
    preview: 'Showcasing all message block types...',
    timestamp: new Date(),
    unread: false,
  },
  {
    id: 'thread-2',
    title: 'Code Review Assistant',
    preview: 'Please review this PR for security issues',
    timestamp: new Date(Date.now() - 3600000),
    unread: true,
  },
  {
    id: 'thread-3',
    title: 'API Design Discussion',
    preview: 'What do you think about REST vs GraphQL?',
    timestamp: new Date(Date.now() - 86400000),
    unread: false,
  },
  {
    id: 'thread-4',
    title: 'Bug Fix: Auth Flow',
    preview: 'The login redirect is not working...',
    timestamp: new Date(Date.now() - 172800000),
    unread: false,
  },
  {
    id: 'thread-5',
    title: 'Documentation Update',
    preview: 'Can you help update the README?',
    timestamp: new Date(Date.now() - 259200000),
    unread: false,
  },
];

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

export interface ChatSidebarProps {
  onNewChat?: () => void;
  onSelectThread?: (threadId: string) => void;
}

export const ChatSidebar: Component<ChatSidebarProps> = (props) => {
  const [threads] = createSignal<Thread[]>(createDemoThreads());
  const [selectedThreadId, setSelectedThreadId] = createSignal<string>('thread-1');

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    props.onSelectThread?.(threadId);
  };

  return (
    <SidebarContent>
      {/* New Chat Button */}
      <div class="px-0.5">
        <Button size="sm" class="w-full justify-center" onClick={props.onNewChat}>
          <Plus class="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Thread List */}
      <SidebarSection title="Conversations">
        <SidebarItemList>
          <For each={threads()}>
            {(thread) => (
              <button
                type="button"
                class={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer rounded-sm
                  transition-colors duration-75
                  hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground
                  focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-sidebar-ring
                  ${selectedThreadId() === thread.id ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : ''}`}
                onClick={() => handleSelectThread(thread.id)}
              >
                <span class="flex-shrink-0 w-4 h-4 opacity-60">
                  <MessageSquare class="w-4 h-4" />
                </span>
                <div class="flex-1 min-w-0 text-left">
                  <div class="flex items-center gap-2">
                    <span class="truncate">{thread.title}</span>
                    <Show when={thread.unread}>
                      <span class="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    </Show>
                  </div>
                  <p class="text-[10px] text-muted-foreground truncate mt-0.5">
                    {thread.preview}
                  </p>
                </div>
                <span class="text-[10px] text-muted-foreground flex-shrink-0">
                  {formatTimestamp(thread.timestamp)}
                </span>
              </button>
            )}
          </For>
        </SidebarItemList>
      </SidebarSection>
    </SidebarContent>
  );
};
