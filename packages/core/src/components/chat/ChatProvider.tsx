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
  // 消息状态
  messages: Accessor<Message[]>;
  coldMessages: Map<string, ColdMessage>;

  // 加载状态
  isLoadingHistory: Accessor<boolean>;
  hasMoreHistory: Accessor<boolean>;

  // 流式状态
  streamingMessageId: Accessor<string | null>;
  isWorking: Accessor<boolean>;

  // 配置
  config: Accessor<ChatConfig>;
  virtualListConfig: Accessor<VirtualListConfig>;

  // 操作
  sendMessage: (content: string, attachments?: Attachment[]) => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  retryMessage: (messageId: string) => void;

  // 消息操作
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updater: (message: Message) => Message) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
  setMessages: (messages: Message[]) => void;

  // 流式更新
  handleStreamEvent: (event: StreamEvent) => void;

  // 工具调用折叠
  toggleToolCollapse: (messageId: string, toolId: string) => void;

  // 高度缓存
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
  // 合并配置
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

  // 消息状态
  const [messages, setMessagesStore] = createStore<Message[]>(props.initialMessages || []);
  const coldMessages = new Map<string, ColdMessage>();

  // 同步外部 initialMessages 变化
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

  // 加载状态
  const [isLoadingHistory, setIsLoadingHistory] = createSignal(false);
  const [hasMoreHistory, setHasMoreHistory] = createSignal(true);

  // 流式状态
  const [streamingMessageId, setStreamingMessageId] = createSignal<string | null>(null);

  // 高度缓存
  const heightCache = new Map<string, number>();

  // 计算是否正在工作
  const isWorking = createMemo(() => {
    return streamingMessageId() !== null;
  });

  // ============ 消息操作 ============

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

  // ============ 流式处理 ============

  // 批量更新缓冲
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

      case 'block-end': {
        // block 完成，可以触发后处理（如代码高亮）
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

  // ============ 用户操作 ============

  const sendMessage = async (content: string, attachments: Attachment[] = []) => {
    // 创建用户消息
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      blocks: createUserMessageBlocks(content, attachments),
      status: 'sending',
      timestamp: Date.now(),
    };

    addMessage(userMessage);

    // 更新状态为完成
    updateMessage(userMessage.id, (msg) => ({
      ...msg,
      status: 'complete',
    }));

    // 调用回调，传入 addMessage 以便添加 AI 响应
    if (props.callbacks?.onSendMessage) {
      try {
        await props.callbacks.onSendMessage(content, attachments, addMessage);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const loadMoreHistory = async () => {
    if (isLoadingHistory() || !hasMoreHistory()) return;

    setIsLoadingHistory(true);

    try {
      if (props.callbacks?.onLoadMore) {
        const olderMessages = await props.callbacks.onLoadMore();
        if (olderMessages.length === 0) {
          setHasMoreHistory(false);
        } else {
          setMessagesStore(produce((msgs) => {
            msgs.unshift(...olderMessages);
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const retryMessage = (messageId: string) => {
    props.callbacks?.onRetry?.(messageId);
  };

  // ============ 工具调用折叠 ============

  const toggleToolCollapse = (messageId: string, toolId: string) => {
    updateMessage(messageId, (msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => {
        if (block.type === 'tool-call' && block.toolId === toolId) {
          return { ...block, collapsed: !block.collapsed };
        }
        return block;
      }),
    }));
  };

  // ============ 高度缓存 ============

  const setMessageHeight = (id: string, height: number) => {
    heightCache.set(id, height);
  };

  const getMessageHeight = (id: string) => {
    return heightCache.get(id) || virtualListConfig().defaultItemHeight;
  };

  // ============ Checklist ============

  const toggleChecklistItem = (messageId: string, blockIndex: number, itemId: string) => {
    updateMessage(messageId, (msg) => {
      const blocks = [...msg.blocks];
      const block = blocks[blockIndex];
      if (block && block.type === 'checklist') {
        const items = block.items.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        blocks[blockIndex] = { ...block, items };
      }
      return { ...msg, blocks };
    });

    props.callbacks?.onChecklistChange?.(messageId, blockIndex, itemId, true);
  };

  // ============ Context Value ============

  const contextValue: ChatContextValue = {
    messages: () => messages,
    coldMessages,
    isLoadingHistory,
    hasMoreHistory,
    streamingMessageId,
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
    toggleToolCollapse,
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

  // 添加附件
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

  // 添加文本内容
  if (content.trim()) {
    blocks.push({
      type: 'text',
      content: content.trim(),
    });
  }

  return blocks;
}
