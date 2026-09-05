export type ArchiveFileFormat =
  | 'zip'
  | '7z'
  | 'rar'
  | 'tar'
  | 'tar.gz'
  | 'tar.bz2'
  | 'tar.xz'
  | 'tar.zst'
  | 'gz'
  | 'bz2'
  | 'xz'
  | 'zst';

export type ArchiveFileKind = 'archive' | 'compressed-file' | 'multipart';

export interface ArchiveFileClassification {
  format: ArchiveFileFormat;
  kind: ArchiveFileKind;
  defaultOutputName: string;
}

type ArchiveSuffix = Readonly<{
  suffix: string;
  format: ArchiveFileFormat;
  kind: Exclude<ArchiveFileKind, 'multipart'>;
}>;

const ARCHIVE_SUFFIXES: readonly ArchiveSuffix[] = [
  { suffix: '.tar.gz', format: 'tar.gz', kind: 'archive' },
  { suffix: '.tar.bz2', format: 'tar.bz2', kind: 'archive' },
  { suffix: '.tar.xz', format: 'tar.xz', kind: 'archive' },
  { suffix: '.tar.zst', format: 'tar.zst', kind: 'archive' },
  { suffix: '.tgz', format: 'tar.gz', kind: 'archive' },
  { suffix: '.tbz2', format: 'tar.bz2', kind: 'archive' },
  { suffix: '.txz', format: 'tar.xz', kind: 'archive' },
  { suffix: '.tzst', format: 'tar.zst', kind: 'archive' },
  { suffix: '.zip', format: 'zip', kind: 'archive' },
  { suffix: '.7z', format: '7z', kind: 'archive' },
  { suffix: '.rar', format: 'rar', kind: 'archive' },
  { suffix: '.tar', format: 'tar', kind: 'archive' },
  { suffix: '.gz', format: 'gz', kind: 'compressed-file' },
  { suffix: '.bz2', format: 'bz2', kind: 'compressed-file' },
  { suffix: '.xz', format: 'xz', kind: 'compressed-file' },
  { suffix: '.zst', format: 'zst', kind: 'compressed-file' },
];

function basename(name: string): string {
  const parts = name.trim().split(/[\\/]/);
  return parts[parts.length - 1] ?? '';
}

function withoutSuffix(name: string, suffixLength: number): string {
  const output = name.slice(0, -suffixLength).trim();
  return output || name;
}

function classifyMultipart(name: string, lowerName: string): ArchiveFileClassification | undefined {
  const partRar = lowerName.match(/^(.*)\.part\d+\.rar$/u);
  if (partRar) {
    return {
      format: 'rar',
      kind: 'multipart',
      defaultOutputName: name.slice(0, partRar[1]!.length) || name,
    };
  }

  const oldRar = lowerName.match(/^(.*)\.r\d{2,3}$/u);
  if (oldRar) {
    return {
      format: 'rar',
      kind: 'multipart',
      defaultOutputName: name.slice(0, oldRar[1]!.length) || name,
    };
  }

  const splitZip = lowerName.match(/^(.*)\.z\d{2,3}$/u);
  if (splitZip) {
    return {
      format: 'zip',
      kind: 'multipart',
      defaultOutputName: name.slice(0, splitZip[1]!.length) || name,
    };
  }

  const numberedVolume = lowerName.match(/^(.*)\.(\d{3,})$/u);
  if (!numberedVolume) return undefined;

  const archiveName = numberedVolume[1] ?? '';
  const suffix = ARCHIVE_SUFFIXES.find((candidate) => archiveName.endsWith(candidate.suffix));
  if (!suffix) return undefined;

  return {
    format: suffix.format,
    kind: 'multipart',
    defaultOutputName: withoutSuffix(name, numberedVolume[2]!.length + 1 + suffix.suffix.length),
  };
}

/** Classifies common archive and single-file compression names without reading file contents. */
export function classifyArchiveFileName(input: string): ArchiveFileClassification | undefined {
  const name = basename(input);
  if (!name) return undefined;

  const lowerName = name.toLowerCase();
  const multipart = classifyMultipart(name, lowerName);
  if (multipart) return multipart;

  const match = ARCHIVE_SUFFIXES.find((candidate) => lowerName.endsWith(candidate.suffix));
  if (!match) return undefined;

  return {
    format: match.format,
    kind: match.kind,
    defaultOutputName: withoutSuffix(name, match.suffix.length),
  };
}
