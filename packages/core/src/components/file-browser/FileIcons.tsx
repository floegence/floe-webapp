import { Show, createUniqueId, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { FileItem } from './types';

export interface FileIconProps {
  class?: string;
}

type FileIconComponent = Component<FileIconProps>;
type CodeBadgeTone = 'warning' | 'primary' | 'info' | 'success' | 'error' | 'neutral';
type CodeBadgeSpec = {
  label: string;
  tone: CodeBadgeTone;
};
type ResolvableFileIcon = Pick<FileItem, 'name' | 'type' | 'extension' | 'icon'>;
export type FileItemIconRenderer = FileIconComponent | JSX.Element;

const IMAGE_FILE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp']);
const DOCUMENT_FILE_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'rtf']);
const CONFIG_FILE_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'env', 'config', 'cfg', 'conf', 'properties']);
const STYLE_FILE_EXTENSIONS = new Set(['css', 'scss', 'sass', 'less', 'styl']);
const GENERIC_CODE_FILE_EXTENSIONS = new Set([
  'clj',
  'cljs',
  'cljc',
  'coffee',
  'elm',
  'erl',
  'ex',
  'exs',
  'haml',
  'handlebars',
  'hbs',
  'heex',
  'hrl',
  'jinja',
  'jinja2',
  'jl',
  'lisp',
  'liquid',
  'm',
  'mm',
  'ml',
  'mli',
  'nim',
  'proto',
  'slim',
  'twig',
  'zig',
]);

const FILE_SHELL_PATH = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z';
const FILE_SHELL_CORNER_POINTS = '14 2 14 8 20 8';
const CODE_BADGE_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const CODE_BADGE_TONE_COLOR: Record<CodeBadgeTone, string> = {
  warning: 'var(--warning)',
  primary: 'var(--primary)',
  info: 'var(--info)',
  success: 'var(--success)',
  error: 'var(--error)',
  neutral: 'color-mix(in srgb, var(--foreground) 70%, var(--background))',
};

