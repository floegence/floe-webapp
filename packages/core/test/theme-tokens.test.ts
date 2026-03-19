import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  resolveThemeTokens,
  resolveThemeTokenOverrides,
  syncThemeTokenOverrides,
  type ThemeTarget,
} from '../src/styles/themes';

function createThemeTarget() {
  const classes = new Set<string>();
  const properties = new Map<string, string>();
  const style = {
    colorScheme: undefined as string | undefined,
    setProperty: (property: string, value: string) => {
      properties.set(property, value);
    },
    removeProperty: (property: string) => {
      properties.delete(property);
    },
  };
  const target: ThemeTarget = {
    classList: {
      add: (...tokens) => {
        for (const token of tokens) classes.add(token);
      },
      remove: (...tokens) => {
        for (const token of tokens) classes.delete(token);
      },
    },
    style,
  };

  return { target, classes, properties, style };
}

describe('theme token overrides', () => {
  it('should merge shared tokens with the active light/dark token group', () => {
    expect(resolveThemeTokenOverrides({
      shared: { '--chrome-border': 'shared' },
      light: { '--top-bar-border': 'light' },
      dark: { '--top-bar-border': 'dark' },
    }, 'dark')).toEqual({
      '--chrome-border': 'shared',
      '--top-bar-border': 'dark',
    });
  });

  it('should layer base theme tokens with the active preset tokens', () => {
    expect(resolveThemeTokens(
      'dark',
      {
        shared: { '--chrome-border': 'shared' },
        dark: { '--top-bar-border': 'base-dark' },
      },
      {
        shared: { '--top-bar-border': 'preset-shared' },
        dark: { '--chart-1': 'preset-dark' },
      },
    )).toEqual({
      '--chrome-border': 'shared',
      '--top-bar-border': 'preset-shared',
      '--chart-1': 'preset-dark',
    });
  });

  it('should apply theme classes and color scheme on the target root', () => {
    const { target, classes, style } = createThemeTarget();

    applyTheme('dark', target);
    expect(classes.has('dark')).toBe(true);
    expect(classes.has('light')).toBe(false);
    expect(style.colorScheme).toBe('dark');

    applyTheme('light', target);
    expect(classes.has('light')).toBe(true);
    expect(classes.has('dark')).toBe(false);
    expect(style.colorScheme).toBe('light');
  });

  it('should apply current tokens and remove stale token overrides', () => {
    const { target, properties } = createThemeTarget();

    const first = syncThemeTokenOverrides({
      '--chrome-border': '#111',
      '--top-bar-border': '#222',
    }, [], target);
    expect(first).toEqual(['--chrome-border', '--top-bar-border']);
    expect(properties.get('--chrome-border')).toBe('#111');
    expect(properties.get('--top-bar-border')).toBe('#222');

    const second = syncThemeTokenOverrides({
      '--chrome-border': '#333',
    }, first, target);
    expect(second).toEqual(['--chrome-border']);
    expect(properties.get('--chrome-border')).toBe('#333');
    expect(properties.has('--top-bar-border')).toBe(false);
  });
});
