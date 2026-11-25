import type { Token, Tokens } from 'marked';

export function presentPendingLink(raw: string, tokens: Token[], lex: (text: string) => Token[]): void {
  if (raw.length > 8192) return;
  const opening = raw.lastIndexOf('](');
  if (opening < 1) return;
  let depth = 0;
  for (let index = opening + 2; index < raw.length; index++) {
    const char = raw[index];
    if (char === '\\') { index++; continue; }
    if (/\s/.test(char!) || char === '<' || char === '>') return;
    if (char === '(') depth++;
    if (char === ')' && --depth < 0) return;
  }
  const completion = ')'.repeat(depth + 1);
  const parsed = lex(raw + completion);
  const last = parsed.at(-1) as Tokens.Link | undefined;
  if (last?.type !== 'link' || !last.raw.startsWith('[') || !last.raw.endsWith(completion)) return;
  parsed[parsed.length - 1] = { type: 'text', raw: last.raw.slice(0, -completion.length), text: last.text, tokens: last.tokens, pendingMarkdownLink: true };
  tokens.splice(0, tokens.length, ...parsed);
}
