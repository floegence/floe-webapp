import { type Component, For, Show } from 'solid-js';
import { cn } from '../../../utils/cn';
import type { Attachment } from '../types';

export interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  class?: string;
}

export const AttachmentPreview: Component<AttachmentPreviewProps> = (props) => {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div class={cn('chat-attachment-preview', props.class)}>
      <For each={props.attachments}>
        {(attachment) => (
          <div
            class={cn(
              'chat-attachment-item',
              attachment.status === 'error' && 'chat-attachment-item-error'
            )}
          >
            {/* Image preview */}
            <Show
              when={attachment.type === 'image' && attachment.preview}
              fallback={
                <div class="chat-attachment-file-icon">
                  <FileIcon />
                </div>
              }
            >
              <img
                src={attachment.preview}
                alt={attachment.file.name}
                class="chat-attachment-image"
              />
            </Show>

            {/* Info */}
            <div class="chat-attachment-info">
              <div class="chat-attachment-name" title={attachment.file.name}>
                {attachment.file.name}
              </div>
              <div class="chat-attachment-size">
                {formatSize(attachment.file.size)}
              </div>
            </div>

            {/* Upload progress */}
            <Show when={attachment.status === 'uploading'}>
              <div class="chat-attachment-progress">
                <div
                  class="chat-attachment-progress-bar"
                  style={{ width: `${attachment.uploadProgress}%` }}
                />
              </div>
            </Show>

            {/* Error indicator */}
            <Show when={attachment.status === 'error'}>
              <div class="chat-attachment-error" title={attachment.error}>
                <ErrorIcon />
              </div>
            </Show>

            {/* Remove button */}
            <button
              type="button"
              class="chat-attachment-remove-btn"
              onClick={() => props.onRemove(attachment.id)}
              title="Remove"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </For>
    </div>
  );
};

const FileIcon: Component = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const CloseIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ErrorIcon: Component = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
