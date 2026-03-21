import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import type { FileItem } from '../src/components/file-browser/types';
import {
  CodeFileIcon,
  ConfigFileIcon,
  DocumentFileIcon,
  FileIcon,
  FileItemIcon,
  FolderIcon,
  FolderOpenIcon,
  ImageFileIcon,
  JavaScriptFileIcon,
  ShellScriptFileIcon,
  StyleFileIcon,
  TypeScriptFileIcon,
  getFileIcon,
  resolveFileItemIcon,
} from '../src/components/file-browser/FileIcons';

function extractAll(re: RegExp, input: string): string[] {
  return Array.from(input.matchAll(re), (m) => m[1] ?? '');
}

function renderItemIcon(item: FileItem): string {
  return renderToString(() => <FileItemIcon item={item} class="w-4 h-4" />);
}

function expectCodeBadge(html: string, label: string, tone: string): void {
  expect(html).toContain(`data-code-badge-label="${label}"`);
  expect(html).toContain(`data-code-badge-tone="${tone}"`);
  expect(html).toContain(`>${label}</text>`);
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

    const ids = extractAll(/id="(floe-folder-gradient-[^"]+)"/g, html);
    const fills = extractAll(/fill=(?:")?url\(#(floe-folder-gradient-[^")\s>]+)\)(?:")?/g, html);

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

    const ids = extractAll(/id="(floe-folder-open-gradient-[^"]+)"/g, html);
    const fills = extractAll(/fill=(?:")?url\(#(floe-folder-open-gradient-[^")\s>]+)\)(?:")?/g, html);

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
    expect(getFileIcon('pdf')).toBe(DocumentFileIcon);
    expect(getFileIcon('json')).toBe(ConfigFileIcon);
    expect(getFileIcon('css')).toBe(StyleFileIcon);
    expect(getFileIcon('proto')).toBe(CodeFileIcon);
    expect(getFileIcon('unknown')).toBe(FileIcon);
  });

  it('resolveFileItemIcon should prefer item.icon for files before extension mapping', () => {
    const CustomIcon = (props: { class?: string }) => <svg data-custom-component-icon="true" class={props.class} />;
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

  it('FileItemIcon should render a JavaScript badge for module variants such as .mjs', () => {
    const html = renderItemIcon({
      id: 'eslint.config.mjs',
      name: 'eslint.config.mjs',
      type: 'file',
      path: '/eslint.config.mjs',
      extension: 'mjs',
    });

    expectCodeBadge(html, 'JS', 'warning');
  });

  it('FileItemIcon should derive the extension from the filename when extension metadata is missing', () => {
    const html = renderItemIcon({
      id: 'server.ts',
      name: 'server.ts',
      type: 'file',
      path: '/server.ts',
    });

    expectCodeBadge(html, 'TS', 'primary');
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

    expectCodeBadge(dockerHtml, 'DKR', 'info');
    expectCodeBadge(dockerVariantHtml, 'DKR', 'info');
    expectCodeBadge(makeHtml, 'MAKE', 'warning');
    expectCodeBadge(cmakeHtml, 'CMK', 'primary');
    expectCodeBadge(gemfileHtml, 'RB', 'error');
    expectCodeBadge(shellDotfileHtml, 'SH', 'success');
    expectCodeBadge(jenkinsfileHtml, 'GRV', 'success');
  });

  it('FileItemIcon should render representative dedicated badges across code families', () => {
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
    const htmlBadge = renderItemIcon({
      id: 'index.html',
      name: 'index.html',
      type: 'file',
      path: '/index.html',
      extension: 'html',
    });

    expectCodeBadge(pythonHtml, 'PY', 'info');
    expectCodeBadge(graphqlHtml, 'GQL', 'primary');
    expectCodeBadge(powershellHtml, 'PS', 'primary');
    expectCodeBadge(htmlBadge, 'HTML', 'warning');
  });

  it('FileItemIcon should still fall back to the generic code icon for unmapped code-like extensions', () => {
    const html = renderItemIcon({
      id: 'schema.proto',
      name: 'schema.proto',
      type: 'file',
      path: '/schema.proto',
      extension: 'proto',
    });

    expect(html).not.toContain('data-code-badge-label=');
    expect(html).toContain('var(--info)');
    expect(html).toContain('m10 13-2 2 2 2m4-4 2 2-2 2');
  });
});
