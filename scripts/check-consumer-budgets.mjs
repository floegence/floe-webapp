import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const root = resolve('packages/core');
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const temporary = mkdtempSync(join(root, '.consumer-budget-'));
const cases = [
  { name: 'button', entry: './ui', exports: ['Button'], gzip: 24000 },
  { name: 'prompt-card', entry: './ui', exports: ['PromptCard'], gzip: 32000 },
  {
    name: 'business-form',
    entry: './ui',
    exports: ['Form', 'FormField', 'Input', 'Select', 'DatePicker', 'DataTable'],
    gzip: 50000,
  },
  { name: 'application-shell', entry: './app', exports: ['FloeApp'], gzip: 180000 },
];
try {
  for (const fixture of cases) {
    const exported = manifest.exports[fixture.entry];
    const target = resolve(root, typeof exported === 'string' ? exported : exported.import);
    const input = join(temporary, fixture.name + '.js');
    writeFileSync(
      input,
      'export {' + fixture.exports.join(',') + '} from ' + JSON.stringify(target) + ';'
    );
    const result = await build({
      configFile: false,
      root,
      logLevel: 'error',
      build: {
        write: false,
        minify: 'esbuild',
        lib: { entry: input, formats: ['es'] },
        rollupOptions: { external: [/^solid-js(?:\/|$)/] },
      },
    });
    const output = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
    const chunks = output.filter((item) => item.type === 'chunk');
    const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
    const initial = new Set();
    const visit = (chunk) => {
      if (initial.has(chunk)) return;
      initial.add(chunk);
      for (const name of chunk.imports) if (byName.has(name)) visit(byName.get(name));
    };
    chunks.filter((chunk) => chunk.isEntry).forEach(visit);
    const bytes = [...initial].reduce((total, chunk) => total + gzipSync(chunk.code).length, 0);
    const modules = [...initial].flatMap((chunk) => Object.keys(chunk.modules));
    assert(
      !modules.some((id) => /monaco-editor|pdfjs-dist|pptx-renderer|elkjs|libavoid/.test(id)),
      fixture.name + ' eagerly loads an optional document or graph engine'
    );
    assert(
      bytes <= fixture.gzip,
      fixture.name + ' initial gzip ' + bytes + ' exceeds budget ' + fixture.gzip
    );
    console.log(
      fixture.name +
        ': initial gzip ' +
        bytes +
        '/' +
        fixture.gzip +
        ' bytes; ' +
        chunks.length +
        ' total chunks'
    );
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
