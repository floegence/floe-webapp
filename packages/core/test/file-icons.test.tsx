import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import type { FileItem } from '../src/components/file-browser/types';
import {
  CodeFileIcon,
  ConfigFileIcon,
  AudioFileIcon,
  ArchiveFileIcon,
  BrokenSymlinkIcon,
  DocumentFileIcon,
  FileIcon,
  FileItemIcon,
  FolderIcon,
  FolderOpenIcon,
  ImageFileIcon,
  JavaScriptFileIcon,
  ShellScriptFileIcon,
  StyleFileIcon,
  SymlinkFileIcon,
  SymlinkFolderIcon,
  SymlinkFolderOpenIcon,
  TypeScriptFileIcon,
  VideoFileIcon,
  getFileIcon,
  resolveFileItemIcon,
} from '../src/components/file-browser/FileIcons';
import { classifyArchiveFileName } from '../src/components/file-browser/archiveFiles';

function extractAll(re: RegExp, input: string): string[] {
  return Array.from(input.matchAll(re), (m) => m[1] ?? '');
}

function renderItemIcon(item: FileItem, options: { open?: boolean } = {}): string {
  return renderToString(() => <FileItemIcon item={item} open={options.open} class="w-4 h-4" />);
}

function expectIcon(html: string, type: string): void {
  expect(html).toContain(`data-file-icon-type="${type}"`);
  expect(html).not.toContain('<text');
}

