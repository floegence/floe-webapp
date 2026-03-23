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
  javascript: () => import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'),
  typescript: () => import('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'),
  json: () => import('monaco-editor/esm/vs/language/json/monaco.contribution.js'),
  // Monaco's HTML/CSS language-service contributions do not register standalone
  // tokenizers by themselves, so editable syntax coloring must load the paired
  // basic-language contribution alongside the rich language-service runtime.
  html: composeLoader(
    () => import('monaco-editor/esm/vs/basic-languages/html/html.contribution.js'),
    () => import('monaco-editor/esm/vs/language/html/monaco.contribution.js'),
  ),
  css: composeLoader(
    () => import('monaco-editor/esm/vs/basic-languages/css/css.contribution.js'),
    () => import('monaco-editor/esm/vs/language/css/monaco.contribution.js'),
  ),
  scss: composeLoader(
    () => import('monaco-editor/esm/vs/basic-languages/scss/scss.contribution.js'),
    () => import('monaco-editor/esm/vs/language/css/monaco.contribution.js'),
  ),
  less: composeLoader(
    () => import('monaco-editor/esm/vs/basic-languages/less/less.contribution.js'),
    () => import('monaco-editor/esm/vs/language/css/monaco.contribution.js'),
  ),
  markdown: () => import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution.js'),
  yaml: () => import('monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution.js'),
  ini: () => import('monaco-editor/esm/vs/basic-languages/ini/ini.contribution.js'),
  xml: () => import('monaco-editor/esm/vs/basic-languages/xml/xml.contribution.js'),
  python: () => import('monaco-editor/esm/vs/basic-languages/python/python.contribution.js'),
  java: () => import('monaco-editor/esm/vs/basic-languages/java/java.contribution.js'),
  kotlin: () => import('monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution.js'),
  scala: () => import('monaco-editor/esm/vs/basic-languages/scala/scala.contribution.js'),
  go: () => import('monaco-editor/esm/vs/basic-languages/go/go.contribution.js'),
  rust: () => import('monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js'),
  cpp: () => import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js'),
  csharp: () => import('monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js'),
  fsharp: () => import('monaco-editor/esm/vs/basic-languages/fsharp/fsharp.contribution.js'),
  php: () => import('monaco-editor/esm/vs/basic-languages/php/php.contribution.js'),
  ruby: () => import('monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js'),
  perl: () => import('monaco-editor/esm/vs/basic-languages/perl/perl.contribution.js'),
  shell: () => import('monaco-editor/esm/vs/basic-languages/shell/shell.contribution.js'),
  swift: () => import('monaco-editor/esm/vs/basic-languages/swift/swift.contribution.js'),
  'objective-c': () => import('monaco-editor/esm/vs/basic-languages/objective-c/objective-c.contribution.js'),
  r: () => import('monaco-editor/esm/vs/basic-languages/r/r.contribution.js'),
  sql: () => import('monaco-editor/esm/vs/basic-languages/sql/sql.contribution.js'),
  lua: () => import('monaco-editor/esm/vs/basic-languages/lua/lua.contribution.js'),
  dart: () => import('monaco-editor/esm/vs/basic-languages/dart/dart.contribution.js'),
  dockerfile: () => import('monaco-editor/esm/vs/basic-languages/dockerfile/dockerfile.contribution.js'),
  bat: () => import('monaco-editor/esm/vs/basic-languages/bat/bat.contribution.js'),
  powershell: () => import('monaco-editor/esm/vs/basic-languages/powershell/powershell.contribution.js'),
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
