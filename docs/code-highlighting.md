# Stable code highlighting

`@floegence/floe-webapp-core/code-highlight` exports `enhanceCodeBlock(code,
language)`. Call it once for a committed, plain-text `<code>` element and invoke
the returned disposer before replacing or removing that element. The API does
not own Markdown parsing, streaming boundaries, frames or copy controls.

```ts
import { enhanceCodeBlock } from '@floegence/floe-webapp-core/code-highlight';

const dispose = enhanceCodeBlock(codeElement, 'python');
// On owner teardown:
dispose();
```

Source is visible immediately. A shared, lazy Worker parses only visible blocks,
one request at a time. Its self-contained asset works through consumer bundling
without separately copying grammar chunks. Shiki and its grammars are absent
from the main-thread entry. Supported grammars include Python, shell, JavaScript,
TypeScript, JSX/TSX, JSON/JSONC, YAML, TOML, HTML/XML, CSS/SCSS, Markdown, Go, Rust,
Java, C/C++, C#, Ruby, PHP, SQL, diff, Dockerfile, PowerShell, Vue, Swift and Kotlin,
including their Shiki aliases. No language guessing is performed.

Enhancement adds color-only spans. It preserves source spelling, whitespace,
frame dimensions, scroll offsets and control identity. It never inserts grammar
output as HTML. Light/dark colors follow the inherited CSS `color-scheme` using
`light-dark()`; theme changes do not parse or replace code. Hosts should retain
their existing font, line-height and selection styles. Browser support requires
module Workers, WebAssembly and CSS `light-dark()`.

If a selection intersects the code, application waits for selection to leave.
Disposal cancels queued work and releases listeners; late results cannot change
removed or replaced source. Unsupported languages, unlabelled code, input over
32,768 UTF-16 units, lines over 2,000 units, or more than 4,096 color runs remain
plain text. At most 128 requests wait behind the active request. Worker creation,
message or execution failure and a 15-second deadline settle outstanding work
as plain text and disable the worker for that page, without automatic retry loops.

Run `pnpm exec vitest run packages/core/test/code-highlight*.test.ts` and, after
building core, `node scripts/check-code-highlight-browser.mjs`. Browser acceptance
uses a production consumer bundle and checks real colors, source preservation,
selection, theme changes, layout, cancellation and worker-load failure.
