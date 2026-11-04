import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(repo, '.cache/checkbox-baseline');
mkdirSync(directory, { recursive: true });
// Always resolve the immutable published version through npm, including its
// registry integrity verification. A developer's local pack is not a baseline.
execFileSync('npm', ['pack', '@floegence/floe-webapp-core@0.90.4', '--pack-destination', directory, '--ignore-scripts', '--silent'], { cwd: repo, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/prepare-surface-consumer.mjs', 'baseline', resolve(directory, 'floegence-floe-webapp-core-0.90.4.tgz')], { cwd: repo, stdio: 'inherit' });
