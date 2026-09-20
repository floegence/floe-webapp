import labelPaths from './fileIconLabels.json';
import type { FileIconDefinition } from './fileIconCatalog';

const LABELS: Record<string, { d: string; width: number; cap: number }> = labelPaths;

const P = (d: string, attrs = '') => `<path d="${d}" ${attrs}/>`;
const R = (x: number, y: number, w: number, h: number, r: number, attrs = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ${attrs}/>`;
const C = (x: number, y: number, r: number, attrs = '') =>
  `<circle cx="${x}" cy="${y}" r="${r}" ${attrs}/>`;
function word(
  text: string,
  cx: number,
  baseline: number,
  maxWidth: number,
  capHeight: number,
  color: string
) {
  const f = LABELS[text];
  const scale = Math.min(maxWidth / f.width, capHeight / f.cap);
  return `<path d="${f.d}" transform="translate(${cx - (f.width * scale) / 2} ${baseline}) scale(${scale} ${-scale})" fill="${color}" stroke="none"/>`;
}
const formatMotifs: Record<string, (color: string) => string> = {
  json: (c) =>
    P(
      'M19 12h-2c-1 0-2 1-2 2v2c0 2-2 3-2 3s2 1 2 3v2c0 1 1 2 2 2h2m10-14h2c1 0 2 1 2 2v2c0 2 2 3 2 3s-2 1-2 3v2c0 1-1 2-2 2h-2',
      `fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"`
    ),
  yaml: (c) =>
    P(
      'M16 14v10h5M16 19h5M25 14h8M25 19h8M25 24h8',
      `fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round"`
    ) + C(16, 14, 1.7, `fill="${c}"`),
  toml: (c) =>
    P(
      'M18 12h-4v14h4M30 12h4v14h-4M20 15h8M24 15v9',
      `fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`
    ),
  xml: (c) =>
    P(
      'm19 13-6 6 6 6m10-12 6 6-6 6M26 12l-4 14',
      `fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`
    ),
  ini: (c) =>
    P(
      'M15 14h18M15 20h18M15 25h18M20 12v4M28 18v4M23 23v4',
      `fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"`
    ),
  env: (c) =>
    P('M17 12v14M24 12v14M31 12v14', `fill="none" stroke="${c}" stroke-width="1.4"`) +
    R(14, 15, 6, 4, 1, `fill="${c}"`) +
    R(21, 21, 6, 4, 1, `fill="${c}"`) +
    R(28, 13, 6, 4, 1, `fill="${c}"`),
  package: (c) =>
    P(
      'm24 11 9 4v10l-9 4-9-4V15Zm-9 4 9 4 9-4M24 19v10M19.5 13l9 4v5',
      `fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"`
    ),
  lock: (c) =>
    R(17, 18, 14, 10, 2, `fill="${c}"`) +
    P('M20 18v-4a4 4 0 0 1 8 0v4', `fill="none" stroke="${c}" stroke-width="2"`) +
    R(23.2, 21, 1.6, 4, 0.8, 'fill="var(--ink)"'),
  tsconfig: (c) => word('TS', 24, 25, 20, 12, c),
  text: (c) =>
    P(
      'M15 14h17M15 19h17M15 24h11',
      `fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round"`
    ),
  pdf: (c) =>
    P(
      'M16 25c5-3 10-12 8-14-3-3-4 9 4 12 7 3 9-3 3-3-6 0-14 2-15 5Z',
      `fill="none" stroke="${c}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`
    ),
};
function documentIcon(label: string, motif: string, c: string, grad: string, compact: boolean) {
  if (compact)
    return R(2, 9, 44, 30, 6, `fill="${c}"`) + word(label, 24, 30.5, 39, 13, 'var(--ink)');
  return (
    P(
      'M12 3h17l10 10v29a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z',
      `fill="url(#${grad}-paper)" stroke="var(--paper-stroke)" stroke-width="1.05"`
    ) +
    P(
      'M29 3v8a2 2 0 0 0 2 2h8',
      `fill="var(--fold)" stroke="var(--paper-stroke)" stroke-width="1.05" stroke-linejoin="round"`
    ) +
    `<g transform="translate(0 5) scale(1 .8)">${formatMotifs[motif](c)}</g>` +
    R(3, 30, 42, 13, 3, `fill="${c}"`) +
    P('M7 31h34', `stroke="var(--white)" stroke-opacity=".23" stroke-width=".7"`) +
    word(label, 24, 40.5, 35, 8.7, 'var(--ink)')
  );
}
function cog(cx: number, cy: number, r: number, teeth: number) {
  const points = [];
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i * Math.PI * 2) / (teeth * 4) - Math.PI / 2;
    const radius = i % 4 === 1 || i % 4 === 2 ? r : r - 2.7;
    points.push(
      `${(cx + Math.cos(a) * radius).toFixed(2)},${(cy + Math.sin(a) * radius).toFixed(2)}`
    );
  }
  return points.join(' ');
}
function drawing(id: string, c: string, g: string, small: boolean): string {
  const ink = 'var(--ink)',
    white = 'var(--white)';
  const stroke = `fill="none" stroke="${c}" stroke-width="${small ? 2.7 : 1.7}" stroke-linecap="round" stroke-linejoin="round"`;
  const fill = `fill="${c}"`;
  switch (id) {
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return (
        R(5, 4, 38, 40, small ? 5 : 6, `fill="url(#${g}-color)"`) +
        (!small ? P('M10 5.5h28', `stroke="${white}" stroke-opacity=".3" stroke-width="1"`) : '') +
        word(id.toUpperCase(), 24, small ? 34 : 35, 31, id.length === 2 ? 23 : 16, ink)
      );
    case 'python': {
      const snake =
        'M24 4c-10 0-11 4-11 8v5h12v2H10c-6 0-8 5-8 10s3 10 8 10h5v-7c0-5 4-9 9-9h8c5 0 9-4 9-9v-2c0-5-6-8-17-8Z';
      return (
        P(snake, `fill="${c}"`) +
        P(snake, `fill="var(--yellow)" transform="rotate(180 24 24)"`) +
        C(20, 9, 1.7, `fill="${ink}"`) +
        C(28, 39, 1.7, `fill="${ink}"`)
      );
    }
    case 'go':
      return P('M3 15h9M1 21h9M4 27h7', `${stroke} opacity=".75"`) + word('GO', 28, 34, 34, 24, c);
    case 'rust':
      return (
        `<polygon points="${cog(24, 24, 21, small ? 10 : 14)}" fill="${c}"/>` +
        C(24, 24, 15, `fill="var(--surface)"`) +
        C(24, 24, 15, `fill="none" stroke="${c}" stroke-width="1"`) +
        word('R', 24, 33, 20, 19, c)
      );
    case 'css':
      return R(5, 4, 38, 40, 6, `fill="${c}"`) + word('CSS', 24, 34, 31, 20, ink);
    case 'html':
      return (
        P('M6 4h36l-3.5 36L24 45 9.5 40Z', `fill="url(#${g}-color)"`) +
        P('M24 8h13.5l-3 29L24 40Z', `fill="${white}" opacity=".12"`) +
        (id === 'html'
          ? P(
              'M15 13h19l-.5 5H20l.5 5H33l-1.2 12-7.8 2.5-7.8-2.5-.5-6h5l.2 2 3.1 1 3.1-1 .3-3H15.8Z',
              `fill="${white}"`
            )
          : P(
              'M15 13h20l-.5 5-9 5h8.5l-1.3 12-8 2.5-7.5-2.5-.6-6h5l.2 2 2.9 1 3.4-1 .3-3H17.2l-.4-5 9-5H15.4Z',
              `fill="${white}"`
            ))
      );
    case 'shell':
      return (
        R(3, 6, 42, 36, 5, `fill="${c}" fill-opacity=".13" stroke="${c}" stroke-width="1.5"`) +
        (!small
          ? P('M4 14h40', `stroke="${c}" stroke-opacity=".3"`) +
            C(8, 10, 1, fill) +
            C(12, 10, 1, fill)
          : '') +
        P(
          'm11 21 8 6-8 6M25 34h11',
          `fill="none" stroke="${c}" stroke-width="${small ? 3 : 2.4}" stroke-linecap="round" stroke-linejoin="round"`
        )
      );
    case 'sql':
      return (
        P(
          'M6 10v28c0 9 36 9 36 0V10',
          `fill="url(#${g}-color)" fill-opacity=".27" stroke="${c}" stroke-width="1.7"`
        ) +
        `<ellipse cx="24" cy="10" rx="18" ry="6" fill="${c}" fill-opacity=".5" stroke="${c}" stroke-width="1.7"/>` +
        P('M6 23c0 8 36 8 36 0', stroke) +
        (!small ? P('M6 32c0 8 36 8 36 0', `${stroke} opacity=".6"`) : '')
      );
    case 'graphql': {
      const pts = [
        [24, 4],
        [41.3, 14],
        [41.3, 34],
        [24, 44],
        [6.7, 34],
        [6.7, 14],
      ];
      return (
        P('m24 4 17.3 10v20L24 44 6.7 34V14ZM24 4l17.3 30H6.7L24 4Z', stroke) +
        pts.map(([x, y]) => C(x, y, small ? 3.8 : 3.2, fill)).join('')
      );
    }
    case 'vue':
      return (
        P('M2 7h10l12 21L36 7h10L24 46Z', fill) +
        P('M12 7h8l4 7 4-7h8L24 28Z', 'fill="var(--brand-secondary)"')
      );
    case 'c':
    case 'cpp':
      return (
        P('m24 2 20 11v22L24 46 4 35V13Z', `fill="url(#${g}-color)"`) +
        word('C', id === 'c' ? 24 : 18, 35, id === 'c' ? 25 : 22, 24, ink) +
        (id === 'cpp'
          ? P('M31 21v9m-4.5-4.5h9M40 21v9m-4.5-4.5h9', `stroke="${ink}" stroke-width="2.6"`)
          : '')
      );
    case 'git':
      return (
        P(
          'M21 3a4 4 0 0 1 6 0l18 18a4 4 0 0 1 0 6L27 45a4 4 0 0 1-6 0L3 27a4 4 0 0 1 0-6Z',
          `fill="url(#${g}-color)"`
        ) +
        P('m16 9 17 17M18 12v22', `stroke="${ink}" stroke-width="2.6" fill="none"`) +
        C(18, 16, 3.5, `fill="${ink}"`) +
        C(18, 34, 3.5, `fill="${ink}"`) +
        C(32, 26, 3.5, `fill="${ink}"`)
      );
    case 'ignore':
      return (
        R(
          7,
          4,
          34,
          40,
          5,
          `fill="url(#${g}-paper)" stroke="var(--paper-stroke)" stroke-width="1.3"`
        ) +
        P('M14 12h16M14 18h10', stroke) +
        C(29, 32, 11, `fill="var(--surface)" stroke="${c}" stroke-width="2"`) +
        P('m21 40 16-16', `stroke="${c}" stroke-width="2"`)
      );
    case 'docker': {
      let boxes = '';
      const cells = small
        ? [
            [9, 17],
            [17, 17],
            [25, 17],
            [25, 9],
          ]
        : [
            [6, 19],
            [14, 19],
            [22, 19],
            [30, 19],
            [14, 11],
            [22, 11],
            [22, 3],
          ];
      for (const [x, y] of cells) boxes += R(x, y, 6, 6, 0.8, fill);
      return (
        boxes +
        P(
          'M3 27h31c5 0 7-2 8-6-1-2-1-4 0-6 4 2 6 5 5 8-1 6-5 8-9 9-4 9-9 12-18 12-10 0-16-6-17-17Z',
          `fill="url(#${g}-color)"`
        ) +
        C(11, 32, 1.3, `fill="${ink}"`) +
        (!small
          ? P(
              'M6 36c7 4 12 4 18 2',
              `stroke="${ink}" stroke-opacity=".45" stroke-width="1.1" fill="none"`
            )
          : '')
      );
    }
    case 'markdown':
      return (
        R(3, 7, 42, 34, 5, `fill="url(#${g}-paper)" stroke="${c}" stroke-width="1.4"`) +
        P(
          'M10 31V17l6 7 6-7v14M33 17v13m-5-4 5 5 5-5',
          `fill="none" stroke="${c}" stroke-width="${small ? 3 : 2.6}" stroke-linejoin="round" stroke-linecap="round"`
        )
      );
    case 'license':
      return (
        P(
          'M10 3h20l9 9v30a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z',
          `fill="url(#${g}-paper)" stroke="var(--paper-stroke)" stroke-width="1.3"`
        ) +
        P('M14 13h13M14 19h17M14 25h9', stroke) +
        P('m28 33-3 12 7-4 7 4-3-12', fill) +
        `<polygon points="${cog(32, 30, 9, 8)}" fill="${c}"/>` +
        C(32, 30, 4, `fill="${ink}" fill-opacity=".28"`)
      );
    case 'svg':
      return (
        P('M8 36C8 8 40 8 40 36M7 10h34', stroke) +
        R(3, 33, 10, 10, 2, `fill="var(--surface)" stroke="${c}" stroke-width="2"`) +
        R(35, 33, 10, 10, 2, `fill="var(--surface)" stroke="${c}" stroke-width="2"`) +
        R(20, 6, 8, 8, 1.5, `fill="${c}"`) +
        C(7, 10, 2, fill) +
        C(41, 10, 2, fill)
      );
    case 'image':
      return (
        R(
          4,
          5,
          40,
          38,
          5,
          `fill="url(#${g}-color)" fill-opacity=".17" stroke="${c}" stroke-width="1.6"`
        ) +
        C(16, 16, 4, fill) +
        P('m6 35 10-12 8 7 8-11 10 16v5H6Z', `fill="${c}" fill-opacity=".65"`) +
        P(
          'm6 35 10-12 8 7 8-11 10 16',
          `fill="none" stroke="${c}" stroke-width="1.3" stroke-linejoin="round"`
        )
      );
    case 'video':
      return (
        R(
          3,
          6,
          42,
          36,
          5,
          `fill="url(#${g}-color)" fill-opacity=".21" stroke="${c}" stroke-width="1.5"`
        ) +
        P('m20 15 14 9-14 9Z', fill) +
        [12, 21, 30].map((y) => R(7, y, 3, 5, 0.7, fill) + R(38, y, 3, 5, 0.7, fill)).join('')
      );
    case 'audio':
      return (
        C(
          23,
          25,
          19,
          `fill="url(#${g}-color)" fill-opacity=".2" stroke="${c}" stroke-width="1.3"`
        ) +
        (!small
          ? C(23, 25, 14, `fill="none" stroke="${c}" stroke-opacity=".3" stroke-width="1.1"`)
          : '') +
        P(
          'M21 31V12l17-3v18M21 18l17-3',
          `fill="none" stroke="${c}" stroke-width="2.3" stroke-linejoin="round"`
        ) +
        `<ellipse cx="17" cy="33" rx="5" ry="3.5" fill="${c}"/><ellipse cx="34" cy="29" rx="5" ry="3.5" fill="${c}"/>`
      );
    case 'archive':
      return (
        R(
          7,
          3,
          34,
          42,
          5,
          `fill="url(#${g}-color)" fill-opacity=".25" stroke="${c}" stroke-width="1.5"`
        ) +
        R(19, 4, 10, 40, 1, `fill="${c}" fill-opacity=".25"`) +
        [7, 13, 19].map((y) => P(`M20 ${y}h4m0 3h4`, `stroke="${c}" stroke-width="2.5"`)).join('') +
        R(20, 28, 8, 9, 2, `fill="${c}"`) +
        R(22, 30, 4, 4, 1, `fill="${ink}"`)
      );
    case 'font':
      return (
        R(3, 6, 42, 36, 5, `fill="url(#${g}-paper)" stroke="${c}" stroke-width="1.4"`) +
        word('Aa', 24, 33, 33, 21, c)
      );
    case 'folder':
      return (
        P(
          'M5 8h13l5 5h19a3 3 0 0 1 3 3v23a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V11a3 3 0 0 1 3-3Z',
          `fill="${c}" fill-opacity=".72"`
        ) +
        P(
          'M4 18h40a2 2 0 0 1 2 2l-2 20a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4L2 20a2 2 0 0 1 2-2Z',
          `fill="url(#${g}-color)"`
        ) +
        (!small
          ? P(
              'M7 19.5h34',
              `stroke="${white}" stroke-opacity=".45" stroke-width="1.1" stroke-linecap="round"`
            )
          : '')
      );
    case 'code':
      return drawing('file', c, g, small) + formatMotifs.xml(c);
    case 'file':
      return (
        P(
          'M12 3h17l10 10v29a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z',
          `fill="url(#${g}-paper)" stroke="var(--paper-stroke)" stroke-width="${small ? 2 : 1.3}"`
        ) +
        P(
          'M29 3v8a2 2 0 0 0 2 2h8',
          `fill="var(--fold)" stroke="var(--paper-stroke)" stroke-width="1.3"`
        )
      );
  }
  throw new Error('Unknown file icon drawing: ' + id);
}
// Family drawings share geometry only when their semantics genuinely align.
Object.assign(formatMotifs, {
  writing: (c: string) =>
    P('M15 14h17M15 19h17M15 24h10', `stroke="${c}" stroke-width="1.6" stroke-linecap="round"`),
  table: (c: string) =>
    R(14, 12, 20, 15, 1, `stroke="${c}" stroke-width="1.4"`) +
    P('M14 17h20M14 22h20M21 12v15', `stroke="${c}" stroke-width="1.2"`),
  slides: (c: string) =>
    R(14, 12, 20, 13, 1, `stroke="${c}" stroke-width="1.5"`) +
    P('m22 16 6 3-6 3ZM24 25v3m-4 0h8', `fill="${c}" stroke="${c}" stroke-width="1.2"`),
  schema: (c: string) =>
    R(20, 11, 8, 5, 1, `fill="${c}"`) +
    R(12, 23, 8, 5, 1, `fill="${c}"`) +
    R(28, 23, 8, 5, 1, `fill="${c}"`) +
    P('M24 16v4H16v3m8-3h8v3', `stroke="${c}" stroke-width="1.3"`),
  build: (c: string) =>
    P(
      'm17 26 13-13m-11 0 4-4 12 12-4 4Z',
      `stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
    ),
  terminal: (c: string) =>
    P('m15 14 6 5-6 5m11 1h8', `stroke="${c}" stroke-width="2" stroke-linecap="round"`),
  database: (c: string) =>
    `<ellipse cx="24" cy="14" rx="9" ry="3" fill="${c}"/>` +
    P('M15 14v10c0 4 18 4 18 0V14M15 19c0 4 18 4 18 0', `stroke="${c}" stroke-width="1.5"`),
  notebook: (c: string) =>
    R(15, 11, 19, 17, 2, `stroke="${c}" stroke-width="1.5"`) +
    P(
      'M20 11v17M13 15h4M13 20h4M13 25h4M24 16h6M24 21h5',
      `stroke="${c}" stroke-width="1.3" stroke-linecap="round"`
    ),
  book: (c: string) =>
    P(
      'M24 14c-3-3-7-3-11-2v14c4-1 8-1 11 2 3-3 7-3 11-2V12c-4-1-8-1-11 2Zm0 0v14',
      `stroke="${c}" stroke-width="1.5" stroke-linejoin="round"`
    ),
  palette: (c: string) =>
    P(
      'M24 11c-8 0-12 4-12 9s5 8 10 8c4 0 3-4 5-4h4c7 0 6-13-7-13Z',
      `stroke="${c}" stroke-width="1.5"`
    ) +
    [
      [18, 16],
      [24, 14],
      [30, 16],
      [16, 22],
    ]
      .map(([x, y]) => C(x, y, 1.3, `fill="${c}"`))
      .join(''),
  vector: (c: string) =>
    P('M14 25c0-16 20-16 20 0M13 13h22', `stroke="${c}" stroke-width="1.5"`) +
    R(12, 23, 4, 4, 0.5, `fill="${c}"`) +
    R(32, 23, 4, 4, 0.5, `fill="${c}"`) +
    R(22, 11, 4, 4, 0.5, `fill="${c}"`),
  camera: (c: string) =>
    R(13, 14, 22, 13, 2, `stroke="${c}" stroke-width="1.5"`) +
    P('M19 14v-3h10v3', `stroke="${c}" stroke-width="1.5"`) +
    C(24, 20.5, 4, `stroke="${c}" stroke-width="1.5"`),
  certificate: (c: string) =>
    P('M16 12h15v13H16ZM19 16h9M19 20h5', `stroke="${c}" stroke-width="1.3"`) +
    C(31, 24, 4, `fill="${c}"`),
  key: (c: string) =>
    C(19, 17, 5, `stroke="${c}" stroke-width="1.8"`) +
    P('m23 21 10 7m-4-3 2-3', `stroke="${c}" stroke-width="2" stroke-linecap="round"`),
  file: (c: string) =>
    P('M18 11h9l5 5v12H18ZM27 11v5h5', `stroke="${c}" stroke-width="1.5" stroke-linejoin="round"`),
});
function languageTile(item: FileIconDefinition, _c: string, g: string, small: boolean) {
  const label = item.label;
  return (
    R(5, 4, 38, 40, 6, `fill="url(#${g}-color)"`) +
    (!small ? P('M11 6h26', `stroke="var(--white)" stroke-opacity=".23" stroke-width="1"`) : '') +
    word(label, 24, 33, 32, label.length <= 2 ? 23 : label.length <= 4 ? 17 : 13, 'var(--ink)')
  );
}
function creativeIcon(item: FileIconDefinition, c: string, g: string, small: boolean) {
  if (item.palette?.background)
    return (
      R(
        4,
        3,
        40,
        42,
        7,
        `fill="var(--brand-background)" stroke="${c}" stroke-opacity=".55" stroke-width="${small ? 1.6 : 1}"`
      ) + word(item.label, 24, 34, 32, 23, c)
    );
  if (item.id === '3d')
    return (
      P(
        'm24 3 19 10v22L24 45 5 35V13Zm-19 10 19 11 19-11M24 24v21',
        `fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="${small ? 2.7 : 1.7}" stroke-linejoin="round"`
      ) +
      (!small
        ? P(
            'm15 8 19 11v21M5 24l19 10 19-10',
            `fill="none" stroke="${c}" stroke-opacity=".4" stroke-width="1"`
          )
        : '')
    );
  if (item.id === 'figma')
    return (
      R(8, 3, 16, 14, 7, 'fill="var(--red)"') +
      R(24, 3, 16, 14, 7, 'fill="var(--orange)"') +
      R(8, 17, 16, 14, 7, 'fill="var(--purple)"') +
      C(32, 24, 7, 'fill="var(--cyan)"') +
      P('M15 31h9v7a8 8 0 0 1-16 0 7 7 0 0 1 7-7Z', 'fill="var(--green)"')
    );
  if (item.id === 'sketch')
    return (
      P('M12 6h24l10 12-22 27L2 18Z', 'fill="var(--brand-shadow)"') +
      P('M12 6h24l10 12H2Z', 'fill="var(--brand-secondary)"') +
      P('m16 18 8-12 8 12Z', 'fill="var(--brand-highlight)"') +
      P('m16 18 8 27 8-27Z', `fill="${c}"`) +
      P('M12 6 2 18h14Zm24 0 10 12H32Z', 'fill="var(--brand-highlight)"')
    );
  if (item.id === 'blender')
    return (
      P(
        'M3 19h14L9 10h9l9 9c17-3 22 23 3 26-12 2-20-6-17-15L4 33l-3-6 17-8Z',
        `fill="url(#${g}-color)"`
      ) +
      C(28, 31, 9, 'fill="var(--surface)"') +
      C(28, 31, 6, 'fill="var(--cyan)"')
    );
  return (
    R(
      4,
      3,
      40,
      42,
      7,
      `fill="${c}" fill-opacity=".15" stroke="${c}" stroke-width="${small ? 2 : 1.4}"`
    ) +
    (!small ? P('M11 5h26', `stroke="${c}" stroke-opacity=".35" stroke-width="1"`) : '') +
    word(item.label, 24, 34, 32, item.label.length <= 2 ? 23 : 18, c)
  );
}
function installerIcon(item: FileIconDefinition, c: string, g: string, small: boolean) {
  const s = `stroke="${c}" stroke-width="${small ? 2.5 : 1.5}" stroke-linejoin="round"`;
  let body = '';
  if (item.draw === 'disk')
    body =
      R(8, 4, 32, 34, 5, `fill="url(#${g}-paper)" ${s}`) +
      C(24, 18, 10, `fill="${c}" fill-opacity=".15" ${s}`) +
      C(24, 18, 3, `fill="var(--surface)" ${s}`) +
      (!small ? P('m18 12 3 3m6 6 3 3', `stroke="${c}" stroke-opacity=".45"`) : '');
  else if (item.draw === 'box')
    body =
      P(
        'm24 3 18 8v22L24 41 6 33V11Zm-18 8 18 8 18-8M24 19v22M15 7l18 8v9',
        `fill="${c}" fill-opacity=".2" ${s}`
      ) + (!small ? P('m29 30 8-4', s) : '');
  else if (item.draw === 'android')
    body =
      R(9, 14, 30, 23, 7, `fill="${c}" fill-opacity=".25" ${s}`) +
      P('m14 14-4-7m24 7 4-7', `${s} stroke-linecap="round"`) +
      C(18, 21, 1.6, `fill="${c}"`) +
      C(30, 21, 1.6, `fill="${c}"`);
  else
    body =
      R(6, 4, 36, 34, 6, `fill="url(#${g}-paper)" ${s}`) +
      R(13, 12, 9, 9, 2, `fill="${c}"`) +
      R(26, 12, 9, 9, 2, `fill="${c}" fill-opacity=".55"`) +
      R(13, 25, 9, 8, 2, `fill="${c}" fill-opacity=".55"`) +
      R(26, 25, 9, 8, 2, `fill="${c}"`);
  return (
    body + R(3, 32, 42, 13, 3, `fill="${c}"`) + word(item.label, 24, 42.5, 35, 8.7, 'var(--ink)')
  );
}
const nativeDrawing = drawing;
function drawNative(id: string, c: string, g: string, small: boolean) {
  if (id === 'swift')
    return (
      R(4, 3, 40, 42, 8, `fill="url(#${g}-color)"`) +
      P(
        'M10 14c6 5 12 9 18 12-5-5-9-10-13-15 7 6 13 10 19 13 1-6-1-11-5-16 9 5 14 14 11 23 3 3 4 6 3 10-4-4-7-5-11-2-8 3-17 0-23-7 7 4 13 4 18 1-7-5-12-10-17-19Z',
        'fill="var(--white)"'
      )
    );
  if (id === 'java')
    return (
      P(
        'M12 24h22v8a11 11 0 0 1-22 0Zm22 2h3a5 5 0 0 1 0 10h-5M8 43h31',
        `fill="${c}" fill-opacity=".2" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"`
      ) +
      P(
        'M20 20c-11-8 16-7 4-18m6 18c-6-5 7-7 5-12',
        `fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round"`
      )
    );
  if (id === 'powershell')
    return (
      P('M10 7h34l-7 34H3Z', `fill="url(#${g}-color)"`) +
      P(
        'm15 15 11 9-15 9m14 1h10',
        `stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`
      )
    );
  return nativeDrawing(id, c, g, small);
}
export function renderFileIconBody(
  item: FileIconDefinition,
  c: string,
  g: string,
  compact: boolean
) {
  if (item.family === 'document') return documentIcon(item.label, item.motif, c, g, compact);
  if (item.family === 'language') return languageTile(item, c, g, compact);
  if (item.family === 'creative') return creativeIcon(item, c, g, compact);
  if (item.family === 'installer') return installerIcon(item, c, g, compact);
  if (item.family === 'archive')
    return (
      nativeDrawing('archive', c, g, compact) +
      R(3, 32, 42, 13, 3, `fill="${c}"`) +
      word(item.label, 24, 42.5, 35, 8.7, 'var(--ink)')
    );
  return drawNative(item.draw, c, g, compact);
}
