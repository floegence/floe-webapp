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
  for (const file of fs.readdirSync(src)) {
    const srcFile = path.join(src, file);
    // Rename files that start with underscore
    const destFileName = RENAME_MAP[file] || file;
    const destFile = path.join(dest, destFileName);
    const stat = fs.statSync(srcFile);
    if (stat.isDirectory()) {
      copyDir(srcFile, destFile);
    } else if (projectName && destFileName === 'package.json') {
      const pkg = JSON.parse(fs.readFileSync(srcFile, 'utf-8'));
      pkg.name = projectName;
      fs.writeFileSync(destFile, JSON.stringify(pkg, null, 2) + '\n', { flag: 'wx' });
    } else {
      fs.copyFileSync(srcFile, destFile, fs.constants.COPYFILE_EXCL);
    }
  }
}
