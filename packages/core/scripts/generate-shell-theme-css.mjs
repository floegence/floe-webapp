import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  builtInShellThemePresets,
  REQUIRED_SHELL_THEME_TOKENS,
} from '../src/styles/themes/presets.ts';

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
  for (const token of REQUIRED_SHELL_THEME_TOKENS) {
    const value = overrides[token];
    lines.push(`  ${token}: ${value.startsWith('#') ? value.toLowerCase() : value};`);
  }
  lines.push('}');
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