const JAVASCRIPT_BADGE_SPEC = { label: 'JS', tone: 'warning' } as const satisfies CodeBadgeSpec;
const TYPESCRIPT_BADGE_SPEC = { label: 'TS', tone: 'primary' } as const satisfies CodeBadgeSpec;
const SHELL_BADGE_SPEC = { label: 'SH', tone: 'success' } as const satisfies CodeBadgeSpec;
const PYTHON_BADGE_SPEC = { label: 'PY', tone: 'info' } as const satisfies CodeBadgeSpec;
const RUBY_BADGE_SPEC = { label: 'RB', tone: 'error' } as const satisfies CodeBadgeSpec;
const GO_BADGE_SPEC = { label: 'GO', tone: 'info' } as const satisfies CodeBadgeSpec;
const RUST_BADGE_SPEC = { label: 'RS', tone: 'error' } as const satisfies CodeBadgeSpec;
const JAVA_BADGE_SPEC = { label: 'JAVA', tone: 'warning' } as const satisfies CodeBadgeSpec;
const KOTLIN_BADGE_SPEC = { label: 'KT', tone: 'primary' } as const satisfies CodeBadgeSpec;
const SCALA_BADGE_SPEC = { label: 'SC', tone: 'error' } as const satisfies CodeBadgeSpec;
const C_BADGE_SPEC = { label: 'C', tone: 'neutral' } as const satisfies CodeBadgeSpec;
const CPP_BADGE_SPEC = { label: 'C++', tone: 'neutral' } as const satisfies CodeBadgeSpec;
const CSHARP_BADGE_SPEC = { label: 'C#', tone: 'primary' } as const satisfies CodeBadgeSpec;
const FSHARP_BADGE_SPEC = { label: 'F#', tone: 'info' } as const satisfies CodeBadgeSpec;
const PHP_BADGE_SPEC = { label: 'PHP', tone: 'primary' } as const satisfies CodeBadgeSpec;
const PERL_BADGE_SPEC = { label: 'PL', tone: 'info' } as const satisfies CodeBadgeSpec;
const SWIFT_BADGE_SPEC = { label: 'SW', tone: 'error' } as const satisfies CodeBadgeSpec;
const LUA_BADGE_SPEC = { label: 'LUA', tone: 'warning' } as const satisfies CodeBadgeSpec;
const DART_BADGE_SPEC = { label: 'DART', tone: 'info' } as const satisfies CodeBadgeSpec;
const R_BADGE_SPEC = { label: 'R', tone: 'info' } as const satisfies CodeBadgeSpec;
const SQL_BADGE_SPEC = { label: 'SQL', tone: 'warning' } as const satisfies CodeBadgeSpec;
const GRAPHQL_BADGE_SPEC = { label: 'GQL', tone: 'primary' } as const satisfies CodeBadgeSpec;
const GROOVY_BADGE_SPEC = { label: 'GRV', tone: 'success' } as const satisfies CodeBadgeSpec;
const HTML_BADGE_SPEC = { label: 'HTML', tone: 'warning' } as const satisfies CodeBadgeSpec;
const VUE_BADGE_SPEC = { label: 'VUE', tone: 'success' } as const satisfies CodeBadgeSpec;
const SVELTE_BADGE_SPEC = { label: 'SVE', tone: 'error' } as const satisfies CodeBadgeSpec;
const ASTRO_BADGE_SPEC = { label: 'AST', tone: 'warning' } as const satisfies CodeBadgeSpec;
const MDX_BADGE_SPEC = { label: 'MDX', tone: 'primary' } as const satisfies CodeBadgeSpec;
const DOCKER_BADGE_SPEC = { label: 'DKR', tone: 'info' } as const satisfies CodeBadgeSpec;
const MAKE_BADGE_SPEC = { label: 'MAKE', tone: 'warning' } as const satisfies CodeBadgeSpec;
const CMAKE_BADGE_SPEC = { label: 'CMK', tone: 'primary' } as const satisfies CodeBadgeSpec;
const POWERSHELL_BADGE_SPEC = { label: 'PS', tone: 'primary' } as const satisfies CodeBadgeSpec;
const BATCH_BADGE_SPEC = { label: 'BAT', tone: 'neutral' } as const satisfies CodeBadgeSpec;

const CODE_BADGE_BY_EXTENSION = new Map<string, CodeBadgeSpec>();
const CODE_BADGE_BY_BASENAME = new Map<string, CodeBadgeSpec>();
const CODE_BADGE_BY_BASENAME_PREFIX = new Map<string, CodeBadgeSpec>();
const CODE_BADGE_BY_BASENAME_SUFFIX = new Map<string, CodeBadgeSpec>();
const CODE_BADGE_ICON_CACHE = new Map<string, FileIconComponent>();

