import { createUniqueId, type JSX } from 'solid-js';

interface FileIconProps {
  class?: string;
}

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
export function getFileIcon(extension?: string): (props: FileIconProps) => JSX.Element {
  const ext = extension?.toLowerCase();

  // Code files
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp', 'vue', 'svelte'].includes(ext ?? '')) {
    return CodeFileIcon;
  }

  // Image files
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext ?? '')) {
    return ImageFileIcon;
  }

  // Document files
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf'].includes(ext ?? '')) {
    return DocumentFileIcon;
  }

  // Config files
  if (['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env', 'config'].includes(ext ?? '')) {
    return ConfigFileIcon;
  }

  // Style files
  if (['css', 'scss', 'sass', 'less', 'styl'].includes(ext ?? '')) {
    return StyleFileIcon;
  }

  return FileIcon;
}
