import { Show, createUniqueId, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { FileItem } from './types';

export interface FileIconProps {
  class?: string;
}

type FileIconComponent = Component<FileIconProps>;
type ResolvableFileIcon = Pick<FileItem, 'type' | 'extension' | 'icon'>;
export type FileItemIconRenderer = FileIconComponent | JSX.Element;

const JAVASCRIPT_FILE_EXTENSIONS = new Set(['js', 'jsx', 'mjs', 'cjs']);
const TYPESCRIPT_FILE_EXTENSIONS = new Set(['ts', 'tsx', 'mts', 'cts']);
const SHELL_SCRIPT_FILE_EXTENSIONS = new Set(['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh']);
const CODE_FILE_EXTENSIONS = new Set(['py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'vue', 'svelte']);
const IMAGE_FILE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']);
const DOCUMENT_FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf']);
const CONFIG_FILE_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env', 'config']);
const STYLE_FILE_EXTENSIONS = new Set(['css', 'scss', 'sass', 'less', 'styl']);

// Folder icon with subtle gradient
export const FolderIcon = (props: FileIconProps) => {
  // Avoid duplicate DOM ids: `url(#...)` references break under repeated hardcoded ids.
  const baseId = createUniqueId();
  const gradientId = `floe-folder-gradient-${baseId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class={props.class}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ 'stop-color': 'var(--warning)', 'stop-opacity': 1 }} />
          <stop
            offset="100%"
            style={{
              'stop-color': 'color-mix(in srgb, var(--warning) 80%, var(--foreground))',
              'stop-opacity': 1,
            }}
          />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M3 5a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293L12 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"
      />
    </svg>
  );
};

// Folder open icon
export const FolderOpenIcon = (props: FileIconProps) => {
  // Avoid duplicate DOM ids: `url(#...)` references break under repeated hardcoded ids.
  const baseId = createUniqueId();
  const gradientId = `floe-folder-open-gradient-${baseId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class={props.class}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ 'stop-color': 'var(--warning)', 'stop-opacity': 1 }} />
          <stop
            offset="100%"
            style={{
              'stop-color': 'color-mix(in srgb, var(--warning) 70%, var(--foreground))',
              'stop-opacity': 1,
            }}
          />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradientId})`}
        d="M5 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7.414A2 2 0 0 0 20.414 6L18 3.586A2 2 0 0 0 16.586 3H5zm4 2h7.586L19 7.414V17H5V5h4z"
      />
      <path
        fill="var(--background)"
        opacity="0.3"
        d="M3 8l4-3h14l-4 3H3z"
      />
    </svg>
  );
};

// Generic file icon
export const FileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class={props.class}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// Code file icon (TypeScript, JavaScript, etc.)
export const CodeFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--info)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--info)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--info)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <path
      fill="none"
      stroke="var(--info)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="m10 13-2 2 2 2m4-4 2 2-2 2"
    />
  </svg>
);

export const JavaScriptFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--warning)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <path
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M10 12v4a1.5 1.5 0 0 1-3 0"
    />
    <path
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17 12h-2.25a1.25 1.25 0 0 0 0 2.5h1.5a1.25 1.25 0 0 1 0 2.5H14a1.25 1.25 0 0 1-1.25-1.25"
    />
  </svg>
);

export const TypeScriptFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--primary)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <path
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M8 12h5m-2.5 0v5"
    />
    <path
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M17 12h-2.25a1.25 1.25 0 0 0 0 2.5h1.5a1.25 1.25 0 0 1 0 2.5H14a1.25 1.25 0 0 1-1.25-1.25"
    />
  </svg>
);

// Shell script file icon (.sh, .bash, .zsh, etc.)
export const ShellScriptFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--success)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <polyline
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="8 13 11 15 8 17"
    />
    <line x1="13" y1="17" x2="16.5" y2="17" stroke="var(--success)" stroke-width="1.5" stroke-linecap="round" />
  </svg>
);

// Image file icon
export const ImageFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--success)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <circle cx="10" cy="13" r="2" fill="var(--success)" />
    <path
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="m20 17-3-3-4 4-2-2-5 3"
    />
  </svg>
);

// Document file icon (PDF, DOC, etc.)
export const DocumentFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--error)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--error)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--error)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <line x1="8" y1="13" x2="16" y2="13" stroke="var(--error)" stroke-width="1.5" stroke-linecap="round" />
    <line x1="8" y1="17" x2="14" y2="17" stroke="var(--error)" stroke-width="1.5" stroke-linecap="round" />
  </svg>
);

// Config/JSON file icon
export const ConfigFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--warning)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <path
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M10 12v4h2m-2-4h2l2 4"
    />
  </svg>
);

// Style file icon (CSS, SCSS, etc.)
export const StyleFileIcon = (props: FileIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    class={props.class}
  >
    <path
      fill="var(--primary)"
      opacity="0.2"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
    />
    <path
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    />
    <polyline
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      points="14 2 14 8 20 8"
    />
    <path
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9 14h6m-3-3v6"
    />
  </svg>
);

// Get appropriate icon based on file extension
export function getFileIcon(extension?: string): FileIconComponent {
  const ext = extension?.toLowerCase();

  if (ext && JAVASCRIPT_FILE_EXTENSIONS.has(ext)) {
    return JavaScriptFileIcon;
  }

  if (ext && TYPESCRIPT_FILE_EXTENSIONS.has(ext)) {
    return TypeScriptFileIcon;
  }

  if (ext && SHELL_SCRIPT_FILE_EXTENSIONS.has(ext)) {
    return ShellScriptFileIcon;
  }

  if (ext && CODE_FILE_EXTENSIONS.has(ext)) {
    return CodeFileIcon;
  }

  if (ext && IMAGE_FILE_EXTENSIONS.has(ext)) {
    return ImageFileIcon;
  }

  if (ext && DOCUMENT_FILE_EXTENSIONS.has(ext)) {
    return DocumentFileIcon;
  }

  if (ext && CONFIG_FILE_EXTENSIONS.has(ext)) {
    return ConfigFileIcon;
  }

  if (ext && STYLE_FILE_EXTENSIONS.has(ext)) {
    return StyleFileIcon;
  }

  return FileIcon;
}

export function resolveFileItemIcon(item: ResolvableFileIcon): FileItemIconRenderer {
  if (item.type === 'folder') {
    return FolderIcon;
  }

  if (item.icon) {
    return item.icon;
  }

  return getFileIcon(item.extension);
}

export function FileItemIcon(props: { item: ResolvableFileIcon; class?: string }) {
  const icon = () => resolveFileItemIcon(props.item);

  return (
    <Show
      when={typeof icon() === 'function'}
      fallback={(
        <span class={`inline-flex items-center justify-center ${props.class ?? ''}`.trim()}>
          {icon() as JSX.Element}
        </span>
      )}
    >
      <Dynamic component={icon() as FileIconComponent} class={props.class} />
    </Show>
  );
}
