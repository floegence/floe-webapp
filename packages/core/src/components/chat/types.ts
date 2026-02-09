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

// Tool call block (supports nesting)
export interface ToolCallBlock {
  type: 'tool-call';
  toolName: string;
  toolId: string;
  args: Record<string, unknown>;
  // Whether this tool call requires explicit user approval before executing.
  requiresApproval?: boolean;
  approvalState?: 'required' | 'approved' | 'rejected';
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
  | 'sending'     // User message is sending
  | 'streaming'   // Assistant is streaming
  | 'complete'    // Complete
  | 'error';      // Error

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
  // Replace an existing block (used for structured/non-text blocks updates).
  | { type: 'block-set'; messageId: string; blockIndex: number; block: MessageBlock }
  | { type: 'block-end'; messageId: string; blockIndex: number }
  | { type: 'message-end'; messageId: string }
  | { type: 'error'; messageId: string; error: string };

// ============ Virtual List Config ============

export interface VirtualListConfig {
  // Render window (overscan)
  overscan: number;
  // Data windows
  hotWindow: number;
  warmWindow: number;
  // Loading strategy
  loadBatchSize: number;
  loadThreshold: number;
  // Height estimation
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
  // Virtual list config
  virtualList?: Partial<VirtualListConfig>;
  // User avatar
  userAvatar?: string;
  // Assistant avatar
  assistantAvatar?: string;
  // Placeholder text
  placeholder?: string;
  // Whether attachments are allowed
  allowAttachments?: boolean;
  // Accepted attachment types
  acceptedFileTypes?: string;
  // Max attachment size (bytes)
  maxAttachmentSize?: number;
  // Max attachment count
  maxAttachments?: number;
}

export interface ChatCallbacks {
  // Synchronous hook fired right after the optimistic user message is rendered,
  // before the async onSendMessage callback is deferred. Use this for immediate
  // UI side effects (e.g. scroll/telemetry). Working state should rely on
  // ChatContext.isWorking / isPreparing instead of this callback.
  onWillSend?: (content: string, attachments: Attachment[]) => void;
  // Send message - addMessage allows the host to append assistant messages.
  onSendMessage?: (content: string, attachments: Attachment[], addMessage: (msg: Message) => void) => Promise<void>;
  // Load more history messages
  onLoadMore?: () => Promise<Message[]>;
  // Retry message
  onRetry?: (messageId: string) => void;
  // Attachment upload
  onUploadAttachment?: (file: File) => Promise<string>;
  // Tool approval (e.g. dangerous actions)
  onToolApproval?: (messageId: string, toolId: string, approved: boolean) => Promise<void> | void;
  // Checklist item change
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

export interface MarkdownWorkerRequest {
  id: string;
  content: string;
}

export interface MarkdownWorkerResponse {
  id: string;
  html: string;
  error?: string;
}

// ============ Code Diff Render Model (Serializable) ============

export interface UnifiedDiffLine {
  type: 'context' | 'added' | 'removed';
  sign: ' ' | '+' | '-';
  /** Simplified single-column line numbers (context lines only). */
  lineNumber: number | null;
  content: string;
}

export interface SplitDiffLine {
  type: 'context' | 'added' | 'removed' | 'empty';
  lineNumber: number | null;
  content: string;
}

export interface CodeDiffRenderModel {
  unifiedLines: UnifiedDiffLine[];
  split: { left: SplitDiffLine[]; right: SplitDiffLine[] };
  stats: { added: number; removed: number };
}

export interface DiffWorkerRequest {
  id: string;
  oldCode: string;
  newCode: string;
}

export interface DiffWorkerResponse {
  id: string;
  model: CodeDiffRenderModel;
  error?: string;
}
