import { describe, expect, it } from 'vitest';
import type { Token, Tokens, TokensList } from 'marked';
import { createMarkdownParser } from '../src/components/chat/markdown/parser';
import { createIncrementalMarkdownParser } from '../src/components/chat/markdown/incremental';
import type { MarkdownUpdate } from '../src/components/chat/markdown/incremental';

const examples = [
  '# Title\n\nPlain 世界🌸 **bold** and *em* text.\nNext line\n\nLast',
  'heading\n=======\n\n| a | b |\n| --- | --- |\n| c | d |\n\nDone',
  '- one\n- two\n  - nested\n\n  continued\n\nEnd',
  '> quote\n> **bold**\n>\n> - nested\n\nEnd',
  '[guide][ref] and [missing]\n\nSecond\n\n[ref]: https://example.com "Title"\n[missing]: /path\n\nEnd',
  '```ts\nconst x = 1;\n\nconsole.log(x);\n```\n\nEnd',
  '~~~~text\nhello\n~~~\nworld\n~~~~\n\nEnd',
  '<div>raw</div>\n\nA &amp; B and https://example.com/a and a@b.com',
  'before `code` **注意：**正文 \n\n![image](https://example.com/a.png)',
  'A \r\nB\rC\n\nEnd',
  '1. ordered\n2. second\n\n- [ ] task\n- [x] done\n\nEnd',
  '  ```ts\n  hello\n  ```\n\nEnd',
  'First **bold** then more. A _word_ and ~~strike~~. 中文连续内容🌸',
  'First a_b then more *em*; https://example.com/a_(b). Next user@example.com!',
  'First [nested [label]][ref] and [collapsed][] and [shortcut]\n\n[ref]: /ref\n[collapsed]: /collapsed\n[shortcut]: /shortcut',
  'First <span>inline text</span> after and <https://example.com>.',
  'First \n---\n\nEnd',
  'A\r\n\r\nB [ref]\r\n\r\n[ref]: /path\r\nEnd',
  'Earlier\n\nSee [guide] and [a\\]b]\n\n[guide]: /first\n[guide]: /ignored\n[a\\]b]: /escaped',
  'First *open text and more words **nested then closing* after.',
  'before\n\n````text\nhello\n```\nworld\n````\nEnd',
  'before\n\n~~~text\nhello\n~~~   \nEnd',
];

function consumer(markdown: ReturnType<typeof createMarkdownParser>) {
  const blocks = new Map<number, { start: number; token: Token }>();
  let links = {};
  return {
    apply(update: MarkdownUpdate) {
      links = update.links;
      for (const change of update.changes) {
        if (change.kind === 'replace') blocks.set(change.block.id, structuredClone(change.block));
        else if (change.kind === 'remove') blocks.delete(change.id);
        else {
          const block = blocks.get(change.id);
          if (!block) throw new Error('update without block');
          if (change.kind === 'inline') {
            (block.token as Tokens.Paragraph).tokens.splice(
              change.from,
              change.deleteCount,
              ...structuredClone(change.tokens)
            );
          } else if (change.code) (block.token as Tokens.Code).text += change.text;
          else (block.token as Tokens.Paragraph).tokens[change.inlineIndex!]!.text += change.text;
        }
      }
    },
    html() {
      const tokens = [...blocks.values()]
        .sort((a, b) => a.start - b.start)
        .map((block) => block.token) as TokensList;
      tokens.links = links;
      return markdown.parser(tokens);
    },
  };
}

