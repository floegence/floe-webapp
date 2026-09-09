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
    // Negative selectors exempt inputs from the generic keyboard ring.
    if (selectors.trim().startsWith(':focus-visible:not(:where(')) continue;
    for (const selector of selectors.split(',')) {
      if (!/:focus(?:-visible|-within)?\b/.test(selector)) continue;
      const ownsInput =
        /\b(?:input|textarea|select)\b|\[data-floe-input-surface/.test(selector) ||
        [...selector.matchAll(/\.([\w-]+)/g)].some(([, name]) => inputClasses.has(name));
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