registerCodeBadge(JAVASCRIPT_BADGE_SPEC, ['js', 'jsx', 'mjs', 'cjs']);
registerCodeBadge(TYPESCRIPT_BADGE_SPEC, ['ts', 'tsx', 'mts', 'cts']);
registerCodeBadge(SHELL_BADGE_SPEC, ['sh', 'bash', 'zsh', 'fish', 'ksh', 'csh']);
registerCodeBadge(PYTHON_BADGE_SPEC, ['py', 'pyi', 'pyw']);
registerCodeBadge(RUBY_BADGE_SPEC, ['rb', 'rake', 'gemspec', 'erb']);
registerCodeBadge(GO_BADGE_SPEC, ['go']);
registerCodeBadge(RUST_BADGE_SPEC, ['rs']);
registerCodeBadge(JAVA_BADGE_SPEC, ['java']);
registerCodeBadge(KOTLIN_BADGE_SPEC, ['kt', 'kts']);
registerCodeBadge(SCALA_BADGE_SPEC, ['scala', 'sc']);
registerCodeBadge(C_BADGE_SPEC, ['c', 'h']);
registerCodeBadge(CPP_BADGE_SPEC, ['cc', 'cp', 'cpp', 'cxx', 'hh', 'hpp', 'hxx']);
registerCodeBadge(CSHARP_BADGE_SPEC, ['cs']);
registerCodeBadge(FSHARP_BADGE_SPEC, ['fs', 'fsi', 'fsx']);
registerCodeBadge(PHP_BADGE_SPEC, ['php', 'phtml']);
registerCodeBadge(PERL_BADGE_SPEC, ['pl', 'pm']);
registerCodeBadge(SWIFT_BADGE_SPEC, ['swift']);
registerCodeBadge(LUA_BADGE_SPEC, ['lua']);
registerCodeBadge(DART_BADGE_SPEC, ['dart']);
registerCodeBadge(R_BADGE_SPEC, ['r']);
registerCodeBadge(SQL_BADGE_SPEC, ['sql']);
registerCodeBadge(GRAPHQL_BADGE_SPEC, ['graphql', 'gql']);
registerCodeBadge(GROOVY_BADGE_SPEC, ['groovy', 'gradle', 'gvy']);
registerCodeBadge(HTML_BADGE_SPEC, ['html', 'htm', 'xhtml']);
registerCodeBadge(VUE_BADGE_SPEC, ['vue']);
registerCodeBadge(SVELTE_BADGE_SPEC, ['svelte']);
registerCodeBadge(ASTRO_BADGE_SPEC, ['astro']);
registerCodeBadge(MDX_BADGE_SPEC, ['mdx']);
registerCodeBadge(POWERSHELL_BADGE_SPEC, ['ps1', 'psd1', 'psm1']);
registerCodeBadge(BATCH_BADGE_SPEC, ['bat', 'cmd']);
registerCodeBadge(DOCKER_BADGE_SPEC, ['dockerfile', 'containerfile']);
registerCodeBadge(CMAKE_BADGE_SPEC, ['cmake']);
registerSpecialCodeBadge(DOCKER_BADGE_SPEC, ['dockerfile', 'containerfile']);
registerSpecialCodeBadge(MAKE_BADGE_SPEC, ['makefile', 'gnumakefile', 'justfile']);
registerSpecialCodeBadge(CMAKE_BADGE_SPEC, ['cmakelists.txt']);
registerSpecialCodeBadge(SHELL_BADGE_SPEC, ['.bashrc', '.bash_profile', '.bash_aliases', '.profile', '.zshrc', '.zprofile', '.zshenv', '.zlogin', '.zlogout', '.kshrc', '.cshrc', '.tcshrc', '.envrc']);
registerSpecialCodeBadge(RUBY_BADGE_SPEC, ['gemfile', 'rakefile', 'podfile', 'fastfile', 'appfile', 'brewfile', 'vagrantfile']);
registerSpecialCodeBadge(GROOVY_BADGE_SPEC, ['jenkinsfile']);
registerSpecialCodeBadgePrefix(DOCKER_BADGE_SPEC, ['dockerfile.', 'containerfile.']);
registerSpecialCodeBadgeSuffix(DOCKER_BADGE_SPEC, ['.dockerfile', '.containerfile']);

function registerCodeBadge(spec: CodeBadgeSpec, extensions: string[]) {
  for (const extension of extensions) {
    CODE_BADGE_BY_EXTENSION.set(extension, spec);
  }
}

function registerSpecialCodeBadge(spec: CodeBadgeSpec, basenames: string[]) {
  for (const basename of basenames) {
    CODE_BADGE_BY_BASENAME.set(basename, spec);
  }
}

function registerSpecialCodeBadgePrefix(spec: CodeBadgeSpec, prefixes: string[]) {
  for (const prefix of prefixes) {
    CODE_BADGE_BY_BASENAME_PREFIX.set(prefix, spec);
  }
}

function registerSpecialCodeBadgeSuffix(spec: CodeBadgeSpec, suffixes: string[]) {
  for (const suffix of suffixes) {
    CODE_BADGE_BY_BASENAME_SUFFIX.set(suffix, spec);
  }
}

