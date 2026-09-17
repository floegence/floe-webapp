import type { FloeThemeTokenMap } from './index';

type RGB = [number, number, number];
const linear = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const luminance = (rgb: RGB) =>
  rgb.map(linear).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a: RGB, b: RGB) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
const mixWhite = (rgb: RGB, amount: number) =>
  rgb.map((v) => Math.round(v + (255 - v) * amount)) as RGB;
const css = (rgb: RGB) => `rgb(${rgb.join(' ')})`;

function lab(rgb: RGB): RGB {
  const [r, g, b] = rgb.map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function textInk(foreground: RGB, lightness: number): RGB {
  const [, a, b] = lab(foreground);
  const scale = Math.min(1, 0.03 / Math.max(Math.hypot(a, b), 1e-10));
  const x = a * scale,
    y = b * scale;
  const l = (lightness + 0.3963377774 * x + 0.2158037573 * y) ** 3;
  const m = (lightness - 0.1055613458 * x - 0.0638541728 * y) ** 3;
  const s = (lightness - 0.0894841775 * x - 1.291485548 * y) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) =>
    Math.round(
      Math.max(0, Math.min(1, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)) * 255
    )
  ) as RGB;
}

function largestPassing(predicate: (value: number) => boolean): number {
  let low = 0,
    high = 1;
  for (let i = 0; i < 26; i++) {
    const middle = (low + high) / 2;
    if (predicate(middle)) low = middle;
    else high = middle;
  }
  return low;
}

/** Derive static progress paint from the authored palette, for CSS and host metadata.
 * All interpolation adds white in sRGB, so even antialiased glyph edges brighten.
 * Neutral surfaces share a conservative contrast bound; no DOM sampling is needed. */
export function createProgressTokens(
  mode: 'light' | 'dark',
  tokens: Readonly<FloeThemeTokenMap>
): FloeThemeTokenMap {
  const read = (name: `--${string}`): RGB => {
    const hex = tokens[name];
    if (!hex || !/^#[\da-f]{6}$/iu.test(hex))
      throw new Error(`Progress palette requires an opaque hex color: ${name}`);
    return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as RGB;
  };
  const surfaces = ['--background', '--card', '--muted', '--accent', '--popover', '--sidebar'].map(
    (name) => read(name as `--${string}`)
  );
  const readable = (ink: RGB, minimum: number) =>
    surfaces.every((surface) => contrast(ink, surface) >= minimum);
  let textBase = textInk(read('--foreground'), mode === 'dark' ? 0.69 : 0.2);
  if (mode === 'dark') {
    while (
      (!readable(textBase, 4.55) || contrast(textBase, read('--background')) < 5) &&
      textBase.some((v) => v < 255)
    )
      textBase = textBase.map((v) => Math.min(255, v + 1)) as RGB;
  }
  const textPeak = mixWhite(
    textBase,
    mode === 'dark' ? 1 : largestPassing((amount) => readable(mixWhite(textBase, amount), 4.65))
  );
  let primaryBase = read('--primary');
  const ink = read('--primary-foreground');
  let whiteMix = 0.28;
  if (luminance(ink) > luminance(primaryBase)) {
    const scale = largestPassing(
      (value) =>
        contrast(mixWhite(primaryBase.map((v) => Math.round(v * value)) as RGB, whiteMix), ink) >=
        4.65
    );
    primaryBase = primaryBase.map((v) => Math.round(v * scale)) as RGB;
  } else {
    const delta = (amount: number) => {
      const a = lab(primaryBase),
        b = lab(mixWhite(primaryBase, amount));
      return Math.hypot(...a.map((v, i) => v - b[i]));
    };
    while (delta(1) < 0.105) primaryBase = primaryBase.map((v) => Math.floor(v * 0.99)) as RGB;
    while (delta(whiteMix) < 0.105 && whiteMix < 1) whiteMix = Math.min(1, whiteMix + 0.005);
  }
  return {
    '--floe-progress-text-base': css(textBase),
    '--floe-progress-text-peak': css(textPeak),
    '--floe-progress-primary-base': css(primaryBase),
    '--floe-progress-primary-white-mix': `${(whiteMix * 100).toFixed(1)}%`,
  };
}
