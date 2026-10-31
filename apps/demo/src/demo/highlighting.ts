import { configureSyncHighlighter } from '@floegence/floe-webapp-core/chat';
let ready: Promise<void> | undefined;
export function ensureDemoHighlighting(): Promise<void> {
  return (ready ??= initialize());
}

async function initialize() {
  try {
    const { createHighlighter } = await import('shiki');
    const highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'typescript',
        'javascript',
        'tsx',
        'jsx',
        'python',
        'json',
        'html',
        'css',
        'bash',
        'text',
        'shell',
      ],
    });

    configureSyncHighlighter({
      codeToHtml: (code: string, options: { lang: string; theme: string }) => {
        try {
          const loadedLangs = highlighter.getLoadedLanguages();
          const lang = loadedLangs.includes(options.lang as never) ? options.lang : 'text';
          return highlighter.codeToHtml(code, {
            lang,
            theme: options.theme,
          });
        } catch {
          const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<pre class="shiki"><code>${escaped}</code></pre>`;
        }
      },
    });
  } catch (error) {
    console.error('Failed to initialize Shiki:', error);
    configureSyncHighlighter({
      codeToHtml: (code: string) => {
        const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre class="shiki"><code>${escaped}</code></pre>`;
      },
    });
  }
}
