import definitions from './fileIconCatalog.json';
import { classifyArchiveFileName } from './archiveFiles';

export interface FileIconDefinition {
  id: string;
  name: string;
  category: string;
  tone: string;
  draw: string;
  label: string;
  motif: string;
  family: string;
  extensions: readonly string[];
  names: readonly string[];
  patterns: readonly { regex: string; display: string; example: string }[];
  examples: readonly string[];
  package: boolean;
  palette?: Readonly<Partial<Record<string, string>>>;
}

/** One catalog owns drawings, product palettes, aliases and filename rules. */
export const fileIconCatalog: readonly FileIconDefinition[] = definitions;
const byId = new Map(fileIconCatalog.map((item) => [item.id, item]));
const names = new Map<string, FileIconDefinition>();
const suffixes = new Map<string, FileIconDefinition>();
const patterns: { pattern: RegExp; item: FileIconDefinition }[] = [];
for (const item of fileIconCatalog) {
  for (const name of item.names) names.set(name.toLowerCase(), item);
  for (const suffix of item.extensions) suffixes.set(suffix, item);
  for (const pattern of item.patterns)
    patterns.push({ pattern: new RegExp(pattern.regex, 'i'), item });
}
const orderedSuffixes = [...suffixes.keys()].sort((a, b) => b.length - a.length);
export const fileIconDefinition = (id: string): FileIconDefinition =>
  byId.get(id) ?? byId.get('file')!;

export function fileIconForExtension(extension?: string): FileIconDefinition {
  const normalized = extension?.trim().toLowerCase().replace(/^\./, '') ?? '';
  return (
    suffixes.get(normalized) ??
    suffixes.get(classifyArchiveFileName(`file.${normalized}`)?.format ?? '') ??
    fileIconDefinition('file')
  );
}

/** Metadata is a fallback for extensionless entries; a filename's more specific rule wins. */
export function resolveFileIconDefinition(
  name: string,
  directory = false,
  extension?: string
): FileIconDefinition {
  const basename = name.trim().replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? '';
  const suffix = orderedSuffixes.find(
    (value) => basename.length > value.length + 1 && basename.endsWith('.' + value)
  );
  const bySuffix = suffix ? suffixes.get(suffix) : undefined;
  if (directory) return bySuffix?.package ? bySuffix : fileIconDefinition('folder');
  const exact = names.get(basename);
  if (exact) return exact;
  const patterned = patterns.find(({ pattern }) => pattern.test(basename));
  if (patterned) return patterned.item;
  if (bySuffix) return bySuffix;
  // Extraction support remains owned by the archive classifier; icon coverage grants no capabilities.
  const archive = classifyArchiveFileName(basename);
  if (archive) return fileIconForExtension(archive.format);
  if (basename.includes('.') && !basename.startsWith('.')) return fileIconDefinition('file');
  return fileIconForExtension(extension);
}
