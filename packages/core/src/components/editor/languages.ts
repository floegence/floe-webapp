export type CodeEditorLanguageSpec = {
  id: string;
  load?: () => Promise<void>;
};

type Loader = () => Promise<unknown>;

function composeLoader(...loaders: Loader[]): Loader {
  return () => Promise.all(loaders.map((loader) => loader()));
}

const LANGUAGE_ALIASES: Record<string, string> = {
  '': 'plaintext',
  text: 'plaintext',
  plaintext: 'plaintext',
  txt: 'plaintext',
  js: 'javascript',
  jsx: 'javascript',
  javascriptreact: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  typescriptreact: 'typescript',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  shell: 'shell',
  shellscript: 'shell',
  yml: 'yaml',
  md: 'markdown',
  cs: 'csharp',
  fs: 'fsharp',
  docker: 'dockerfile',
  c: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  objectivec: 'objective-c',
  'objective-cpp': 'objective-c',
  conf: 'ini',
  config: 'ini',
  env: 'ini',
  make: 'plaintext',
  makefile: 'plaintext',
  cmake: 'plaintext',
  toml: 'plaintext',
  latex: 'plaintext',
  tex: 'plaintext',
  vue: 'plaintext',
  svelte: 'plaintext',
  groovy: 'plaintext',
};

const LANGUAGE_LOADERS: Record<string, Loader> = {
  javascript: () => import('monaco-editor/languages/definitions/javascript/register'),
  typescript: () => import('monaco-editor/languages/definitions/typescript/register'),
  json: () => import('monaco-editor/languages/features/json/register'),
  // Monaco's HTML/CSS language-service contributions do not register standalone
  // tokenizers by themselves, so editable syntax coloring must load the paired
  // basic-language contribution alongside the rich language-service runtime.
  html: composeLoader(
    () => import('monaco-editor/languages/definitions/html/register'),
    () => import('monaco-editor/languages/features/html/register'),
  ),
  css: composeLoader(
    () => import('monaco-editor/languages/definitions/css/register'),
    () => import('monaco-editor/languages/features/css/register'),
  ),
  scss: composeLoader(
    () => import('monaco-editor/languages/definitions/scss/register'),
    () => import('monaco-editor/languages/features/css/register'),
  ),
  less: composeLoader(
    () => import('monaco-editor/languages/definitions/less/register'),
    () => import('monaco-editor/languages/features/css/register'),
  ),
  markdown: () => import('monaco-editor/languages/definitions/markdown/register'),
  yaml: () => import('monaco-editor/languages/definitions/yaml/register'),
  ini: () => import('monaco-editor/languages/definitions/ini/register'),
  xml: () => import('monaco-editor/languages/definitions/xml/register'),
  python: () => import('monaco-editor/languages/definitions/python/register'),
  java: () => import('monaco-editor/languages/definitions/java/register'),
  kotlin: () => import('monaco-editor/languages/definitions/kotlin/register'),
  scala: () => import('monaco-editor/languages/definitions/scala/register'),
  go: () => import('monaco-editor/languages/definitions/go/register'),
  rust: () => import('monaco-editor/languages/definitions/rust/register'),
  cpp: () => import('monaco-editor/languages/definitions/cpp/register'),
  csharp: () => import('monaco-editor/languages/definitions/csharp/register'),
  fsharp: () => import('monaco-editor/languages/definitions/fsharp/register'),
  php: () => import('monaco-editor/languages/definitions/php/register'),
  ruby: () => import('monaco-editor/languages/definitions/ruby/register'),
  perl: () => import('monaco-editor/languages/definitions/perl/register'),
  shell: () => import('monaco-editor/languages/definitions/shell/register'),
  swift: () => import('monaco-editor/languages/definitions/swift/register'),
  'objective-c': () => import('monaco-editor/languages/definitions/objective-c/register'),
  r: () => import('monaco-editor/languages/definitions/r/register'),
  sql: () => import('monaco-editor/languages/definitions/sql/register'),
  lua: () => import('monaco-editor/languages/definitions/lua/register'),
  dart: () => import('monaco-editor/languages/definitions/dart/register'),
  dockerfile: () => import('monaco-editor/languages/definitions/dockerfile/register'),
  bat: () => import('monaco-editor/languages/definitions/bat/register'),
  powershell: () => import('monaco-editor/languages/definitions/powershell/register'),
};

const loaderCache = new Map<string, Promise<void>>();

function normalizeLanguageId(language?: string | null): string {
  const normalized = String(language ?? '').trim().toLowerCase();
  return (LANGUAGE_ALIASES[normalized] ?? normalized) || 'plaintext';
}

function wrapLoader(languageId: string, loader?: Loader): (() => Promise<void>) | undefined {
  if (!loader) return undefined;
  return () => {
    const cached = loaderCache.get(languageId);
    if (cached) return cached;

    const pending = loader()
      .then(() => undefined)
      .catch((error) => {
        loaderCache.delete(languageId);
        throw error;
      });

    loaderCache.set(languageId, pending);
    return pending;
  };
}

export function resolveCodeEditorLanguageSpec(language?: string | null): CodeEditorLanguageSpec {
  const id = normalizeLanguageId(language);
  const loader = wrapLoader(id, LANGUAGE_LOADERS[id]);
  return {
    id: loader ? id : (id || 'plaintext'),
    load: loader,
  };
}

export function isCodeEditorLanguageSupported(language?: string | null): boolean {
  const spec = resolveCodeEditorLanguageSpec(language);
  return spec.id !== 'plaintext' || normalizeLanguageId(language) === 'plaintext';
}
