import type { Links, Marked, Token, Tokens, TokensList } from 'marked';

export type MarkdownBlock = Readonly<{ id: number; start: number; token: Token }>;
export type MarkdownBlockChange =
  | Readonly<{ kind: 'replace'; block: MarkdownBlock }>
  | Readonly<{ kind: 'remove'; id: number }>
  | Readonly<{ kind: 'append_text'; id: number; text: string; code: boolean; inlineIndex?: number }>
  | Readonly<{
      kind: 'inline';
      id: number;
      from: number;
      deleteCount: number;
      tokens: readonly Token[];
    }>;
export type MarkdownUpdate = Readonly<{
  changes: readonly MarkdownBlockChange[];
  links: Links;
  sourceLength: number;
}>;

type Block = { id: number; start: number; token: Token; references: Set<string> };
type InlineTail = { from: number; source: string; unresolved: boolean; lastChar: string };
type Fence = {
  mark: string;
  minimum: number;
  count: number;
  indent: number;
  candidate: boolean;
  pendingNewline: boolean;
};

/** One append-only source, Marked semantics, and explicit changed blocks. */
export function createIncrementalMarkdownParser(markdown: Marked<string, string>) {
  let sourceLength = 0;
  let sourceChunks: { start: number; text: string }[] = [];
  let inputLength = 0;
  let previousCR = false;
  let blocks: Block[] = [];
  let links: Links = Object.create(null);
  let stableLinks: Links = Object.create(null);
  let nextID = 1;
  let active = 0;
  let fence: Fence | undefined;
  let inlineTail: InlineTail | undefined;
  let inlineEligible = false;
  let fullParses = 0;
  let parsedCharacters = 0;
  const dependencies = new Map<string, Set<Block>>();

  function sourceFrom(start: number): string {
    let lo = 0;
    let hi = sourceChunks.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (sourceChunks[mid]!.start <= start) lo = mid + 1;
      else hi = mid;
    }
    const at = Math.max(0, lo - 1);
    return sourceChunks
      .slice(at)
      .map((chunk, i) => (i === 0 ? chunk.text.slice(start - chunk.start) : chunk.text))
      .join('');
  }

  function tokenize(text: string, inherited: Links) {
    parsedCharacters += text.length;
    const lexer = new markdown.Lexer({ ...markdown.defaults });
    lexer.tokens.links = { ...inherited };
    return lexer.lex(text);
  }

  function update(changes: readonly MarkdownBlockChange[]): MarkdownUpdate {
    return { changes, links, sourceLength: inputLength };
  }

  function detach(block: Block): MarkdownBlock {
    return { id: block.id, start: block.start, token: structuredClone(block.token) };
  }

  function index(block: Block) {
    for (const match of block.token.raw.matchAll(/\[((?:\\[^\n]|[^\]\n\\])+)\]/g)) {
      const label = match[1]!.toLowerCase().replace(/\s+/g, ' ');
      block.references.add(label);
      let dependents = dependencies.get(label);
      if (!dependents) dependencies.set(label, (dependents = new Set()));
      dependents.add(block);
    }
  }

  function unindex(block: Block) {
    for (const label of block.references) {
      const dependents = dependencies.get(label);
      dependents?.delete(block);
      if (!dependents?.size) dependencies.delete(label);
    }
  }

  function scanFence(delta: string, state: Fence): boolean {
    for (const char of delta) {
      if (char === '\n') {
        if (state.candidate && state.count >= state.minimum) return true;
        state.count = 0;
        state.indent = 0;
        state.candidate = true;
      } else if (state.candidate) {
        if (char === state.mark && state.indent <= 3) state.count++;
        else if (char === ' ' && state.count === 0 && state.indent < 3) state.indent++;
        else if ((char !== ' ' && char !== '\t') || state.count === 0) state.candidate = false;
      }
    }
    return state.candidate && state.count >= state.minimum;
  }

  // Complete tokens and literal text before a whitespace checkpoint are stable.
  // Unmatched delimiters retain their dependency region until Marked resolves it.
  function prepareInline(paragraph: Tokens.Paragraph, from = 0) {
    const tokens = paragraph.tokens;
    let firstUnresolved = -1;
    for (let i = from; i < tokens.length; i++) {
      const token = tokens[i]!;
      if (token.type === 'text' && /[\\\x60*_[<~]/u.test(token.raw)) {
        firstUnresolved = i;
        break;
      }
    }
    let at = firstUnresolved >= 0 ? firstUnresolved : Math.max(from, tokens.length - 1);
    // GFM backpedals punctuation out of an autolink. Until whitespace arrives,
    // appending another letter can pull that punctuation back into the link.
    if (
      at > from &&
      tokens[at]?.type === 'text' &&
      !/\s/u.test(tokens[at]!.raw) &&
      tokens[at - 1]?.type === 'link'
    )
      at--;
    const last = tokens[at];
    if (firstUnresolved < 0 && last?.type === 'text' && last.raw === (last as Tokens.Text).text) {
      const boundary = last.raw.lastIndexOf(' ');
      if (boundary > 0) {
        const text = last as Tokens.Text;
        tokens.splice(
          at,
          1,
          { ...text, raw: text.raw.slice(0, boundary), text: text.text.slice(0, boundary) },
          { ...text, raw: text.raw.slice(boundary), text: text.text.slice(boundary) }
        );
        at++;
      }
    }
    const text = tokens
      .slice(at)
      .map((token) => token.raw)
      .join('');
    inlineTail = {
      from: at,
      source: text,
      unresolved: firstUnresolved >= 0,
      lastChar: text.slice(-1),
    };
  }

  function refreshTail() {
    fence = undefined;
    inlineTail = undefined;
    inlineEligible = false;
    const last = blocks.at(-1)?.token;
    if (last?.type === 'paragraph') {
      prepareInline(last as Tokens.Paragraph);
      const start = last.raw.lastIndexOf('\n') + 1;
      const line = last.raw.slice(start, start + 32);
      inlineEligible =
        !last.raw.endsWith('\n') &&
        !/^(?: {0,3}(?:[-+*_]+|[0-9]{1,9}[.)]?)[ \t]*$| {0,3}[[<\x60~#|=])/u.test(line);
    }
    if (last?.type !== 'code') return;
    const opening = /^(\x60{3,}|~{3,})[^\n]*\n/.exec(last.raw);
    if (!opening) return;
    const mark = opening[1]!;
    const body = last.raw.slice(opening[0].length);
    const state: Fence = {
      mark: mark[0]!,
      minimum: mark.length,
      count: 0,
      indent: 0,
      candidate: true,
      pendingNewline: body.endsWith('\n'),
    };
    if (scanFence(body, state)) return;
    fence = state;
  }

  function parseActive(final = false): MarkdownUpdate {
    const start = blocks[active]?.start ?? 0;
    const old = blocks.splice(active);
    for (const block of old) unindex(block);
    const tokens = tokenize(sourceFrom(start), stableLinks);
    const previousLinks = links;
    links = Object.freeze(
      Object.fromEntries(
        Object.entries(tokens.links).map(([label, value]) => [label, Object.freeze({ ...value })])
      )
    );
    const changes: MarkdownBlockChange[] = [];
    let offset = start;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      const previous = old[i];
      const block: Block = {
        id: previous?.start === offset ? previous.id : nextID++,
        start: offset,
        token,
        references: new Set(),
      };
      blocks.push(block);
      index(block);
      if (i === tokens.length - 1 && token.type === 'paragraph')
        prepareInline(token as Tokens.Paragraph);
      if (!final || !previous || JSON.stringify(previous.token) !== JSON.stringify(token))
        changes.push({ kind: 'replace', block: detach(block) });
      offset += token.raw.length;
    }
    const retained = new Set(blocks.slice(active).map((block) => block.id));
    for (const block of old)
      if (!retained.has(block.id)) changes.push({ kind: 'remove', id: block.id });
    const invalidated = new Set<Block>();
    for (const label of new Set([...Object.keys(previousLinks), ...Object.keys(links)])) {
      if (
        previousLinks[label]?.href === links[label]?.href &&
        previousLinks[label]?.title === links[label]?.title
      )
        continue;
      for (const block of dependencies.get(label) ?? [])
        if (block.start < start) invalidated.add(block);
    }
    for (const block of invalidated) {
      const reparsed = tokenize(block.token.raw, links);
      if (reparsed.length === 1) {
        block.token = reparsed[0]!;
        changes.push({ kind: 'replace', block: detach(block) });
      }
    }
    const previousActive = active;
    active = Math.max(0, blocks.length - 1);
    if (blocks[active]?.token.type === 'space') active = Math.max(0, active - 1);
    else if (active > 0 && !blocks[active - 1]!.token.raw.endsWith('\n\n')) {
      if (blocks[active - 1]?.token.type !== 'space') active--;
      else if (!/\n[ \t]*\n/u.test(blocks[active - 1]!.token.raw)) active = Math.max(0, active - 2);
    }
    const lastToken = blocks.at(-1)?.token;
    if (
      active > 1 &&
      blocks[active - 1]?.token.type === 'space' &&
      blocks[active - 2]?.token.type === 'list' &&
      (lastToken?.type === 'list' ||
        (lastToken?.type === 'paragraph' &&
          /^ {0,3}(?:[0-9]{1,9}[.)]?|[-+*])[ \t]*$/u.test(lastToken.raw)))
    )
      active -= 2;
    for (let i = previousActive; i < active; i++) {
      const token = blocks[i]!.token;
      if (token.type === 'def' && !stableLinks[token.tag])
        stableLinks[token.tag] = { href: token.href, title: token.title };
    }
    refreshTail();
    return update(changes);
  }

  function normalize(delta: string): string {
    const skipLF = previousCR && delta.startsWith('\n');
    previousCR = delta.endsWith('\r');
    return (skipLF ? delta.slice(1) : delta).replace(/\r\n?/g, '\n');
  }

  function append(delta: string): MarkdownUpdate {
    if (!delta) return update([]);
    inputLength += delta.length;
    delta = normalize(delta);
    if (!delta) return update([]);
    sourceChunks.push({ start: sourceLength, text: delta });
    sourceLength += delta.length;
    const block = blocks.at(-1);
    const token = block?.token;
    if (
      block &&
      active === blocks.length - 1 &&
      token?.type === 'code' &&
      fence &&
      !delta.includes('\r')
    ) {
      if (!scanFence(delta, fence)) {
        const text =
          (fence.pendingNewline ? '\n' : '') + (delta.endsWith('\n') ? delta.slice(0, -1) : delta);
        fence.pendingNewline = delta.endsWith('\n');
        token.raw += delta;
        token.text += text;
        return update(text ? [{ kind: 'append_text', id: block.id, text, code: true }] : []);
      }
    }
    // Opening lines can still become lists or definitions. Marked owns those
    // block decisions; only established paragraphs take the inline path.
    const paragraph = token?.type === 'paragraph' ? (token as Tokens.Paragraph) : undefined;
    if (
      block &&
      active === blocks.length - 1 &&
      paragraph &&
      inlineTail &&
      inlineEligible &&
      !/[\n\r]/u.test(delta)
    ) {
      const tail = inlineTail;
      const leaf = paragraph.tokens.at(-1);
      const literal =
        leaf?.type === 'text' &&
        tail.from === paragraph.tokens.length - 1 &&
        !/[\\\x60*_[\]<>~&:/.@;|="'()-]/u.test(delta) &&
        !/[\\\x60*_[\]<>~&:/.@;|="'()-]$/u.test(tail.lastChar);
      paragraph.raw += delta;
      paragraph.text += delta;
      if (literal) {
        const text = leaf as Tokens.Text;
        const boundary = !tail.unresolved ? delta.lastIndexOf(' ') : -1;
        const prefix = boundary > 0 ? delta.slice(0, boundary) : boundary === 0 ? '' : delta;
        const changes: MarkdownBlockChange[] = [];
        const index = paragraph.tokens.length - 1;
        if (prefix) {
          text.raw += prefix;
          text.text += prefix;
          changes.push({
            kind: 'append_text',
            id: block.id,
            text: prefix,
            code: false,
            inlineIndex: index,
          });
        }
        if (boundary >= 0) {
          const suffix = delta.slice(boundary);
          const next: Tokens.Text = { type: 'text', raw: suffix, text: suffix };
          paragraph.tokens.push(next);
          changes.push({
            kind: 'inline',
            id: block.id,
            from: index + 1,
            deleteCount: 0,
            tokens: [structuredClone(next)],
          });
          inlineTail = {
            from: index + 1,
            source: suffix,
            unresolved: false,
            lastChar: suffix.slice(-1),
          };
        } else {
          tail.source += delta;
          tail.lastChar = delta.slice(-1);
        }
        return update(changes);
      }
      const lexer = new markdown.Lexer({ ...markdown.defaults });
      lexer.tokens.links = links;
      const input = tail.source + delta;
      parsedCharacters += input.length;
      const next = lexer.inlineTokens(input);
      const removed = paragraph.tokens.length - tail.from;
      paragraph.tokens.splice(tail.from, removed, ...next);
      prepareInline(paragraph, tail.from);
      const replacement = paragraph.tokens.slice(tail.from);
      return update([
        {
          kind: 'inline',
          id: block.id,
          from: tail.from,
          deleteCount: removed,
          tokens: structuredClone(replacement),
        },
      ]);
    }
    return parseActive();
  }

  function reset(text = ''): MarkdownUpdate {
    const removed: MarkdownBlockChange[] = blocks.map((block) => ({
      kind: 'remove',
      id: block.id,
    }));
    inputLength = text.length;
    previousCR = false;
    const normalized = normalize(text);
    sourceLength = normalized.length;
    sourceChunks = normalized ? [{ start: 0, text: normalized }] : [];
    blocks = [];
    links = Object.create(null);
    stableLinks = Object.create(null);
    dependencies.clear();
    active = 0;
    fence = undefined;
    fullParses++;
    const update = parseActive();
    return { ...update, changes: [...removed, ...update.changes] };
  }

  function snapshot(): TokensList {
    const result = blocks.map((block) => structuredClone(block.token)) as TokensList;
    result.links = { ...links };
    return result;
  }

  function finish(): MarkdownUpdate {
    fullParses++;
    active = 0;
    stableLinks = Object.create(null);
    return parseActive(true);
  }

  return {
    append,
    reset,
    finish,
    snapshot,
    get sourceLength() {
      return inputLength;
    },
    diagnostics: () => ({ fullParses, parsedCharacters, blocks: blocks.length }),
  };
}
