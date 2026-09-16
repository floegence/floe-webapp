import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  builtInShellThemePresets,
  REQUIRED_SHELL_THEME_TOKENS,
} from '../src/styles/themes/presets.ts';

import { CLASSIC_LIGHT_CSS_TOKENS, CLASSIC_DARK_CSS_TOKENS } from '../src/styles/themes/classicSemanticTokens.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDir, '../src/styles/themes/shell-presets.generated.css');

const lines = ['/* Generated from src/styles/themes/presets.ts. Do not edit by hand. */'];

for (const preset of builtInShellThemePresets) {
  if (preset.inheritsBaseTokens) continue;
  const overrides = preset.tokens?.[preset.mode === 'dark' ? 'dark' : 'light'] ?? {};
  const missing = REQUIRED_SHELL_THEME_TOKENS.filter((token) => !overrides[token]);
  if (missing.length > 0) {
    throw new Error(`${preset.name} is missing tokens: ${missing.join(', ')}`);
  }

  lines.push(`:root[data-floe-shell-theme='${preset.name}'] {`);
  for (const [token, value] of Object.entries(overrides)) {
    lines.push(`  ${token}: ${value.startsWith('#') ? value.toLowerCase() : value};`);
  }
  lines.push('}');
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');

// Classic CSS and browser-neutral host metadata have one authored palette.
for (const [mode, tokens] of [['light', CLASSIC_LIGHT_CSS_TOKENS], ['dark', CLASSIC_DARK_CSS_TOKENS]]) {
  const selector = mode === 'light' ? ':root,\n.light' : '.dark';
  const source = ['/* Generated from classicSemanticTokens.ts. Do not edit by hand. */', `${selector} {`, `  color-scheme: ${mode};`, ...Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`), '}', ''].join('\n');
  await writeFile(resolve(scriptDir, `../src/styles/themes/${mode}.css`), source, 'utf8');
}
