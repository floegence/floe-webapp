import { describe, expect, it } from 'vitest';
import { tokenizeCode } from '../src/code-highlight/tokenize';

describe('code color tokens', () => {
  it('colors language aliases while preserving offsets, CRLF, Unicode and markup literally', async () => {
    for (const language of ['python', 'py', 'bash', 'sh', 'js', 'ts', 'json', 'html', 'css', 'go', 'rust']) {
      const code = language === 'json' ? '{"key":true}' : '# comment\r\nprint("<script>世界</script>")\r\n';
      const tokens = await tokenizeCode(code, language);
      expect(tokens?.length).toBeGreaterThan(0);
      for (const token of tokens!) {
        expect(token.start).toBeGreaterThanOrEqual(0);
        expect(token.end).toBeLessThanOrEqual(code.length);
        expect(token.end).toBeGreaterThan(token.start);
        expect(token.light).toMatch(/^#[\da-f]{6,8}$/i);
        expect(token.dark).toMatch(/^#[\da-f]{6,8}$/i);
      }
    }
  });

  it('leaves unsupported, plain and excessive input as text', async () => {
    for (const lang of ['', 'text', 'plaintext', 'unknown-language', '__proto__', 'constructor']) {
      expect(await tokenizeCode('hello', lang)).toBeNull();
    }
    expect(await tokenizeCode('x'.repeat(32_769), 'python')).toBeNull();
    expect(await tokenizeCode('x'.repeat(2_001), 'python')).toBeNull();
  });
});
