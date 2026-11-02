import { describe, expect, it } from 'vitest';
import { isClosedMarkdownFence } from '../src/components/chat/markdown/fence';
describe('committed diagram fences', () => {
  it('requires matching complete fences even after streaming ends', () => {
    for (const source of ['~~~mermaid\ngraph TD\nA-->B\n~~~', '\x60\x60\x60\x60mermaid\r\nA-->B\r\n\x60\x60\x60\x60\x60\r\n']) expect(isClosedMarkdownFence(source)).toBe(true);
    for (const source of ['\x60\x60\x60mermaid\nA-->B', '~~~~mermaid\nA-->B\n~~~', '~~~mermaid\nA-->B\n\x60\x60\x60', '~~~mermaid\nA-->B\n~~~ tail']) expect(isClosedMarkdownFence(source)).toBe(false);
  });
});