describe('incremental Markdown', () => {
  it.each(examples)('matches authoritative parsing at every append: %s', (source) => {
    for (const size of [1, 2, 7, 31]) {
      const markdown = createMarkdownParser({ breaks: false });
      const model = createIncrementalMarkdownParser(markdown);
      const view = consumer(markdown);
      view.apply(model.reset());
      let prefix = '';
      for (let offset = 0; offset < source.length; offset += size) {
        const delta = source.slice(offset, offset + size);
        prefix += delta;
        view.apply(model.append(delta));
        expect(markdown.parser(model.snapshot()), JSON.stringify({ prefix, size })).toBe(
          markdown.parse(prefix)
        );
        expect(view.html(), JSON.stringify({ prefix, size, consumer: true })).toBe(
          markdown.parse(prefix)
        );
      }
      model.finish();
      expect(markdown.parser(model.snapshot())).toBe(markdown.parse(source));
    }
  });

  it('keeps paragraph work proportional to appended syntax instead of existing length', () => {
    const counts = [100, 1000].map((size) => {
      const model = createIncrementalMarkdownParser(createMarkdownParser());
      model.reset('A sentence with **bold**, a [link](/path), and 中文. '.repeat(size));
      const before = model.diagnostics().parsedCharacters;
      for (let i = 0; i < 100; i++) model.append(' More **bold**, text.');
      return model.diagnostics().parsedCharacters - before;
    });
    expect(counts[1]).toBeLessThanOrEqual(counts[0]! * 1.25);
  });

  it('matches Marked across deterministic random syntax and chunk boundaries', () => {
    let seed = 872912;
    const random = (n: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % n;
    };
    const fragments = [
      'hello',
      ' 世界🌸',
      ' ',
      '  ',
      '\n',
      '\n\n',
      '*',
      '**',
      '_',
      '~',
      '\x60',
      '\x60\x60\x60',
      '[a]',
      '[a]: /path',
      '(url)',
      '<span>',
      '</span>',
      'https://example.com',
      '&amp;',
      '\\',
      '- ',
      '1. ',
      '> ',
      '|',
      '---',
      '=',
      '"',
    ];
    for (let sample = 0; sample < 300; sample++) {
      const source = Array.from({ length: 20 }, () => fragments[random(fragments.length)]).join('');
      for (const breaks of [false, true]) {
        const markdown = createMarkdownParser({ breaks });
        const model = createIncrementalMarkdownParser(markdown);
        const view = consumer(markdown);
        view.apply(model.reset());
        let offset = 0;
        while (offset < source.length) {
          const size = 1 + random(11);
          view.apply(model.append(source.slice(offset, offset + size)));
          offset = Math.min(source.length, offset + size);
          const expected = markdown.parse(source.slice(0, offset));
          expect(
            markdown.parser(model.snapshot()),
            JSON.stringify({
              sample,
              prefix: source.slice(0, offset),
              breaks,
              tokens: model.snapshot().map((t) => ({ type: t.type, raw: t.raw })),
            })
          ).toBe(expected);
          expect(
            view.html(),
            JSON.stringify({ sample, prefix: source.slice(0, offset), breaks, consumer: true })
          ).toBe(expected);
        }
      }
    }
  });

  it('isolates payloads and shares an immutable reference dictionary', () => {
    const markdown = createMarkdownParser();
    const model = createIncrementalMarkdownParser(markdown);
    const initial = model.reset('Stable\n\nTail');
    const block = initial.changes.find((change) => change.kind === 'replace');
    if (block?.kind !== 'replace') throw new Error('missing block');
    block.block.token.raw = 'changed';
    expect(markdown.parser(model.snapshot())).toBe(markdown.parse('Stable\n\nTail'));
    expect(Object.isFrozen(initial.links)).toBe(true);
    expect(model.append(' more').links).toBe(initial.links);
    expect(model.append(' text').links).toBe(initial.links);
    const ids = model
      .finish()
      .changes.flatMap((change) => (change.kind === 'replace' ? [change.block.id] : []));
    expect(ids).not.toContain(block.block.id);
  });

  it('normalizes CRLF across appends while reporting original input length', () => {
    const model = createIncrementalMarkdownParser(createMarkdownParser());
    model.reset('First\r');
    expect(model.append('\nSecond\r').sourceLength).toBe(14);
    expect(model.append('\n').sourceLength).toBe(15);
    expect(model.sourceLength).toBe(15);
    expect(
      model
        .snapshot()
        .map((token) => token.raw)
        .join('')
    ).toBe('First\nSecond\n');
  });

  it('keeps stable blocks untouched during ordinary growth', () => {
    const markdown = createMarkdownParser();
    const model = createIncrementalMarkdownParser(markdown);
    const first = model.reset('Stable\n\nTail');
    const stable = first.changes.find((change) => change.kind === 'replace')!;
    if (stable.kind !== 'replace') throw new Error('missing block');
    for (let i = 0; i < 100; i++) {
      const update = model.append(' more text');
      expect(update.changes.length).toBeLessThanOrEqual(2);
      expect(
        update.changes.every((change) => change.kind === 'append_text' || change.kind === 'inline')
      ).toBe(true);
      expect(update.changes.every((change) => !('block' in change))).toBe(true);
    }
    expect(model.diagnostics().fullParses).toBe(1);
    expect(model.diagnostics().parsedCharacters).toBe('Stable\n\nTail'.length);
  });

  it.each(['x'.repeat(1 << 20), '```text\n' + 'x'.repeat(1 << 20)])(
    'does not rescan a long literal or code tail',
    (source) => {
      const model = createIncrementalMarkdownParser(createMarkdownParser());
      model.reset(source);
      const before = model.diagnostics();
      for (let i = 0; i < 200; i++) model.append(' appended text');
      expect(model.diagnostics().parsedCharacters).toBe(before.parsedCharacters);
    }
  );
});