function normalizeExtension(extension?: string): string | undefined {
  const normalized = extension?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return normalized.startsWith('.') ? normalized.slice(1) : normalized;
}

function getBasename(name?: string): string | undefined {
  const normalized = name?.trim();
  if (!normalized) {
    return undefined;
  }

  const parts = normalized.split(/[\\/]/);
  return parts[parts.length - 1]?.toLowerCase();
}

function getExtensionFromName(name?: string): string | undefined {
  const basename = getBasename(name);
  if (!basename) {
    return undefined;
  }

  const lastDotIndex = basename.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === basename.length - 1) {
    return undefined;
  }

  return basename.slice(lastDotIndex + 1);
}

function getResolvedExtension(item: Pick<FileItem, 'name' | 'extension'>): string | undefined {
  return normalizeExtension(item.extension) ?? getExtensionFromName(item.name);
}

function resolveCodeBadgeSpec(item: Pick<FileItem, 'name' | 'extension'>): CodeBadgeSpec | undefined {
  const basename = getBasename(item.name);
  if (basename) {
    const specialFilenameSpec = CODE_BADGE_BY_BASENAME.get(basename);
    if (specialFilenameSpec) {
      return specialFilenameSpec;
    }

    for (const [prefix, spec] of CODE_BADGE_BY_BASENAME_PREFIX) {
      if (basename.startsWith(prefix)) {
        return spec;
      }
    }

    for (const [suffix, spec] of CODE_BADGE_BY_BASENAME_SUFFIX) {
      if (basename.endsWith(suffix)) {
        return spec;
      }
    }
  }

  const extension = getResolvedExtension(item);
  return extension ? CODE_BADGE_BY_EXTENSION.get(extension) : undefined;
}

function getCodeBadgeFontSize(label: string): string {
  if (label.length <= 2) {
    return '6.2';
  }
  if (label.length === 3) {
    return '5.3';
  }
  if (label.length === 4) {
    return '4.5';
  }
  return '4';
}

function createCodeBadgeIcon(spec: CodeBadgeSpec): FileIconComponent {
  return (props) => <CodeBadgeFileIcon class={props.class} spec={spec} />;
}

function getCodeBadgeIcon(spec: CodeBadgeSpec): FileIconComponent {
  const cacheKey = `${spec.tone}:${spec.label}`;
  const cached = CODE_BADGE_ICON_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const icon = createCodeBadgeIcon(spec);
  CODE_BADGE_ICON_CACHE.set(cacheKey, icon);
  return icon;
}

interface FileShellIconProps extends FileIconProps {
  accent?: string;
  fillOpacity?: number | string;
  children?: JSX.Element;
}

const FileShellIcon = (props: FileShellIconProps) => {
  const accent = () => props.accent ?? 'currentColor';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      class={props.class}
    >
      <Show when={props.accent}>
        <path fill={accent()} opacity={props.fillOpacity ?? 0.18} d={FILE_SHELL_PATH} />
      </Show>
      <path
        fill="none"
        stroke={accent()}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        d={FILE_SHELL_PATH}
      />
      <polyline
        fill="none"
        stroke={accent()}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        points={FILE_SHELL_CORNER_POINTS}
      />
      {props.children}
    </svg>
  );
};

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
  <FileShellIcon class={props.class} />
);

// Generic code file icon fallback for known code-like extensions without a dedicated badge.
export const CodeFileIcon = (props: FileIconProps) => (
  <FileShellIcon class={props.class} accent="var(--info)">
    <path
      fill="none"
      stroke="var(--info)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="m10 13-2 2 2 2m4-4 2 2-2 2"
    />
  </FileShellIcon>
);

interface CodeBadgeFileIconProps extends FileIconProps {
  spec: CodeBadgeSpec;
}

