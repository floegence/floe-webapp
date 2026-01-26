#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, watch } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { setTimeout } from 'node:timers';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgRoot = resolve(__dirname, '..');

const copies = [
  {
    src: resolve(pkgRoot, 'src/styles/floe.css'),
    dest: resolve(pkgRoot, 'dist/floe.css'),
  },
  {
    src: resolve(pkgRoot, 'src/styles/tailwind.css'),
    dest: resolve(pkgRoot, 'dist/tailwind.css'),
  },
  {
    src: resolve(pkgRoot, 'src/styles/themes/light.css'),
    dest: resolve(pkgRoot, 'dist/themes/light.css'),
  },
  {
    src: resolve(pkgRoot, 'src/styles/themes/dark.css'),
    dest: resolve(pkgRoot, 'dist/themes/dark.css'),
  },
];

function copyFile({ src, dest }) {
  const content = readFileSync(src, 'utf-8');
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content, 'utf-8');
}

function copyAll() {
  for (const item of copies) copyFile(item);
}

const shouldWatch = process.argv.includes('--watch');

copyAll();

if (!shouldWatch) process.exit(0);

let pending = false;
const scheduleCopy = () => {
  if (pending) return;
  pending = true;
  setTimeout(() => {
    pending = false;
    try {
      copyAll();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
    }
  }, 25);
};

for (const { src } of copies) {
  watch(src, { persistent: true }, scheduleCopy);
}

// Keep the process alive in watch mode.
process.stdin.resume();
