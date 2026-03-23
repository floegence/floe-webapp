import { describe, expect, it } from 'vitest';
import { resolveCodeEditorLanguageSpec } from '../src/components/editor/languages';

describe('resolveCodeEditorLanguageSpec', () => {
  it('maps common aliases to Monaco language ids', () => {
    expect(resolveCodeEditorLanguageSpec('tsx').id).toBe('typescript');
    expect(resolveCodeEditorLanguageSpec('jsx').id).toBe('javascript');
    expect(resolveCodeEditorLanguageSpec('shellscript').id).toBe('shell');
    expect(resolveCodeEditorLanguageSpec('yml').id).toBe('yaml');
    expect(resolveCodeEditorLanguageSpec('cs').id).toBe('csharp');
  });

  it('keeps supported Monaco basic languages loadable', () => {
    expect(resolveCodeEditorLanguageSpec('markdown').load).toBeTypeOf('function');
    expect(resolveCodeEditorLanguageSpec('python').load).toBeTypeOf('function');
    expect(resolveCodeEditorLanguageSpec('json').load).toBeTypeOf('function');
    expect(resolveCodeEditorLanguageSpec('css').load).toBeTypeOf('function');
    expect(resolveCodeEditorLanguageSpec('scss').load).toBeTypeOf('function');
    expect(resolveCodeEditorLanguageSpec('less').load).toBeTypeOf('function');
    expect(resolveCodeEditorLanguageSpec('html').load).toBeTypeOf('function');
  });

  it('falls back to plaintext for unsupported languages', () => {
    const spec = resolveCodeEditorLanguageSpec('groovy');
    expect(spec.id).toBe('plaintext');
    expect(spec.load).toBeUndefined();
  });
});
