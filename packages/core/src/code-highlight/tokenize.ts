import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import lightTheme from 'shiki/themes/github-light.mjs';
import darkTheme from 'shiki/themes/github-dark.mjs';
import python from 'shiki/langs/python.mjs';
import shellscript from 'shiki/langs/shellscript.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import jsx from 'shiki/langs/jsx.mjs';
import tsx from 'shiki/langs/tsx.mjs';
import json from 'shiki/langs/json.mjs';
import jsonc from 'shiki/langs/jsonc.mjs';
import yaml from 'shiki/langs/yaml.mjs';
import toml from 'shiki/langs/toml.mjs';
import html from 'shiki/langs/html.mjs';
import css from 'shiki/langs/css.mjs';
import scss from 'shiki/langs/scss.mjs';
import markdown from 'shiki/langs/markdown.mjs';
import go from 'shiki/langs/go.mjs';
import rust from 'shiki/langs/rust.mjs';
import java from 'shiki/langs/java.mjs';
import c from 'shiki/langs/c.mjs';
import cpp from 'shiki/langs/cpp.mjs';
import csharp from 'shiki/langs/csharp.mjs';
import ruby from 'shiki/langs/ruby.mjs';
import php from 'shiki/langs/php.mjs';
import sql from 'shiki/langs/sql.mjs';
import diff from 'shiki/langs/diff.mjs';
import dockerfile from 'shiki/langs/dockerfile.mjs';
import powershell from 'shiki/langs/powershell.mjs';
import xml from 'shiki/langs/xml.mjs';
import vue from 'shiki/langs/vue.mjs';
import swift from 'shiki/langs/swift.mjs';
import kotlin from 'shiki/langs/kotlin.mjs';
import { canHighlightCode, MAX_CODE_TOKENS, type CodeColorToken } from './tokens';

// A self-contained worker survives dependency bundling and offline/file hosts.
// Keep its grammar set explicit instead of shipping every Shiki theme/language.
let highlighter: ReturnType<typeof createHighlighterCore> | undefined;

/** Worker-only tokenizer. Offsets refer to the original source, including CRLF. */
export async function tokenizeCode(code: string, language: string): Promise<CodeColorToken[] | null> {
  const lang = language.trim().toLowerCase();
  if (!canHighlightCode(code, lang)) return null;
  const engine = await (highlighter ??= createHighlighterCore({
    themes: [lightTheme, darkTheme],
    langs: [python, shellscript, javascript, typescript, jsx, tsx, json, jsonc, yaml, toml, html, css, scss, markdown, go, rust, java, c, cpp, csharp, ruby, php, sql, diff, dockerfile, powershell, xml, vue, swift, kotlin],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  }));
  if (!engine.getLoadedLanguages().includes(lang)) return null;
  const lines = engine.codeToTokensWithThemes(code, { lang, themes: { light: 'github-light', dark: 'github-dark' } });
  const result: CodeColorToken[] = [];
  for (const line of lines) {
    for (const token of line) {
      if (!token.content) continue;
      const start = token.offset;
      const end = start + token.content.length;
      // Never change source spelling or line endings to accommodate a grammar.
      if (code.slice(start, end) !== token.content) return null;
      const light = token.variants.light.color;
      const dark = token.variants.dark.color;
      if (!light || !dark) continue;
      const previous = result.at(-1);
      if (previous?.end === start && previous.light === light && previous.dark === dark) previous.end = end;
      else result.push({ start, end, light, dark });
      if (result.length > MAX_CODE_TOKENS) return null;
    }
  }
  return result;
}
