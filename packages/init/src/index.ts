#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { red, green, cyan, bold } from 'kolorist';

// Template types
type Template = 'minimal' | 'full';

const TEMPLATES: { name: string; value: Template; description: string }[] = [
  { name: 'minimal', value: 'minimal', description: 'Basic setup with FloeApp' },
  { name: 'full', value: 'full', description: 'Full setup with sample pages' },
];

// Rename files that start with underscore to their proper names
// This is needed because npm ignores certain files like .gitignore
const RENAME_MAP: Record<string, string> = {
  '_package.json': 'package.json',
  '_gitignore': '.gitignore',
  '_env.example': '.env.example',
};

async function main() {
  console.log(`\n${bold(cyan('Floe Webapp'))}\n`);

  // Parse args
  const args = process.argv.slice(2);
  let targetDir = args[0];
  let template: Template | undefined;

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: npx @floegence/floe-webapp-init [project-name] [options]

Options:
  --template <name>  Use a specific template (minimal, full)
  --help, -h         Show this help message

Examples:
  npx @floegence/floe-webapp-init
  npx @floegence/floe-webapp-init my-app
  npx @floegence/floe-webapp-init my-app --template full
`);
    process.exit(0);
  }

  // Parse --template flag
  const templateIdx = args.indexOf('--template');
  if (templateIdx !== -1 && args[templateIdx + 1]) {
    const templateArg = args[templateIdx + 1];
    if (templateArg === 'minimal' || templateArg === 'full') {
      template = templateArg;
    } else {
      console.log(red(`Invalid template: ${templateArg}`));
      console.log(`Available templates: minimal, full`);
      process.exit(1);
    }
    // Remove template arg from consideration as project name
    if (targetDir === '--template') {
      targetDir = args[templateIdx + 2];
    }
  }

  // Interactive prompts if needed
  const result = await prompts(
    [
      {
        type: targetDir ? null : 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'floe-app',
        validate: (value: string) => {
          if (!value) return 'Project name is required';
          if (!/^[a-z0-9-_]+$/i.test(value)) {
            return 'Project name can only contain letters, numbers, hyphens, and underscores';
          }
          return true;
        },
      },
      {
        type: template ? null : 'select',
        name: 'template',
        message: 'Select a template:',
        choices: TEMPLATES.map((t) => ({
          title: t.name,
          value: t.value,
          description: t.description,
        })),
      },
    ],
    {
      onCancel: () => {
        console.log(red('\nOperation cancelled'));
        process.exit(1);
      },
    }
  );

  targetDir = targetDir || result.projectName;
  template = template || result.template;

  if (!targetDir || !template) {
    console.log(red('Missing required information'));
    process.exit(1);
  }

  // Create project
  const root = path.resolve(targetDir);

  if (fs.existsSync(root)) {
    const files = fs.readdirSync(root);
    if (files.length > 0) {
      console.log(red(`\nDirectory ${targetDir} is not empty.`));
      process.exit(1);
    }
  }

  console.log(`\nScaffolding project in ${cyan(root)}...\n`);

  // Copy template
  const templateDir = path.resolve(
    fileURLToPath(import.meta.url),
    '../../templates',
    template
  );

  if (!fs.existsSync(templateDir)) {
    console.log(red(`Template directory not found: ${templateDir}`));
    process.exit(1);
  }

  copyDir(templateDir, root);

  // Update package.json name
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    pkg.name = path.basename(targetDir);
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }

  // Done
  console.log(green('Done!\n'));
  console.log('Next steps:\n');
  console.log(`  cd ${bold(targetDir)}`);
  console.log(`  pnpm install`);
  console.log(`  pnpm dev\n`);
}

function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcFile = path.join(src, file);
    // Rename files that start with underscore
    const destFileName = RENAME_MAP[file] || file;
    const destFile = path.join(dest, destFileName);
    const stat = fs.statSync(srcFile);
    if (stat.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

main().catch((err) => {
  console.error(red('Error:'), err);
  process.exit(1);
});
