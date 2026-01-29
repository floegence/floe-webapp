import { type Component, Show } from 'solid-js';
import { cn } from '../../../utils/cn';

export interface FileBlockProps {
  name: string;
  size: number;
  mimeType: string;
  url?: string;
  class?: string;
}

export const FileBlock: Component<FileBlockProps> = (props) => {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦';
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) return '📝';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📃';
    return '📁';
  };

  const handleDownload = () => {
    if (props.url) {
      window.open(props.url, '_blank');
    }
  };

  return (
    <div class={cn('chat-file-block', props.class)} onClick={handleDownload}>
      <div class="chat-file-icon">
        {getFileIcon(props.mimeType)}
      </div>
      <div class="chat-file-info">
        <div class="chat-file-name" title={props.name}>
          {props.name}
        </div>
        <div class="chat-file-meta">
          <span class="chat-file-size">{formatSize(props.size)}</span>
        </div>
      </div>
      <Show when={props.url}>
        <div class="chat-file-download">
          <DownloadIcon />
        </div>
      </Show>
    </div>
  );
};

const DownloadIcon: Component = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
