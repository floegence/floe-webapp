#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const mirrors = [
  {
    source: 'skills/floe-webapp/SKILL.md',
    targets: [
      'packages/init/skills/floe-webapp/SKILL.md',
      'packages/init/templates/full/skills/floe-webapp/SKILL.md',
      'packages/init/templates/minimal/skills/floe-webapp/SKILL.md',
    ],
  },
  {
    source: 'skills/floe-webapp/references/playbooks.md',
    targets: [
      'packages/init/skills/floe-webapp/references/playbooks.md',
      'packages/init/templates/full/skills/floe-webapp/references/playbooks.md',
      'packages/init/templates/minimal/skills/floe-webapp/references/playbooks.md',
    ],
  },
];

for (const { source, targets } of mirrors) {
  const sourcePath = resolve(repoRoot, source);
  const content = readFileSync(sourcePath, 'utf-8');

  for (const target of targets) {
    const targetPath = resolve(repoRoot, target);
    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, content);
    console.log(`synced ${source} -> ${target}`);
  }
}
