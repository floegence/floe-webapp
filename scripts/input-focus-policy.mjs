import ts from 'typescript';

const inputTags = new Set([
  'input',
  'textarea',
  'select',
  'Input',
  'Textarea',
  'NumberInput',
  'AffixInput',
  'DirectoryInput',
]);
const forbiddenFocusClass =
  /(?:focus(?:-visible|-within)?):!?(?:(?:ring|outline)(?:-|$)(?!0(?:$|:)|none(?:$|:))|shadow(?!-none)|border-(?:[0248]|\[\d)|(?:p[xytrbl]?|[wh])-[\d[])/;

// Inspect actual JSX boundaries; a button's focus ring is not an input violation.
export function inspectInputClasses(source, filename = 'input.tsx') {
  const ast = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const violations = [];
  const inputClasses = new Set();
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(ast);
      const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
      const surface = attributes.some(
        (attr) => attr.name.getText(ast) === 'data-floe-input-surface'
      );
      const input = inputTags.has(tag);
      const descendantInput =
        ts.isJsxOpeningElement(node) &&
        /<(?:input|textarea|select|Input|Textarea)\b/.test(node.parent.getText(ast));
      for (const attr of attributes.filter((attr) =>
        ['class', 'className', 'classList'].includes(attr.name.getText(ast))
      )) {
        const text = attr.initializer?.getText(ast) ?? '';
        const tokens = text.match(/[\w!:[\]./()%#-]+/g) ?? [];
        if (input || surface)
          tokens
            .filter((token) => !token.includes(':'))
            .forEach((token) => inputClasses.add(token));
        for (const token of tokens) {
          if (
            (input || surface || (descendantInput && token.startsWith('focus-within:'))) &&
            forbiddenFocusClass.test(token)
          ) {
            violations.push(
              `${filename}:${ast.getLineAndCharacterOfPosition(attr.pos).line + 1}: input focus utility ${token}`
            );
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { violations, inputClasses };
}

export function inspectInputCSS(source, inputClasses, filename = 'input.css') {
  const violations = [];
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selectors, declarations] = match;
    // Commas in functional selectors are not separate selector branches. Remove
    // negative operands before classifying ownership, not entire focus rules.
    for (const selector of splitSelectorList(selectors)) {
      if (!/:focus(?:-visible|-within)?\b/.test(selector)) continue;
      const positive = positiveSelectorOperands(selector);
      const ownsInput =
        /\[data-floe-input-surface(?:[\s=\]])/.test(positive) ||
        /(?:^|[\s>+~,(])(?:input|textarea|select)(?=$|[\s.#[:>+~,)])/.test(
          positive.replace(/\[[^\]]*\]/g, '')
        ) ||
        [...positive.matchAll(/\.([\w-]+)/g)].some(([, name]) => inputClasses.has(name));
      if (!ownsInput) continue;
      for (const [, property, value] of declarations.matchAll(/([\w-]+)\s*:\s*([^;]+);?/g)) {
        if (
          (/^(?:box-shadow|outline(?:-width|-offset)?)$/.test(property) &&
            !/^(?:none|0(?:px)?)(?:\s*!important)?$/.test(value.trim())) ||
          /^(?:border(?:-\w+)?-width|padding(?:-\w+)?|width|height)$/.test(property)
        ) {
          violations.push(`${filename}: ${selector.trim()} changes ${property}`);
        }
      }
    }
  }
  return violations;
}

function splitSelectorList(source) {
  const result = [];
  let depth = 0,
    start = 0,
    quote = '';
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '\\') {
      i++;
      continue;
    }
    if (quote) {
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      result.push(source.slice(start, i));
      start = i + 1;
    }
  }
  result.push(source.slice(start));
  return result;
}

function positiveSelectorOperands(source, included = true) {
  let result = '',
    cursor = 0;
  for (const match of source.matchAll(/:not\(/g)) {
    if (match.index < cursor) continue;
    let depth = 1,
      end = match.index + match[0].length,
      quote = '';
    const start = end;
    for (; end < source.length && depth; end++) {
      const char = source[end];
      if (char === '\\') {
        end++;
        continue;
      }
      if (quote) {
        if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '(') depth++;
      else if (char === ')') depth--;
    }
    if (included) result += source.slice(cursor, match.index);
    // A nested negation reverses ownership again (for example :not(:not(input))).
    result += ` ${depth ? source.slice(match.index, end) : positiveSelectorOperands(source.slice(start, end - 1), !included)} `;
    cursor = end;
  }
  return result + (included ? source.slice(cursor) : '');
}
