import { Show, createUniqueId, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import type { FileItem } from './types';
import {
  fileIconCatalog,
  fileIconDefinition,
  fileIconForExtension,
  resolveFileIconDefinition,
  type FileIconDefinition,
} from './fileIconCatalog';
import { fileIconArtwork } from './fileIconArtwork.generated';

export interface FileIconProps {
  class?: string;
  /** Rendered pixel size; 20 px and below use the approved compact artwork. */
  size?: number;
}
type FileIconComponent = Component<FileIconProps>;
type ResolvableFileIcon = Pick<FileItem, 'name' | 'type' | 'extension' | 'icon' | 'link'>;
export type FileItemIconRenderer = FileIconComponent | JSX.Element;
export interface ResolveFileItemIconOptions {
  open?: boolean;
}
type LinkTarget = NonNullable<FileItem['link']>['targetType'];

function LinkDecoration(props: { target: LinkTarget }) {
  const color = () => (props.target === 'broken' ? 'var(--error)' : 'var(--foreground)');
  return (
    <g
      transform="translate(1 1)"
      data-file-link-kind="symbolic"
      data-file-link-target-type={props.target}
    >
      <circle cx="37" cy="37" r="9" fill="var(--background)" stroke={color()} stroke-width="2" />
      <path
        d="M32 37h9m0 0-4-4m4 4-4 4"
        fill="none"
        stroke={color()}
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <Show when={props.target === 'broken'}>
        <path d="m31 31 12 12" stroke={color()} stroke-width="2.4" />
      </Show>
    </g>
  );
}

function CatalogIcon(
  props: FileIconProps & { definition: FileIconDefinition; open?: boolean; link?: LinkTarget }
) {
  const id = `floe-file-${createUniqueId()}`;
  const size = () => props.size ?? 24;
  const palette = () => props.definition.palette ?? {};
  const color = () =>
    palette().darkPrimary
      ? 'var(--floe-icon-monochrome)'
      : palette().primary || `var(--floe-icon-${props.definition.tone})`;
  const artwork = () =>
    fileIconArtwork[
      props.definition.id + (props.definition.id === 'folder' && props.open ? '-open' : '')
    ];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size()}
      height={size()}
      fill="none"
      class={props.class}
      aria-hidden="true"
      data-file-icon-type={props.definition.id}
      data-file-icon-kind={
        props.definition.category === 'archive' ? 'archive' : props.definition.id
      }
      data-file-icon-size={size() <= 20 ? 'compact' : 'detailed'}
      data-file-icon-open={props.open || undefined}
      data-file-link-kind={props.link ? 'symbolic' : undefined}
      data-file-link-target-type={props.link}
    >
      <defs>
        <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0" y2="1">
          <stop stop-color="var(--floe-icon-paper-top)" />
          <stop offset="1" stop-color="var(--floe-icon-paper-bottom)" />
        </linearGradient>
        <linearGradient id={`${id}-color`} x1="0" y1="0" x2=".75" y2="1">
          <stop stop-color={palette().gradientStart || color()} />
          <stop
            offset="1"
            stop-color={palette().gradientEnd || color()}
            stop-opacity={palette().primary ? 1 : 0.83}
          />
        </linearGradient>
      </defs>
      <Dynamic component={artwork()} id={id} compact={size() <= 20} />
      <Show when={props.link}>
        <LinkDecoration target={props.link!} />
      </Show>
    </svg>
  );
}

const components = new Map<string, FileIconComponent>(
  fileIconCatalog.map((definition) => [
    definition.id,
    (props) => <CatalogIcon {...props} definition={definition} />,
  ])
);
const componentFor = (definition: FileIconDefinition): FileIconComponent =>
  components.get(definition.id)!;
export const FolderIcon = componentFor(fileIconDefinition('folder'));
export const FolderOpenIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('folder')} open />
);
export const SymlinkFolderIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('folder')} link="folder" />
);
export const SymlinkFolderOpenIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('folder')} link="folder" open />
);
const BrokenSymlinkFolderIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('folder')} link="broken" />
);
const BrokenSymlinkFolderOpenIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('folder')} link="broken" open />
);
export const FileIcon = componentFor(fileIconDefinition('file'));
export const SymlinkFileIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('file')} link="file" />
);
export const BrokenSymlinkIcon: FileIconComponent = (props) => (
  <CatalogIcon {...props} definition={fileIconDefinition('file')} link="broken" />
);
export const ArchiveFileIcon = componentFor(fileIconDefinition('archive'));
export const CodeFileIcon = componentFor(fileIconDefinition('code'));
export const JavaScriptFileIcon = componentFor(fileIconDefinition('js'));
export const TypeScriptFileIcon = componentFor(fileIconDefinition('ts'));
export const ShellScriptFileIcon = componentFor(fileIconDefinition('shell'));
export const ImageFileIcon = componentFor(fileIconDefinition('image'));
export const VideoFileIcon = componentFor(fileIconDefinition('video'));
export const AudioFileIcon = componentFor(fileIconDefinition('audio'));
export const DocumentFileIcon = componentFor(fileIconDefinition('pdf'));
export const ConfigFileIcon = componentFor(fileIconDefinition('json'));
export const StyleFileIcon = componentFor(fileIconDefinition('css'));

export function getFileIcon(extension?: string): FileIconComponent {
  return componentFor(fileIconForExtension(extension));
}

export function resolveFileItemIcon(
  item: ResolvableFileIcon,
  options: ResolveFileItemIconOptions = {}
): FileItemIconRenderer {
  if (item.icon) return item.icon;
  const link = item.link?.kind === 'symbolic' ? item.link.targetType : undefined;
  if (item.type === 'folder') {
    if (link === 'broken')
      return options.open ? BrokenSymlinkFolderOpenIcon : BrokenSymlinkFolderIcon;
    if (link) return options.open ? SymlinkFolderOpenIcon : SymlinkFolderIcon;
    const definition = resolveFileIconDefinition(item.name, true);
    if (definition.id !== 'folder') return componentFor(definition);
    return options.open ? FolderOpenIcon : FolderIcon;
  }
  if (link === 'broken') return BrokenSymlinkIcon;
  if (link) return SymlinkFileIcon;
  return componentFor(resolveFileIconDefinition(item.name, false, item.extension));
}

export function FileItemIcon(props: FileIconProps & { item: ResolvableFileIcon; open?: boolean }) {
  const icon = () => resolveFileItemIcon(props.item, { open: props.open });
  return (
    <Show
      when={typeof icon() === 'function'}
      fallback={
        <span class={`inline-flex items-center justify-center ${props.class ?? ''}`.trim()}>
          {icon() as JSX.Element}
        </span>
      }
    >
      <Dynamic component={icon() as FileIconComponent} class={props.class} size={props.size} />
    </Show>
  );
}
