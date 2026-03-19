import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const DEFAULT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const INTERACTION_PATTERNS = [
  { prefix: 'disabled:hover:', regex: /(?<![\w-])disabled:hover:([^\s"'`]+)/g },
  { prefix: 'group-hover:', regex: /(?<![\w-])group-hover:([^\s"'`]+)/g },
  { prefix: 'hover:', regex: /(?<![\w:-])hover:([^\s"'`]+)/g },
];
const MANUAL_FAMILIES = new Set(['bg', 'text', 'border', 'ring']);

function normalizeCssUtilityName(value) {
  return value.replace(/\\/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkFiles(rootDir, extensions) {
  const files = [];
  const stack = [resolve(rootDir)];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current);

    for (const entry of entries) {
      const absPath = join(current, entry);
      const stats = statSync(absPath);
      if (stats.isDirectory()) {
        stack.push(absPath);
        continue;
      }
      if (extensions.has(extname(absPath))) {
        files.push(absPath);
      }
    }
  }

  return files.sort();
}

function collectManualTokenFamilies(cssContent) {
  const families = new Map();
  for (const family of MANUAL_FAMILIES) {
    families.set(family, new Set());
  }

  const selectorPattern = /\.((?:bg|text|border|ring)-[^:{\s]+)/g;
  let match = selectorPattern.exec(cssContent);
  while (match) {
    const utility = normalizeCssUtilityName(match[1]);
    if (!utility.includes(':')) {
      const familyEnd = utility.indexOf('-');
      const family = utility.slice(0, familyEnd);
      const token = utility.slice(familyEnd + 1).split('/')[0];
      if (families.has(family) && token) {
        families.get(family).add(token);
      }
    }
    match = selectorPattern.exec(cssContent);
  }

  return families;
}

function parseManualUtility(baseUtility, manualTokenFamilies) {
  const familyEnd = baseUtility.indexOf('-');
  if (familyEnd <= 0) {
    return null;
  }

  const family = baseUtility.slice(0, familyEnd);
  if (!MANUAL_FAMILIES.has(family)) {
    return null;
  }

  const token = baseUtility.slice(familyEnd + 1).split('/')[0];
  if (!token || !manualTokenFamilies.get(family)?.has(token)) {
    return null;
  }

  return { family, token };
}

function collectDefinedInteractionUtilities(cssContent, prefix) {
  const escapedPrefix = prefix.replace(/:/g, '\\:');
  const pattern = new RegExp(`\\.((?:${escapeRegExp(escapedPrefix)}[^:{\\s]+))(?=[:{\\s])`, 'g');
  const defined = new Set();

  let match = pattern.exec(cssContent);
  while (match) {
    defined.add(normalizeCssUtilityName(match[1]));
    match = pattern.exec(cssContent);
  }

  return defined;
}

function collectUsedInteractionUtilities(sourceRoot, extensions) {
  const usage = new Map();

  for (const filePath of walkFiles(sourceRoot, extensions)) {
    const content = readFileSync(filePath, 'utf8');
    for (const { prefix, regex } of INTERACTION_PATTERNS) {
      regex.lastIndex = 0;
      let match = regex.exec(content);
      while (match) {
        const className = `${prefix}${match[1]}`;
        if (!usage.has(className)) {
          usage.set(className, new Set());
        }
        usage.get(className).add(filePath);
        match = regex.exec(content);
      }
    }
  }

  return usage;
}

export function auditInteractionUtilities({
  sourceRoot,
  cssPath,
  extensions = DEFAULT_EXTENSIONS,
}) {
  const extensionSet = extensions instanceof Set ? extensions : new Set(extensions);
  const cssContent = readFileSync(resolve(cssPath), 'utf8');
  const manualTokenFamilies = collectManualTokenFamilies(cssContent);
  const usedInteractionUtilities = collectUsedInteractionUtilities(sourceRoot, extensionSet);
  const definedByPrefix = new Map(
    INTERACTION_PATTERNS.map(({ prefix }) => [prefix, collectDefinedInteractionUtilities(cssContent, prefix)])
  );

  const missing = [];
  for (const [className, files] of usedInteractionUtilities.entries()) {
    const interaction = INTERACTION_PATTERNS.find(({ prefix }) => className.startsWith(prefix));
    if (!interaction) {
      continue;
    }

    const baseUtility = className.slice(interaction.prefix.length);
    const manualUtility = parseManualUtility(baseUtility, manualTokenFamilies);
    if (!manualUtility) {
      continue;
    }

    if (!definedByPrefix.get(interaction.prefix)?.has(className)) {
      missing.push({
        className,
        baseUtility,
        family: manualUtility.family,
        token: manualUtility.token,
        files: Array.from(files).sort(),
      });
    }
  }

  missing.sort((left, right) => left.className.localeCompare(right.className));

  return {
    cssPath: resolve(cssPath),
    sourceRoot: resolve(sourceRoot),
    missing,
  };
}

export function formatInteractionUtilityAudit(report, label = 'interaction utility audit') {
  if (report.missing.length === 0) {
    return `${label}: ok`;
  }

  const lines = [`${label}: missing manual interaction utilities in ${report.cssPath}`];
  for (const entry of report.missing) {
    lines.push(`- ${entry.className}`);
    for (const file of entry.files) {
      lines.push(`  - ${file}`);
    }
  }

  return lines.join('\n');
}
