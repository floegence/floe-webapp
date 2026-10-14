import { Marked, type MarkedOptions } from 'marked';
import markedCjkFriendly from 'marked-cjk-friendly';

/** Create an isolated GFM parser with CJK-aware emphasis boundaries. */
export function createMarkdownParser(options: MarkedOptions = {}): Marked {
  const emStrong = markedCjkFriendly().tokenizer!.emStrong!;
  return new Marked({ tokenizer: {
    emStrong(src, maskedSrc, prevChar) {
      const token = emStrong.call(this, src, maskedSrc, prevChar);
      // CJK boundaries do not make whitespace inside emphasis delimiters valid.
      if (token && /^\s|\s$/u.test(token.text)) return false;
      return token;
    },
  } }).setOptions({ gfm: true, breaks: true, ...options });
}
