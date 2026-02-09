import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  createEffect,
  batch,
  on,
  type ParentComponent,
  type Accessor,
} from 'solid-js';
import { createStore, produce, reconcile } from 'solid-js/store';
import { deferNonBlocking } from '../../utils/defer';
import type {
  Message,
  MessageBlock,
  ColdMessage,
  Attachment,
  ChatConfig,
  ChatCallbacks,
  VirtualListConfig,
  StreamEvent,
} from './types';
import { DEFAULT_VIRTUAL_LIST_CONFIG } from './types';

// ============ Context Value Type ============

export interface ChatContextValue {
  // Message state
  messages: Accessor<Message[]>;
  coldMessages: Map<string, ColdMessage>;

  // Loading state
  isLoadingHistory: Accessor<boolean>;
  hasMoreHistory: Accessor<boolean>;

  // Streaming state
  streamingMessageId: Accessor<string | null>;
  isPreparing: Accessor<boolean>;
  isWorking: Accessor<boolean>;

  // Configuration
  config: Accessor<ChatConfig>;
  virtualListConfig: Accessor<VirtualListConfig>;

  // Actions
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  retryMessage: (messageId: string) => void;

  // Message operations
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updater: (message: Message) => Message) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;

  // Streaming updates
  handleStreamEvent: (event: StreamEvent) => void;

  // Attachment upload (ChatInput uses this to decide between real upload and object URL fallback).
  uploadAttachment: (file: File) => Promise<string>;

  // Tool call collapse
  toggleToolCollapse: (messageId: string, toolId: string) => void;

  // Tool approval
  approveToolCall: (messageId: string, toolId: string, approved: boolean) => void;

  // Height cache
  heightCache: Map<string, number>;
  setMessageHeight: (id: string, height: number) => void;
  getMessageHeight: (id: string) => number;

  // checklist
  toggleChecklistItem: (messageId: string, blockIndex: number, itemId: string) => void;
}

// ============ Context ============

const ChatContext = createContext<ChatContextValue>();

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}

// ============ Provider Props ============

export interface ChatProviderProps {
  initialMessages?: Message[];
  config?: ChatConfig;
  callbacks?: ChatCallbacks;
}

// ============ Provider Component ============