describe('file icons', () => {
  it('FolderIcon should generate unique gradient ids per instance', () => {
    const html = renderToString(() => (
      <>
        <FolderIcon class="w-4 h-4" />
        <FolderIcon class="w-4 h-4" />
        <FolderIcon class="w-4 h-4" />
      </>
    ));

    expect(html).not.toContain('id="folder-gradient"');
    expect(html).not.toContain('url(#folder-gradient)');

    const ids = extractAll(/id="(floe-file-[^"]+-color)"/g, html);
    const fills = extractAll(/fill=(?:")?url\(#(floe-file-[^")\s>]+)\)(?:")?/g, html);

    expect(ids.length).toBe(3);
    expect(fills.length).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of fills) {
      expect(ids).toContain(id);
    }
  });

  it('FolderOpenIcon should generate unique gradient ids per instance', () => {
    const html = renderToString(() => (
      <>
        <FolderOpenIcon class="w-4 h-4" />
        <FolderOpenIcon class="w-4 h-4" />
      </>
    ));

    expect(html).not.toContain('id="folder-open-gradient"');
    expect(html).not.toContain('url(#folder-open-gradient)');

    const ids = extractAll(/id="(floe-file-[^"]+-color)"/g, html);
    const fills = extractAll(/fill=(?:")?url\(#(floe-file-[^")\s>]+)\)(?:")?/g, html);

    expect(ids.length).toBe(2);
    expect(fills.length).toBe(2);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of fills) {
      expect(ids).toContain(id);
    }
  });

  it('getFileIcon should keep dedicated language families for public extension lookups', () => {
    expect(getFileIcon('sh')).toBe(ShellScriptFileIcon);
    expect(getFileIcon('js')).toBe(JavaScriptFileIcon);
    expect(getFileIcon('mjs')).toBe(JavaScriptFileIcon);
    expect(getFileIcon('ts')).toBe(TypeScriptFileIcon);
    expect(getFileIcon('mts')).toBe(TypeScriptFileIcon);
  });

  it('getFileIcon should preserve non-code category icons and generic code fallback', () => {
    expect(getFileIcon('png')).toBe(ImageFileIcon);
    expect(getFileIcon('mp4')).toBe(VideoFileIcon);
    expect(getFileIcon('webm')).toBe(VideoFileIcon);
    expect(getFileIcon('mp3')).toBe(AudioFileIcon);
    expect(getFileIcon('flac')).toBe(AudioFileIcon);
    expect(getFileIcon('pdf')).toBe(DocumentFileIcon);
    expect(getFileIcon('json')).toBe(ConfigFileIcon);
    expect(getFileIcon('css')).toBe(StyleFileIcon);
    expect(getFileIcon('twig')).toBe(CodeFileIcon);
    expect(getFileIcon('unknown')).toBe(FileIcon);
  });

  it('classifies supported archive names using longest case-insensitive suffix matching', () => {
    expect(classifyArchiveFileName('Release.TAR.GZ')).toEqual({
      format: 'tar.gz',
      kind: 'archive',
      defaultOutputName: 'Release',
    });
    expect(classifyArchiveFileName('/tmp/source.tgz')).toEqual({
      format: 'tar.gz',
      kind: 'archive',
      defaultOutputName: 'source',
    });
    expect(classifyArchiveFileName('logs.txt.xz')).toEqual({
      format: 'xz',
      kind: 'compressed-file',
      defaultOutputName: 'logs.txt',
    });
    expect(classifyArchiveFileName('not-an-archive.gz.txt')).toBeUndefined();
  });

  it('classifies explicit multipart archive names without matching arbitrary numbered files', () => {
    expect(classifyArchiveFileName('backup.7z.001')).toEqual({
      format: '7z',
      kind: 'multipart',
      defaultOutputName: 'backup',
    });
    expect(classifyArchiveFileName('photos.part02.rar')).toEqual({
      format: 'rar',
      kind: 'multipart',
      defaultOutputName: 'photos',
    });
    expect(classifyArchiveFileName('legacy.r00')).toEqual({
      format: 'rar',
      kind: 'multipart',
      defaultOutputName: 'legacy',
    });
    expect(classifyArchiveFileName('split.z01')).toEqual({
      format: 'zip',
      kind: 'multipart',
      defaultOutputName: 'split',
    });
    expect(classifyArchiveFileName('recording.001')).toBeUndefined();
  });

  it('uses the archive icon for simple and compound archive names', () => {
    expect(getFileIcon('jar')).toBe(ArchiveFileIcon);
    expect(getFileIcon('zip')).not.toBe(ArchiveFileIcon);
    expect(
      resolveFileItemIcon({
        id: 'a',
        name: 'bundle.tar.zst',
        type: 'file',
        path: '/bundle.tar.zst',
      })
    ).toBe(getFileIcon('tar.zst'));
    expect(renderItemIcon({ id: 'b', name: 'logs.gz', type: 'file', path: '/logs.gz' })).toContain(
      'data-file-icon-kind="archive"'
    );
  });

  it('resolveFileItemIcon should prefer item.icon for files before extension mapping', () => {
    const CustomIcon = (props: { class?: string }) => (
      <svg data-custom-component-icon="true" class={props.class} />
    );
    const item: FileItem = {
      id: 'custom.ts',
      name: 'custom.ts',
      type: 'file',
      path: '/custom.ts',
      extension: 'ts',
      icon: CustomIcon,
    };

    expect(resolveFileItemIcon(item)).toBe(CustomIcon);
  });

  it('resolveFileItemIcon should prefer item.icon for folders before symlink-aware folder fallback', () => {
    const CustomIcon = (props: { class?: string }) => (
      <svg data-custom-folder-icon="true" class={props.class} />
    );
    const item: FileItem = {
      id: 'linked-folder',
      name: 'linked-folder',
      type: 'folder',
      path: '/linked-folder',
      icon: CustomIcon,
      link: { kind: 'symbolic', targetType: 'folder' },
    };

    expect(resolveFileItemIcon(item)).toBe(CustomIcon);
  });

  it('FileItemIcon should render JSX element icon overrides', () => {
    const item: FileItem = {
      id: 'custom.js',
      name: 'custom.js',
      type: 'file',
      path: '/custom.js',
      extension: 'js',
      icon: <svg data-custom-element-icon="true" />,
    };

    const html = renderItemIcon(item);

    expect(html).toContain('data-custom-element-icon="true"');
  });

  it('resolveFileItemIcon should return dedicated symbolic-link icons for folder targets', () => {
    const folderLink: FileItem = {
      id: '/linked-dir',
      name: 'linked-dir',
      type: 'folder',
      path: '/linked-dir',
      link: { kind: 'symbolic', targetType: 'folder' },
    };

    expect(resolveFileItemIcon(folderLink)).toBe(SymlinkFolderIcon);
    expect(resolveFileItemIcon(folderLink, { open: true })).toBe(SymlinkFolderOpenIcon);
  });

  it('resolveFileItemIcon should return dedicated symbolic-link icons for file and broken targets', () => {
    const linkedFile: FileItem = {
      id: '/linked-file',
      name: 'linked-file',
      type: 'file',
      path: '/linked-file',
      link: { kind: 'symbolic', targetType: 'file' },
    };
    const brokenLink: FileItem = {
      id: '/broken-link',
      name: 'broken-link',
      type: 'file',
      path: '/broken-link',
      link: { kind: 'symbolic', targetType: 'broken' },
    };

    expect(resolveFileItemIcon(linkedFile)).toBe(SymlinkFileIcon);
    expect(resolveFileItemIcon(brokenLink)).toBe(BrokenSymlinkIcon);
  });

  it('FileItemIcon should expose symlink metadata in rendered markup for folder and file links', () => {
    const symlinkFolderHtml = renderItemIcon({
      id: '/linked-dir',
      name: 'linked-dir',
      type: 'folder',
      path: '/linked-dir',
      link: { kind: 'symbolic', targetType: 'folder' },
    });
    const openSymlinkFolderHtml = renderItemIcon(
      {
        id: '/linked-dir-open',
        name: 'linked-dir-open',
        type: 'folder',
        path: '/linked-dir-open',
        link: { kind: 'symbolic', targetType: 'folder' },
      },
      { open: true }
    );
    const brokenSymlinkHtml = renderItemIcon({
      id: '/broken-link',
      name: 'broken-link',
      type: 'file',
      path: '/broken-link',
      link: { kind: 'symbolic', targetType: 'broken' },
    });

    expect(symlinkFolderHtml).toContain('data-file-link-kind="symbolic"');
    expect(symlinkFolderHtml).toContain('data-file-link-target-type="folder"');
    expect(openSymlinkFolderHtml).toContain('data-file-link-target-type="folder"');
    expect(openSymlinkFolderHtml).toContain('data-file-icon-open="true"');
    expect(brokenSymlinkHtml).toContain('data-file-link-target-type="broken"');
  });

  it('FileItemIcon should render a JavaScript artwork for module variants such as .mjs', () => {
    const html = renderItemIcon({
      id: 'eslint.config.mjs',
      name: 'eslint.config.mjs',
      type: 'file',
      path: '/eslint.config.mjs',
      extension: 'mjs',
    });

    expectIcon(html, 'js');
  });

  it('FileItemIcon should derive the extension from the filename when extension metadata is missing', () => {
    const html = renderItemIcon({
      id: 'server.ts',
      name: 'server.ts',
      type: 'file',
      path: '/server.ts',
    });

    expectIcon(html, 'ts');
  });

  it('FileItemIcon should render dedicated media icons from extension metadata or filenames', () => {
    const videoFromExtension = renderItemIcon({
      id: 'trailer.m4v',
      name: 'trailer.m4v',
      type: 'file',
      path: '/trailer.m4v',
      extension: 'm4v',
    });
    const videoFromName = renderItemIcon({
      id: 'demo.webm',
      name: 'demo.webm',
      type: 'file',
      path: '/demo.webm',
    });
    const audioFromExtension = renderItemIcon({
      id: 'interview.m4a',
      name: 'interview.m4a',
      type: 'file',
      path: '/interview.m4a',
      extension: 'm4a',
    });
    const audioFromName = renderItemIcon({
      id: 'mix.opus',
      name: 'mix.opus',
      type: 'file',
      path: '/mix.opus',
    });

    expect(videoFromExtension).toContain('data-file-icon-kind="video"');
    expect(videoFromName).toContain('data-file-icon-kind="video"');
    expect(audioFromExtension).toContain('data-file-icon-kind="audio"');
    expect(audioFromName).toContain('data-file-icon-kind="audio"');
  });

  it('VideoFileIcon should use a dedicated purple accent instead of the product primary color', () => {
    const html = renderToString(() => <VideoFileIcon class="w-4 h-4" />);

    expect(html).toContain('var(--floe-icon-purple)');
    expect(html).toContain('data-file-icon-kind="video"');
    expect(html).not.toContain('var(--primary)');
  });

  it('FileItemIcon should resolve special filenames and variants before generic category fallback', () => {
    const dockerHtml = renderItemIcon({
      id: 'Dockerfile',
      name: 'Dockerfile',
      type: 'file',
      path: '/Dockerfile',
    });
    const dockerVariantHtml = renderItemIcon({
      id: 'Dockerfile.dev',
      name: 'Dockerfile.dev',
      type: 'file',
      path: '/Dockerfile.dev',
      extension: 'dev',
    });
    const makeHtml = renderItemIcon({
      id: 'Makefile',
      name: 'Makefile',
      type: 'file',
      path: '/Makefile',
    });
    const cmakeHtml = renderItemIcon({
      id: 'CMakeLists.txt',
      name: 'CMakeLists.txt',
      type: 'file',
      path: '/CMakeLists.txt',
      extension: 'txt',
    });
    const gemfileHtml = renderItemIcon({
      id: 'Gemfile',
      name: 'Gemfile',
      type: 'file',
      path: '/Gemfile',
    });
    const shellDotfileHtml = renderItemIcon({
      id: '.bashrc',
      name: '.bashrc',
      type: 'file',
      path: '/.bashrc',
    });
    const jenkinsfileHtml = renderItemIcon({
      id: 'Jenkinsfile',
      name: 'Jenkinsfile',
      type: 'file',
      path: '/Jenkinsfile',
    });

    expectIcon(dockerHtml, 'docker');
    expectIcon(dockerVariantHtml, 'docker');
    expectIcon(makeHtml, 'make');
    expectIcon(cmakeHtml, 'cmake');
    expectIcon(gemfileHtml, 'ruby-project');
    expectIcon(shellDotfileHtml, 'shell');
    expectIcon(jenkinsfileHtml, 'jenkins');
  });

  it('FileItemIcon should render representative dedicated artworks across code families', () => {
    const pythonHtml = renderItemIcon({
      id: 'app.py',
      name: 'app.py',
      type: 'file',
      path: '/app.py',
      extension: 'py',
    });
    const graphqlHtml = renderItemIcon({
      id: 'schema.graphql',
      name: 'schema.graphql',
      type: 'file',
      path: '/schema.graphql',
      extension: 'graphql',
    });
    const powershellHtml = renderItemIcon({
      id: 'deploy.ps1',
      name: 'deploy.ps1',
      type: 'file',
      path: '/deploy.ps1',
      extension: 'ps1',
    });
    const htmlArtwork = renderItemIcon({
      id: 'index.html',
      name: 'index.html',
      type: 'file',
      path: '/index.html',
      extension: 'html',
    });

    expectIcon(pythonHtml, 'python');
    expectIcon(graphqlHtml, 'graphql');
    expectIcon(powershellHtml, 'powershell');
    expectIcon(htmlArtwork, 'html');
  });

  it('FileItemIcon should still fall back to the generic code icon for unmapped code-like extensions', () => {
    const html = renderItemIcon({
      id: 'template.twig',
      name: 'template.twig',
      type: 'file',
      path: '/template.twig',
      extension: 'twig',
    });

    expectIcon(html, 'code');
    expect(html).toContain('var(--floe-icon-cyan)');
  });
});
