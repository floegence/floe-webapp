import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { copyDir } from '../src/scaffold';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'floe-scaffold-test-'));
  roots.push(root);
  const source = path.join(root, 'template');
  const target = path.join(root, 'project');
  fs.mkdirSync(source);
  fs.mkdirSync(target);
  fs.writeFileSync(path.join(source, '_package.json'), JSON.stringify({ name: 'template', scripts: { dev: 'vite' } }));
  fs.writeFileSync(path.join(source, 'index.html'), '<div id="root"></div>');
  return { root, source, target };
}
describe('project scaffolding', () => {
  it('writes the final project name once while preserving template data', () => {
    const { source, target } = fixture();
    copyDir(source, target, 'my-app');
    expect(JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'))).toEqual({ name: 'my-app', scripts: { dev: 'vite' } });
    expect(fs.readFileSync(path.join(target, 'index.html'), 'utf8')).toBe('<div id="root"></div>');
  });
  it.each(['package.json', 'index.html'])('refuses a destination symlink instead of replacing its target: %s', file => {
    const { root, source, target } = fixture();
    const owned = path.join(root, 'owned.json');
    fs.writeFileSync(owned, 'preserved');
    fs.symlinkSync(owned, path.join(target, file));
    expect(() => copyDir(source, target, 'my-app')).toThrow();
    expect(fs.readFileSync(owned, 'utf8')).toBe('preserved');
  });
});