export const ChatProvider: ParentComponent<ChatProviderProps> = (props) => {
  // Merge config
  const config = createMemo(() => ({
    placeholder: 'Type a message...',
    allowAttachments: true,
    maxAttachments: 10,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    ...props.config,
  }));

  const virtualListConfig = createMemo(() => ({
    ...DEFAULT_VIRTUAL_LIST_CONFIG,
    ...props.config?.virtualList,
  }));

  // Message state
  const [messages, setMessagesStore] = createStore<Message[]>(props.initialMessages || []);
  const coldMessages = new Map<string, ColdMessage>();

  // Sync external initialMessages changes
  createEffect(
    on(
      () => props.initialMessages,
      (newMessages) => {
        if (newMessages && newMessages.length > 0) {
          setMessagesStore(reconcile(newMessages));
        }
      },
      { defer: true }
    )
  );

  // Loading state
  const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);
  const [hasMoreHistory, setHasMoreHistory] = createSignal(true);

  // Streaming state
  const [streamingMessageId, setStreamingMessageId] = createSignal<string | null>(null);
  const [pendingSendCount, setPendingSendCount] = createSignal(0);

  let nextPendingSendToken = 0;
  const pendingSendTokens = new Set<number>();
  const pendingSendQueue: number[] = [];

  // Height cache
  const heightCache = new Map<string, number>();

  const clearPendingSendToken = (token: number): void => {
    if (!pendingSendTokens.delete(token)) return;
    const idx = pendingSendQueue.indexOf(token);
    if (idx >= 0) pendingSendQueue.splice(idx, 1);
    setPendingSendCount(pendingSendTokens.size);
  };

  const markPendingSend = (): number => {
    const token = ++nextPendingSendToken;
    pendingSendTokens.add(token);
    pendingSendQueue.push(token);
    setPendingSendCount(pendingSendTokens.size);
    return token;
  };

  const clearOldestPendingSend = (): void => {
    while (pendingSendQueue.length > 0) {
      const token = pendingSendQueue.shift();
      if (token === undefined) return;
      if (!pendingSendTokens.has(token)) continue;
      pendingSendTokens.delete(token);
      setPendingSendCount(pendingSendTokens.size);
      return;
    }
  };

  const isPreparing = createMemo(() => {
    return pendingSendCount() > 0;
  });

  // Compute whether we're working (preparing or streaming)
  const isWorking = createMemo(() => {
    return isPreparing() || streamingMessageId() !== null;
  });

  // ============ Message Operations ============

  const addMessage = (message: Message) => {
    setMessagesStore(produce((msgs) => {
      msgs.push(message);
    }));
  };

  const updateMessage = (messageId: string, updater: (message: Message) => Message) => {
    setMessagesStore(produce((msgs) => {
      const index = msgs.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        msgs[index] = updater(msgs[index]);
      }
    }));
  };

  const deleteMessage = (messageId: string) => {
    setMessagesStore(produce((msgs) => {
      const index = msgs.findIndex((m) => m.id === messageId);
      if (index !== -1) {
        msgs.splice(index, 1);
      }
    }));
    heightCache.delete(messageId);
  };

  const clearMessages = () => {
    setMessagesStore(reconcile([]));
    heightCache.clear();
  };

  const setMessages = (newMessages: Message[]) => {
    setMessagesStore(reconcile(newMessages));
  };

  // ============ Streaming ============

  // Batch update buffer
  let streamBuffer: StreamEvent[] = [];
  let rafId: number | null = null;

  const flushStreamBuffer = () => {
    const events = streamBuffer;
    streamBuffer = [];
    rafId = null;

    batch(() => {
      events.forEach(processStreamEvent);
    });
  };

  const processStreamEvent = (event: StreamEvent) => {
    switch (event.type) {
      case 'message-start': {
        clearOldestPendingSend();
        const newMessage: Message = {
          id: event.messageId,
          role: 'assistant',
          blocks: [],
          status: 'streaming',
          timestamp: Date.now(),
        };
        addMessage(newMessage);
        setStreamingMessageId(event.messageId);
        break;
      }

      case 'block-start': {
        updateMessage(event.messageId, (msg) => ({
          ...msg,
          blocks: [...msg.blocks, createEmptyBlock(event.blockType)],
        }));
        break;
      }

      case 'block-delta': {
        updateMessage(event.messageId, (msg) => {
          const blocks = [...msg.blocks];
          const block = blocks[event.blockIndex];
          if (block && 'content' in block && typeof block.content === 'string') {
            (block as { content: string }).content += event.delta;
          }
          return { ...msg, blocks };
        });
        break;
      }

      case 'block-set': {
        updateMessage(event.messageId, (msg) => {
          const blocks = [...msg.blocks];
          if (event.blockIndex === blocks.length) {
            blocks.push(event.block);
          } else if (event.blockIndex >= 0 && event.blockIndex < blocks.length) {
            blocks[event.blockIndex] = event.block;
          }
          return { ...msg, blocks };
        });
        break;
      }

      case 'block-end': {
        // Block finished; optional post-processing can run here (e.g. highlighting).
        break;
      }

      case 'message-end': {
        updateMessage(event.messageId, (msg) => ({
          ...msg,
          status: 'complete',
        }));
        setStreamingMessageId(null);
        break;
      }

      case 'error': {
        updateMessage(event.messageId, (msg) => ({
          ...msg,
          status: 'error',
          error: event.error,
        }));
        setStreamingMessageId(null);
        break;
      }
    }
  };

  const handleStreamEvent = (event: StreamEvent) => {
    streamBuffer.push(event);
    if (!rafId) {
      rafId = requestAnimationFrame(flushStreamBuffer);
    }
  };

  const uploadAttachment = async (file: File): Promise<string> => {
    const onUploadAttachment = props.callbacks?.onUploadAttachment;
    if (onUploadAttachment) {
      return await onUploadAttachment(file);
    }
    // Fallback for local demos/previews.
    return URL.createObjectURL(file);
  };

  // ============ User Actions ============

  const sendMessage = async (content: string, attachments: Attachment[] = []) => {
    // Create user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      blocks: createUserMessageBlocks(content, attachments),
      status: 'sending',
      timestamp: Date.now(),
    };

    batch(() => {
      addMessage(userMessage);
      // Mark as complete
      updateMessage(userMessage.id, (msg) => ({
        ...msg,
        status: 'complete',
      }));
    });

    // Synchronous hook: let the host react immediately (e.g. show a working
    // indicator) before the async callback is deferred to the next macrotask.
    try {
      props.callbacks?.onWillSend?.(content, attachments);
    } catch (error) {
      console.error('onWillSend error:', error);
    }

    const onSendMessage = props.callbacks?.onSendMessage;
    if (!onSendMessage) return;

    const pendingToken = markPendingSend();

    // UI-first: enqueue + render first, then invoke the external callback in the next macrotask.
    const contentSnapshot = content;
    const attachmentsSnapshot = [...attachments];
    deferNonBlocking(() => {
      void Promise.resolve()
        .then(() => onSendMessage(contentSnapshot, attachmentsSnapshot, addMessage))
        .catch((error) => {
          console.error('Failed to send message:', error);
        })
        .finally(() => {
          clearPendingSendToken(pendingToken);
        });
    });
  };

  const loadMoreHistory = async () => {
    if (isLoadingHistory() || !hasMoreHistory()) return;

    const onLoadMore = props.callbacks?.onLoadMore;
    if (!onLoadMore) return;

    // UI-first: show loading first, then start async loading.
    setIsLoadingHistory(true);
    deferNonBlocking(() => {
      void Promise.resolve(onLoadMore())
        .then((olderMessages) => {
          if (olderMessages.length === 0) {
            setHasMoreHistory(false);
            return;
          }
          setMessagesStore(
            produce((msgs) => {
              msgs.unshift(...olderMessages);
            })
          );
        })
        .catch((error) => {
          console.error('Failed to load history:', error);
        })
        .finally(() => {
          setIsLoadingHistory(false);
        });
    });
  };

  const retryMessage = (messageId: string) => {
    const onRetry = props.callbacks?.onRetry;
    if (!onRetry) return;
    // UI-first: host callback must not block the click handler.
    deferNonBlocking(() => {
      try {
        onRetry(messageId);
      } catch (error) {
        console.error('Failed to retry message:', error);
      }
    });
  };

  // ============ Tool Call Collapse ============

  const toggleToolCollapse = (messageId: string, toolId: string) => {
    updateMessage(messageId, (msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => {
        if (block.type === 'tool-call' && block.toolId === toolId) {
          // Default collapsed is true; first toggle should open (collapsed=false).
          const nextCollapsed = block.collapsed === undefined ? false : !block.collapsed;
          return { ...block, collapsed: nextCollapsed };
        }
        return block;
      }),
    }));
  };

  // ============ Tool Approval ============

  const approveToolCall = (messageId: string, toolId: string, approved: boolean) => {
    // UI-first: update the message store synchronously so users get immediate feedback.
    updateMessage(messageId, (msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => {
        if (block.type !== 'tool-call' || block.toolId !== toolId) return block;
        if (block.requiresApproval !== true || block.approvalState !== 'required') return block;

        if (approved) {
          return { ...block, approvalState: 'approved', status: 'running' };
        }
        return { ...block, approvalState: 'rejected', status: 'error', error: block.error || 'Rejected by user' };
      }),
    }));

    const onToolApproval = props.callbacks?.onToolApproval;
    if (!onToolApproval) return;

    deferNonBlocking(() => {
      void Promise.resolve(onToolApproval(messageId, toolId, approved)).catch((error) => {
        console.error('Failed to approve tool call:', error);
      });
    });
  };

  // ============ Height Cache ============

  const setMessageHeight = (id: string, height: number) => {
    heightCache.set(id, height);
  };

  const getMessageHeight = (id: string) => {
    return heightCache.get(id) || virtualListConfig().defaultItemHeight;
  };

  // ============ Checklist ============

  const toggleChecklistItem = (messageId: string, blockIndex: number, itemId: string) => {
    let nextChecked: boolean | null = null;
    updateMessage(messageId, (msg) => {
      const blocks = [...msg.blocks];
      const block = blocks[blockIndex];
      if (block && block.type === 'checklist') {
        const items = block.items.map((item) =>
          item.id === itemId
            ? (() => {
                nextChecked = !item.checked;
                return { ...item, checked: nextChecked };
              })()
            : item
        );
        blocks[blockIndex] = { ...block, items };
      }
      return { ...msg, blocks };
    });

    const onChecklistChange = props.callbacks?.onChecklistChange;
    if (!onChecklistChange || nextChecked === null) return;
    // UI-first: host callback must not block the toggle interaction.
    deferNonBlocking(() => {
      try {
        onChecklistChange(messageId, blockIndex, itemId, nextChecked!);
      } catch (error) {
        console.error('Failed to handle checklist change:', error);
      }
    });
  };

  // ============ Context Value ============

  const contextValue: ChatContextValue = {
    messages: () => messages,
    coldMessages,
    isLoadingHistory,
    hasMoreHistory,
    streamingMessageId,
    isPreparing,
    isWorking,
    config,
    virtualListConfig,
    sendMessage,
    loadMoreHistory,
    retryMessage,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setMessages,
    handleStreamEvent,
    uploadAttachment,
    toggleToolCollapse,
    approveToolCall,
    heightCache,
    setMessageHeight,
    getMessageHeight,
    toggleChecklistItem,
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {props.children}
    </ChatContext.Provider>
  );
};

