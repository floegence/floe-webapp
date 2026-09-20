import { describe, expect, it } from 'vitest';
import { renderToString } from 'solid-js/web';
import { FileItemIcon, getFileIcon } from '../src/components/file-browser/FileIcons';

const render = (name: string) =>
  renderToString(() => <FileItemIcon item={{ name, type: 'file' }} />);

describe('approved file icon design', () => {
  it('distinguishes data formats rather than assigning one configuration drawing', () => {
    expect(new Set(['json', 'yaml', 'toml'].map(getFileIcon)).size).toBe(3);
  });
  it.each(['swift', 'psd', 'ps', 'doc', 'docx', 'ppt', 'pptx', 'wps', 'dmg', 'deb'])(
    'gives %s an outlined, identifiable drawing',
    (extension) => {
      const html = render(`example.${extension}`);
      expect(html).toContain('data-file-icon-type=');
      expect(html).not.toContain('<text');
      expect(html).toContain('viewBox="0 0 48 48"');
    }
  );
  it('keeps Photoshop brand colors independent of the application accent', () => {
    const html = render('Cover.psd');
    expect(html).toContain('#31A8FF');
    expect(html).toContain('#001E36');
    expect(html).not.toContain('var(--primary)');
  });
});

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import approved from './fixtures/approved-file-icons.json';
import {
  fileIconCatalog,
  fileIconDefinition,
  resolveFileIconDefinition,
} from '../src/components/file-browser/fileIconCatalog';
import { renderFileIconBody } from '../src/components/file-browser/fileIconDrawing';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('approved design preservation and production boundaries', () => {
  it('retains the complete standalone acceptance artifact unchanged', () => {
    const html = readFileSync(
      new URL('../../../apps/demo/public/file-icons-reference/index.html', import.meta.url),
      'utf8'
    );
    expect(sha256(html)).toBe(approved.htmlSha256);
    expect(approved.items).toHaveLength(156);
  });
  for (const item of approved.items) {
    it(`preserves ${item.id} geometry, product palette, and filename coverage`, () => {
      const actual = fileIconDefinition(item.id);
      expect(actual.id).toBe(item.id);
      expect(actual.palette ?? null).toEqual(item.palette);
      for (const compact of [true, false]) {
        expect(
          sha256(renderFileIconBody(actual, `var(--${actual.tone})`, 'reference', compact))
        ).toBe(compact ? item.compact : item.detailed);
      }
      for (const extension of item.extensions)
        expect(resolveFileIconDefinition(`example.${extension}`).id).toBe(item.id);
      for (const name of item.names) expect(resolveFileIconDefinition(name).id).toBe(item.id);
      for (const pattern of item.patterns)
        expect(resolveFileIconDefinition(pattern.example).id).toBe(item.id);
      for (const example of item.examples)
        expect(resolveFileIconDefinition(example, item.package || item.id === 'folder').id).toBe(
          item.id
        );
    });
  }
  it.each([
    ['C:\\Work\\合同.DOCX', false, 'word'],
    ['report.docx.exe', false, 'exe'],
    ['config.yaml.backup', false, 'file'],
    ['Report.docx', true, 'folder'],
    ['Studio.xcodeproj', true, 'xcode'],
    ['Redeven.app', true, 'app'],
    ['types.d.ts', false, 'types'],
    ['Source.tar.gz', false, 'tar'],
    ['backup.7z.001', false, 'sevenzip'],
    ['archive.r00', false, 'rar'],
    ['.zlogin', false, 'shell'],
    ['Appfile', false, 'ruby-project'],
    ['template.twig', false, 'code'],
    ['__proto__', false, 'file'],
    ['<img src=x>.psd', false, 'photoshop'],
  ] as const)('classifies %s with directory metadata %s', (name, directory, id) => {
    expect(resolveFileIconDefinition(name, directory).id).toBe(id);
  });
  it('uses an extension hint only when the filename cannot supply one', () => {
    expect(resolveFileIconDefinition('untitled', false, '.SWIFT').id).toBe('swift');
    expect(resolveFileIconDefinition('report.docx.exe', false, 'docx').id).toBe('exe');
    expect(resolveFileIconDefinition('Folder.swift', true, 'swift').id).toBe('folder');
  });
  it('draws every family at compact and detailed sizes without live font dependencies or unsafe name interpolation', () => {
    for (const definition of fileIconCatalog)
      for (const size of [14, 16, 20, 24, 32, 48]) {
        const html = renderToString(() => (
          <FileItemIcon
            item={{
              name: definition.examples[0],
              type: definition.package || definition.id === 'folder' ? 'folder' : 'file',
            }}
            size={size}
          />
        ));
        expect(html).toContain(`data-file-icon-size="${size <= 20 ? 'compact' : 'detailed'}"`);
        expect(html).not.toMatch(/<text|NaN|undefined/);
      }
    expect(render('<img src=x onerror=alert(1)>.psd')).not.toContain('<img');
  });
});
