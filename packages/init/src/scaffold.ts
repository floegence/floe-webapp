import fs from 'node:fs';
import path from 'node:path';

// Rename files that start with underscore to their proper names
// This is needed because npm ignores certain files like .gitignore
const RENAME_MAP: Record<string, string> = {
  '_package.json': 'package.json',
  '_gitignore': '.gitignore',
  '_env.example': '.env.example',
};

export function copyDir(src: string, dest: string, projectName?: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const file = entry.name;
    const srcFile = path.join(src, file);
    // Rename files that start with underscore
    const destFileName = RENAME_MAP[file] || file;
    const destFile = path.join(dest, destFileName);
    if (entry.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      const descriptor = fs.openSync(srcFile, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
      try {
        if (!fs.fstatSync(descriptor).isFile()) {
          throw new Error(`Template entry is not a regular file: ${srcFile}`);
        }
        const source = fs.readFileSync(descriptor);
        let content: string | Buffer = source;
        if (projectName && destFileName === 'package.json') {
          const pkg = JSON.parse(source.toString('utf-8'));
          pkg.name = projectName;
          content = JSON.stringify(pkg, null, 2) + '\n';
        }
        fs.writeFileSync(destFile, content, { flag: 'wx' });
      } finally {
        fs.closeSync(descriptor);
      }
    }
  }
}
