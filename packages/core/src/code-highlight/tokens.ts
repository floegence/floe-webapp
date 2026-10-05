export interface CodeColorToken {
  start: number;
  end: number;
  light: string;
  dark: string;
}

// Bound both background grammar work and the number of DOM nodes added at once.
export const MAX_CODE_TOKENS = 4_096;
export function canHighlightCode(code: string, language: string): boolean {
  return !!language && !/^(?:text|txt|plain|plaintext)$/i.test(language)
    && code.length > 0 && code.length <= 32_768
    && code.split(/\r?\n/).every((line) => line.length <= 2_000);
}

export interface CodeColorRequest { id: number; code: string; language: string }
export interface CodeColorResponse { id: number; tokens: CodeColorToken[] | null }
