import { describe, expect, it } from 'vitest';
import { Marked } from 'marked';
import { renderMarkdownToHtml } from '../src/components/chat/markdown/markdown';
import { createMarkdownParser } from '../src/components/chat/markdown/parser';

describe('chat Markdown emphasis', () => {
  it.each([
    ['**为什么值得关注：**这不是单纯增加模型支持。', '<strong>为什么值得关注：</strong>这不是单纯增加模型支持。'],
    ['**注意：**该版本汇总此前补丁周期的改动。', '<strong>注意：</strong>该版本汇总此前补丁周期的改动。'],
    ['**边界：**5.8 个百分点不是完整任务成功率。', '<strong>边界：</strong>5.8 个百分点不是完整任务成功率。'],
    ['这是**“调用工具”**的例子。', '这是<strong>“调用工具”</strong>的例子。'],
    ['**注意：**これは公開プレビューです。', '<strong>注意：</strong>これは公開プレビューです。'],
    ['**주의:**이 기능은 미리 보기입니다.', '<strong>주의:</strong>이 기능은 미리 보기입니다.'],
  ])('renders CJK punctuation without requiring inserted spaces: %s', (markdown, expected) => {
    expect(renderMarkdownToHtml(markdown)).toContain(expected);
  });

  it('preserves literal markers in code and escaped text', () => {
    const html = renderMarkdownToHtml('`**注意：**正文`\n\n```text\n**注意：**正文\n```\n\n\\*\\*注意：\\*\\*正文');
    expect(html).toContain('<code class="chat-md-inline-code">**注意：**正文</code>');
    expect(html).toContain('<code>**注意：**正文</code>');
    expect(html).toContain('<p>**注意：**正文</p>');
    expect(html).not.toContain('<strong>');
  });

  it('keeps whitespace-delimited and unmatched emphasis literal', () => {
    for (const markdown of ['**注意： **正文', '** 注意：**正文', '**注意：正文']) {
      expect(renderMarkdownToHtml(markdown)).not.toContain('<strong>');
    }
  });

  it('preserves standard Markdown behavior outside CJK boundaries', () => {
    const options = { gfm: true, breaks: false, pedantic: false };
    const standard = new Marked(options);
    const parser = createMarkdownParser(options);
    for (const markdown of [
      '**bold** and *italic* and __strong__',
      '**warning:**next',
      'abc_def_ghi and a**b**c',
      '***nested*** and **outer *inner* text**',
      '~~deleted~~ and ~deleted~',
      '~~注意： ~~正文 and ~~ 注意：~~正文',
      '[**label**](https://example.com) and ![image](https://example.com/a.png)',
      'first\nsecond',
      '| a | b |\n| --- | --- |\n| **c** | d |',
      '> **quote**\n\n- *one*\n- two',
    ]) {
      expect(parser.parse(markdown), markdown).toBe(standard.parse(markdown));
    }
  });

  it('retains exact source tokens and parses nested CJK emphasis and links', () => {
    const markdown = '**注意：**正文，**“[来源](https://example.com)”**可读，***重要：***继续。';
    const parser = createMarkdownParser();
    const tokens = parser.lexer(markdown);
    expect(tokens.map(token => token.raw).join('')).toBe(markdown);
    const html = parser.parser(tokens);
    expect(html).toContain('<strong>注意：</strong>正文');
    expect(html).toContain('<strong>“<a href="https://example.com">来源</a>”</strong>');
    expect(html).toContain('<em><strong>重要：</strong></em>继续');
  });
});
