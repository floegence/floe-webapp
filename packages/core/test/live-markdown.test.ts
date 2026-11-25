import { describe, expect, it } from 'vitest';
import { createIncrementalMarkdownParser, createMarkdownParser } from '../src/markdown';

describe('live Markdown', () => {
  it('renders a verified pending destination as its formatted label only', () => {
    let streaming = true;
    const markdown = createMarkdownParser();
    const model = createIncrementalMarkdownParser(markdown, { liveLinkLabels: () => streaming });
    const parse = (source: string) => { model.reset(source); return markdown.parser(model.snapshot()); };
    const input = 'Read [**guide**](https://example.org/foo(bar)';
    expect(parse(input)).toBe('<p>Read <strong>guide</strong></p>\n');
    expect(parse(input + ')')).toContain('href="https://example.org/foo(bar)"');
    for (const literal of ['`[guide](https://example.org`', 'https://example.org', '\\[guide](abc', '[guide]\\(abc', '[guide](broken\n\nNext', '![image](url)']) {
      expect(parse(literal)).toBe(createMarkdownParser().parse(literal));
    }
    streaming = false;
    expect(parse(input)).toBe(createMarkdownParser().parse(input));
  });

  it('retains completed rows without reparsing their contents', () => {
    const markdown = createMarkdownParser();
    const parser = createIncrementalMarkdownParser(markdown);
    let text = '| Key | Value |\n| --- | ---: |\n';
    parser.reset(text);
    for (let row = 0; row < 200; row++) {
      for (const delta of [`| ${row} | `, '**abc** \\| value |\n']) {
        text += delta;
        const update = parser.appendWithTableTail(delta);
        expect(update.tableTail?.from).toBe(row);
        expect(update.tableTail?.rows).toHaveLength(1);
        expect(update.changes).toHaveLength(0);
      }
    }
    expect(parser.diagnostics().parsedCharacters).toBeLessThan(text.length * 8);
    text += '\nDone.';
    parser.appendWithTableTail('\nDone.');
    parser.finish();
    expect(markdown.parser(parser.snapshot())).toBe(markdown.parse(text));
  });

  it('preserves the legacy update contract and terminal source across chunk boundaries', () => {
    const source = '| A | B |\r\n| --- | --- |\r\n| x | y |\r\n| [ref] | z |\n\n[ref]: /target';
    for (const size of [1, 7, 32]) {
      const markdown = createMarkdownParser();
      const live = createIncrementalMarkdownParser(markdown);
      const original = createIncrementalMarkdownParser(markdown);
      for (let offset = 0; offset < source.length; offset += size) {
        const delta = source.slice(offset, offset + size);
        live.appendWithTableTail(delta);
        expect(original.append(delta).tableTail).toBeUndefined();
        expect(live.snapshot()).toEqual(original.snapshot());
      }
    }
  });
});
