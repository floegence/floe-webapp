import { type Component, createSignal, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import { useChatContext } from '../ChatProvider';
import { useAttachments } from '../hooks/useAttachments';
import { AttachmentPreview } from './AttachmentPreview';

export interface ChatInputProps {
  class?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: Component<ChatInputProps> = (props) => {
  const ctx = useChatContext();
  const [text, setText] = createSignal('');
  const [isFocused, setIsFocused] = createSignal(false);

  let textareaRef: HTMLTextAreaElement | undefined;

  const attachments = useAttachments({
    maxAttachments: ctx.config().maxAttachments,
    maxSize: ctx.config().maxAttachmentSize,
    acceptedTypes: ctx.config().acceptedFileTypes,
    onUpload: ctx.config().allowAttachments
      ? async (file) => {
          // 调用外部上传回调（如果有的话）
          // 这里返回模拟 URL
          return URL.createObjectURL(file);
        }
      : undefined,
  });

  const placeholder = () =>
    props.placeholder || ctx.config().placeholder || 'Type a message...';

  const canSend = () =>
    (text().trim() || attachments.attachments().length > 0) && !props.disabled;

  // 自动调整高度
  const adjustHeight = () => {
    if (!textareaRef) return;
    textareaRef.style.height = 'auto';
    textareaRef.style.height = `${Math.min(textareaRef.scrollHeight, 200)}px`;
  };

  const handleInput = (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => {
    setText(e.currentTarget.value);
    adjustHeight();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Enter 发送（Shift+Enter 换行）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    if (!canSend()) return;

    const content = text().trim();
    const files = attachments.attachments();

    setText('');
    attachments.clearAttachments();

    if (textareaRef) {
      textareaRef.style.height = 'auto';
    }

    await ctx.sendMessage(content, files);
  };

  const handlePaste = async (e: ClipboardEvent) => {
    if (!ctx.config().allowAttachments) return;
    await attachments.handlePaste(e);
  };

  return (
    <div
      class={cn(
        'chat-input-container',
        isFocused() && 'chat-input-container-focused',
        attachments.isDragging() && 'chat-input-container-dragging',
        props.class
      )}
      onDragEnter={attachments.handleDragEnter}
      onDragLeave={attachments.handleDragLeave}
      onDragOver={attachments.handleDragOver}
      onDrop={attachments.handleDrop}
    >
      {/* 拖拽提示 */}
      <Show when={attachments.isDragging()}>
        <div class="chat-input-drop-overlay">
          <UploadIcon />
          <span>Drop files here</span>
        </div>
      </Show>

      {/* 附件预览 */}
      <Show when={attachments.attachments().length > 0}>
        <AttachmentPreview
          attachments={attachments.attachments()}
          onRemove={attachments.removeAttachment}
        />
      </Show>

      {/* 输入区域 */}
      <div class="chat-input-row">
        {/* 附件按钮 */}
        <Show when={ctx.config().allowAttachments}>
          <button
            type="button"
            class="chat-input-attachment-btn"
            onClick={attachments.openFilePicker}
            title="Add attachments"
          >
            <PaperclipIcon />
          </button>
        </Show>

        {/* 文本输入 */}
        <textarea
          ref={textareaRef}
          class="chat-input-textarea"
          value={text()}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder()}
          disabled={props.disabled}
          rows={1}
        />

        {/* 发送按钮 */}
        <button
          type="button"
          class={cn('chat-input-send-btn', canSend() && 'chat-input-send-btn-active')}
          onClick={handleSend}
          disabled={!canSend()}
          title="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

// 图标组件
const PaperclipIcon: Component = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const SendIcon: Component = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const UploadIcon: Component = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
