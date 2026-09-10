import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(resolve(repo, 'packages/core/package.json'));
const { build } = await import(pathToFileURL(require.resolve('vite')).href);
const { default: solid } = await import('vite-plugin-solid');
const { default: tailwind } = await import(
  pathToFileURL(require.resolve('@tailwindcss/vite')).href
);
const name = process.argv[2] ?? 'current';
const tarball = resolve(repo, process.argv[3] ?? '.cache/surface-style/current-core.tgz');
if (name === 'current') {
  mkdirSync(dirname(tarball), { recursive: true });
  const metadata = JSON.parse(readFileSync(resolve(repo, 'packages/core/package.json'), 'utf8'));
  // Keep a same-version development pack from overwriting a published baseline.
  const staging = mkdtempSync(resolve(repo, '.cache/surface-style/pack-'));
  try {
    execFileSync('pnpm', ['pack', '--pack-destination', staging], {
      cwd: resolve(repo, 'packages/core'),
      stdio: 'ignore',
    });
    const packedName = `${metadata.name.replace(/^@/, '').replace('/', '-')}-${metadata.version}.tgz`;
    cpSync(resolve(staging, packedName), tarball);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
for (const entry of ['styles', 'tailwind']) {
  const root = resolve(repo, `.cache/surface-style/${name}-${entry}`);
  rmSync(root, { recursive: true, force: true });
  const core = resolve(root, 'node_modules/@floegence/floe-webapp-core');
  mkdirSync(core, { recursive: true });
  execFileSync('tar', ['xzf', tarball, '--strip-components=1', '-C', core]);
  symlinkSync(resolve(repo, 'packages/core/node_modules'), resolve(core, 'node_modules'), 'dir');
  symlinkSync(
    resolve(repo, 'packages/core/node_modules/solid-js'),
    resolve(root, 'node_modules/solid-js'),
    'dir'
  );
  symlinkSync(
    resolve(repo, 'packages/core/node_modules/tailwindcss'),
    resolve(root, 'node_modules/tailwindcss'),
    'dir'
  );
  cpSync(resolve(repo, 'scripts/fixtures/surface-style'), root, { recursive: true });
  cpSync(
    resolve(repo, 'apps/demo/src/demo/components/SurfaceComponentGallery.tsx'),
    resolve(root, 'SurfaceComponentGallery.tsx')
  );
  writeFileSync(
    resolve(root, 'index.html'),
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Floe surface acceptance</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>'
  );
  writeFileSync(
    resolve(root, 'entry.css'),
    `${entry === 'tailwind' ? "@import 'tailwindcss';\n" : ''}@import '@floegence/floe-webapp-core/${entry}';\n@import './layout.css';`
  );
  if (name === 'current' && entry === 'styles')
    execFileSync(
      'pnpm',
      [
        'exec',
        'tsc',
        '--noEmit',
        '--strict',
        '--skipLibCheck',
        '--jsx',
        'preserve',
        '--jsxImportSource',
        'solid-js',
        '--module',
        'ESNext',
        '--moduleResolution',
        'Bundler',
        '--target',
        'ES2022',
        '--lib',
        'DOM,ESNext',
        resolve(root, 'main.tsx'),
      ],
      { cwd: repo, stdio: 'inherit' }
    );
  await build({
    configFile: false,
    base: './',
    root,
    plugins: [solid(), tailwind()],
    resolve: { dedupe: ['solid-js'] },
    build: { target: 'esnext', reportCompressedSize: false },
    logLevel: 'warn',
  });
  console.log(`Prepared ${name}/${entry}: ${root}/dist`);
}
writeFileSync(
  resolve(repo, `.cache/surface-style/${name}-manifest.json`),
  JSON.stringify(
    {
      tarball,
      packageSha256: sha256(tarball),
      fixtureSha256: Object.fromEntries(
        ['main.tsx', 'layout.css', 'WindowMaterialStudy.tsx'].map((file) => [
          file,
          sha256(resolve(repo, 'scripts/fixtures/surface-style', file)),
        ])
      ),
      gallerySha256: sha256(
        resolve(repo, 'apps/demo/src/demo/components/SurfaceComponentGallery.tsx')
      ),
      sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: repo,
        encoding: 'utf8',
      }).trim(),
      sourceDirty:
        execFileSync('git', ['status', '--porcelain'], { cwd: repo, encoding: 'utf8' }).trim() !==
        '',
    },
    null,
    2
  )
);