// ============ Helper Functions ============

function createEmptyBlock(type: MessageBlock['type']): MessageBlock {
  switch (type) {
    case 'text':
      return { type: 'text', content: '' };
    case 'markdown':
      return { type: 'markdown', content: '' };
    case 'code':
      return { type: 'code', language: '', content: '' };
    case 'code-diff':
      return { type: 'code-diff', language: '', oldCode: '', newCode: '' };
    case 'image':
      return { type: 'image', src: '' };
    case 'svg':
      return { type: 'svg', content: '' };
    case 'mermaid':
      return { type: 'mermaid', content: '' };
    case 'checklist':
      return { type: 'checklist', items: [] };
    case 'shell':
      return { type: 'shell', command: '', status: 'running' };
    case 'file':
      return { type: 'file', name: '', size: 0, mimeType: '' };
    case 'thinking':
      return { type: 'thinking' };
    case 'tool-call':
      return { type: 'tool-call', toolName: '', toolId: '', args: {}, status: 'pending' };
    default:
      return { type: 'text', content: '' };
  }
}

function createUserMessageBlocks(content: string, attachments: Attachment[]): MessageBlock[] {
  const blocks: MessageBlock[] = [];

  // Attachments
  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      blocks.push({
        type: 'image',
        src: attachment.url || attachment.preview || '',
        alt: attachment.file.name,
      });
    } else {
      blocks.push({
        type: 'file',
        name: attachment.file.name,
        size: attachment.file.size,
        mimeType: attachment.file.type,
        url: attachment.url,
      });
    }
  }

  // Text content
  if (content.trim()) {
    blocks.push({
      type: 'text',
      content: content.trim(),
    });
  }

  return blocks;
}
