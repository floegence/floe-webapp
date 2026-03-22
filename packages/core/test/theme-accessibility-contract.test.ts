import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testDir = dirname(fileURLToPath(import.meta.url));
const stylesDir = resolve(testDir, '../src/styles/themes');

function parseCssVariables(css: string) {
  return new Map(
    Array.from(css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi), (match) => [match[1], match[2].trim()] as const),
  );
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const saturation = s / 100;
  const lightness = l / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = h / 60;
  const second = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let rgb: [number, number, number] = [0, 0, 0];
  if (huePrime >= 0 && huePrime < 1) rgb = [chroma, second, 0];
  else if (huePrime < 2) rgb = [second, chroma, 0];
  else if (huePrime < 3) rgb = [0, chroma, second];
  else if (huePrime < 4) rgb = [0, second, chroma];
  else if (huePrime < 5) rgb = [second, 0, chroma];
  else rgb = [chroma, 0, second];

  const match = lightness - chroma / 2;
  return rgb.map((value) => Math.round((value + match) * 255)) as [number, number, number];
}

function parseHsl(value: string): [number, number, number] {
  const match = /hsl\(([-\d.]+)\s+([-\d.]+)%\s+([-\d.]+)%\)/.exec(value.trim());
  if (!match) {
    throw new Error(`Unsupported color format: ${value}`);
  }
  return hslToRgb(Number(match[1]), Number(match[2]), Number(match[3]));
}

function channelToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const luminance = ([r, g, b]: [number, number, number]) =>
    0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);

  const first = luminance(a);
  const second = luminance(b);
  const [lighter, darker] = first > second ? [first, second] : [second, first];
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme accessibility contract', () => {
  it('keeps light muted text readable on both the main background and the activity bar surface', () => {
    const lightCss = readFileSync(resolve(stylesDir, 'light.css'), 'utf8');
    const vars = parseCssVariables(lightCss);

    const mutedForeground = parseHsl(vars.get('--muted-foreground') ?? '');
    const background = parseHsl(vars.get('--background') ?? '');
    const activityBar = parseHsl(vars.get('--activity-bar') ?? '');

    expect(contrastRatio(mutedForeground, background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(mutedForeground, activityBar)).toBeGreaterThanOrEqual(4.5);
  });
});