const CodeBadgeFileIcon = (props: CodeBadgeFileIconProps) => {
  const accent = () => CODE_BADGE_TONE_COLOR[props.spec.tone];
  const fontSize = () => getCodeBadgeFontSize(props.spec.label);
  const letterSpacing = () => (props.spec.label.length > 3 ? '0.02em' : '0.04em');

  return (
    <FileShellIcon class={props.class} accent={accent()}>
      <g data-code-badge-label={props.spec.label} data-code-badge-tone={props.spec.tone}>
        <rect
          x="5"
          y="13.5"
          width="14"
          height="5.75"
          rx="1.8"
          fill={accent()}
          opacity="0.12"
          stroke={accent()}
          stroke-width="1"
        />
        <text
          x="12"
          y="17.45"
          fill={accent()}
          font-size={fontSize()}
          font-weight="700"
          text-anchor="middle"
          style={{
            'font-family': CODE_BADGE_FONT_STACK,
            'letter-spacing': letterSpacing(),
          }}
        >
          {props.spec.label}
        </text>
      </g>
    </FileShellIcon>
  );
};

export const JavaScriptFileIcon = getCodeBadgeIcon(JAVASCRIPT_BADGE_SPEC);
export const TypeScriptFileIcon = getCodeBadgeIcon(TYPESCRIPT_BADGE_SPEC);
export const ShellScriptFileIcon = getCodeBadgeIcon(SHELL_BADGE_SPEC);

// Image file icon
export const ImageFileIcon = (props: FileIconProps) => (
  <FileShellIcon class={props.class} accent="var(--success)">
    <circle cx="10" cy="13" r="2" fill="var(--success)" />
    <path
      fill="none"
      stroke="var(--success)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="m20 17-3-3-4 4-2-2-5 3"
    />
  </FileShellIcon>
);

// Document file icon (PDF, DOC, etc.)
export const DocumentFileIcon = (props: FileIconProps) => (
  <FileShellIcon class={props.class} accent="var(--error)">
    <line x1="8" y1="13" x2="16" y2="13" stroke="var(--error)" stroke-width="1.5" stroke-linecap="round" />
    <line x1="8" y1="17" x2="14" y2="17" stroke="var(--error)" stroke-width="1.5" stroke-linecap="round" />
  </FileShellIcon>
);

// Config/JSON file icon
export const ConfigFileIcon = (props: FileIconProps) => (
  <FileShellIcon class={props.class} accent="var(--warning)">
    <path
      fill="none"
      stroke="var(--warning)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M10 12v4h2m-2-4h2l2 4"
    />
  </FileShellIcon>
);

// Style file icon (CSS, SCSS, etc.)
export const StyleFileIcon = (props: FileIconProps) => (
  <FileShellIcon class={props.class} accent="var(--primary)">
    <path
      fill="none"
      stroke="var(--primary)"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M9 14h6m-3-3v6"
    />
  </FileShellIcon>
);

// Get appropriate icon based on file extension.
export function getFileIcon(extension?: string): FileIconComponent {
  const normalizedExtension = normalizeExtension(extension);

  if (normalizedExtension) {
    const codeBadgeSpec = CODE_BADGE_BY_EXTENSION.get(normalizedExtension);
    if (codeBadgeSpec) {
      return getCodeBadgeIcon(codeBadgeSpec);
    }
  }

  if (normalizedExtension && GENERIC_CODE_FILE_EXTENSIONS.has(normalizedExtension)) {
    return CodeFileIcon;
  }

  if (normalizedExtension && IMAGE_FILE_EXTENSIONS.has(normalizedExtension)) {
    return ImageFileIcon;
  }

  if (normalizedExtension && DOCUMENT_FILE_EXTENSIONS.has(normalizedExtension)) {
    return DocumentFileIcon;
  }

  if (normalizedExtension && CONFIG_FILE_EXTENSIONS.has(normalizedExtension)) {
    return ConfigFileIcon;
  }

  if (normalizedExtension && STYLE_FILE_EXTENSIONS.has(normalizedExtension)) {
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

  const codeBadgeSpec = resolveCodeBadgeSpec(item);
  if (codeBadgeSpec) {
    return getCodeBadgeIcon(codeBadgeSpec);
  }

  return getFileIcon(getResolvedExtension(item));
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
