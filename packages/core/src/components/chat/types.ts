// ============ Message Block Types ============

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

export interface CodeBlock {
  type: 'code';
  language: string;
  content: string;
  filename?: string;
}

export interface CodeDiffBlock {
  type: 'code-diff';
  language: string;
  oldCode: string;
  newCode: string;
  filename?: string;
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface SvgBlock {
  type: 'svg';
  content: string;
}

export interface MermaidBlock {
  type: 'mermaid';
  content: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface ChecklistBlock {
  type: 'checklist';
  items: ChecklistItem[];
}

export interface ShellBlock {
  type: 'shell';
  command: string;
  output?: string;
  exitCode?: number;
  status: 'running' | 'success' | 'error';
}

export interface FileBlock {
  type: 'file';
  name: string;
  size: number;
  mimeType: string;
  url?: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  content?: string;
  duration?: number;
}

// 工具调用 - 支持嵌套
export interface ToolCallBlock {
  type: 'tool-call';
  toolName: string;
  toolId: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  children?: MessageBlock[];
  collapsed?: boolean;
}

export type MessageBlock =
  | TextBlock
  | MarkdownBlock
  | CodeBlock
  | CodeDiffBlock
  | ImageBlock
  | SvgBlock
  | MermaidBlock
  | ChecklistBlock
  | ShellBlock
  | FileBlock
  | ThinkingBlock
  | ToolCallBlock;

// ============ Message Types ============

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus =
  | 'sending'     // 用户消息发送中
  | 'streaming'   // AI 正在流式输出
  | 'complete'    // 完成
  | 'error';      // 出错

export interface Message {
  id: string;
  role: MessageRole;
  blocks: MessageBlock[];
  status: MessageStatus;
  timestamp: number;
  error?: string;
}

// ============ Cold Message (Memory Optimization) ============

export interface BlockSummary {
  type: string;
  preview?: string;
}

export interface ColdMessage {
  id: string;
  role: MessageRole;
  estimatedHeight: number;
  blockSummary: BlockSummary[];
  timestamp: number;
}

// ============ Attachment Types ============

export type AttachmentType = 'image' | 'file';
export type AttachmentStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface Attachment {
  id: string;
  file: File;
  type: AttachmentType;
  preview?: string;
  uploadProgress: number;
  status: AttachmentStatus;
  url?: string;
  error?: string;
}

// ============ Stream Events ============

export type StreamEvent =
  | { type: 'message-start'; messageId: string }
  | { type: 'block-start'; messageId: string; blockIndex: number; blockType: MessageBlock['type'] }
  | { type: 'block-delta'; messageId: string; blockIndex: number; delta: string }
  | { type: 'block-end'; messageId: string; blockIndex: number }
  | { type: 'message-end'; messageId: string }
  | { type: 'error'; messageId: string; error: string };

// ============ Virtual List Config ============

export interface VirtualListConfig {
  // 渲染窗口
  overscan: number;
  // 数据窗口
  hotWindow: number;
  warmWindow: number;
  // 加载策略
  loadBatchSize: number;
  loadThreshold: number;
  // 高度估算
  defaultItemHeight: number;
}

export const DEFAULT_VIRTUAL_LIST_CONFIG: VirtualListConfig = {
  overscan: 20,
  hotWindow: 80,
  warmWindow: 300,
  loadBatchSize: 100,
  loadThreshold: 30,
  defaultItemHeight: 120,
};

// ============ Chat Context Types ============

export interface ChatConfig {
  // 虚拟列表配置
  virtualList?: Partial<VirtualListConfig>;
  // 用户头像
  userAvatar?: string;
  // AI 头像
  assistantAvatar?: string;
  // 占位符文本
  placeholder?: string;
  // 是否允许附件
  allowAttachments?: boolean;
  // 允许的附件类型
  acceptedFileTypes?: string;
  // 最大附件大小（字节）
  maxAttachmentSize?: number;
  // 最大附件数量
  maxAttachments?: number;
}

export interface ChatCallbacks {
  // 发送消息 - addMessage 允许外部回调添加 AI 响应消息
  onSendMessage?: (content: string, attachments: Attachment[], addMessage: (msg: Message) => void) => Promise<void>;
  // 加载更多历史消息
  onLoadMore?: () => Promise<Message[]>;
  // 重试消息
  onRetry?: (messageId: string) => void;
  // 附件上传
  onUploadAttachment?: (file: File) => Promise<string>;
  // checklist 项目变化
  onChecklistChange?: (messageId: string, blockIndex: number, itemId: string, checked: boolean) => void;
}

// ============ Worker Message Types ============

export interface ShikiWorkerRequest {
  id: string;
  code: string;
  language: string;
  theme: string;
}

export interface ShikiWorkerResponse {
  id: string;
  html: string;
  error?: string;
}

export interface MermaidWorkerRequest {
  id: string;
  content: string;
  theme: string;
}

export interface MermaidWorkerResponse {
  id: string;
  svg: string;
  error?: string;
}
