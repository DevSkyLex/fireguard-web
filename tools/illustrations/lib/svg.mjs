/**
 * SVG serialisation for the illustration catalogs: the paired light/dark palettes and
 * the emitter that fits a scene to the 400×320 canvas.
 */
import { W, H, MARGIN, project } from './iso.mjs';

/**
 * Light and dark tones on the app's zinc ramp, monochrome like the reference plates. Faces sit
 * at the page background so only the linework draws the volumes; the brightest neutral (`a`)
 * is kept for the one lit area and its focal contour.
 */
export const PALETTE = {
  dark: {
    t: '#0c0c0f',
    l: '#121215',
    r: '#0f0f12',
    hole: '#060607',
    o: '#a1a1aa',
    o2: '#71717a',
    e: '#3f3f46',
    d: '#71717a',
    k: '#8e8e97',
    f: '#bdbdc5',
    a: '#f4f4f5',
    glow: 0.26,
    haze: 0.09,
  },
  light: {
    t: '#ffffff',
    l: '#f6f6f7',
    r: '#efeff1',
    hole: '#ececef',
    o: '#8a8a93',
    o2: '#a8a8b0',
    e: '#dcdce0',
    d: '#a1a1aa',
    k: '#85858e',
    f: '#5f5f68',
    a: '#18181b',
    glow: 0.12,
    haze: 0.045,
  },
};

const n = (v) => {
  const s = (Math.round(v * 10) / 10)
    .toFixed(1)
    .replace(/\.0$/, '')
    .replace(/^(-?)0\./, '$1.');
  return s === '-0' ? '0' : s;
};

/** Join coordinates, dropping the separator before a sign. */
const nums = (list) => list.map(n).join(' ').replace(/ -/g, '-');

/** Serialises a scene into one themed, self-contained 400×320 SVG document. */
export function emit(scene, theme, base, title, desc) {
  const pal = PALETTE[theme];
  const pts = scene.items.flatMap((it) => it.segs.flatMap((s) => s.slice(1).map(project)));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((W - 2 * MARGIN) / (x1 - x0), (H - 2 * MARGIN) / (y1 - y0));
  const T = (p3) => {
    const [px, py] = project(p3);
    return [(px - (x0 + x1) / 2) * s + W / 2, (py - (y0 + y1) / 2) * s + H / 2];
  };
  const d = (segs) =>
    segs
      .map((sg) => (sg[0] === 'Z' ? 'Z' : sg[0] + nums(sg.slice(1).flatMap((p) => T(p)))))
      .join('');
  const scope = `${base}-${theme}`;
  const op = (o) => (typeof o === 'string' ? pal[o] : o);
  const stops = (list) =>
    list
      .map(
        ([o, key, a]) => `<stop offset="${o}" stop-color="${pal[key]}" stop-opacity="${op(a)}"/>`,
      )
      .join('');
  const grads = scene.grads
    .map((g) => {
      if (g.type === 'linear') {
        const [ax, ay] = T(g.a);
        const [bx, by] = T(g.b);
        return `<linearGradient id="${scope}-${g.id}" gradientUnits="userSpaceOnUse" x1="${n(ax)}" y1="${n(ay)}" x2="${n(bx)}" y2="${n(by)}">${stops(g.stops)}</linearGradient>`;
      }
      const [cx, cy] = T(g.c);
      const rx = 1.2247449 * g.r * s;
      return `<radialGradient id="${scope}-${g.id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(rx)}" gradientTransform="translate(${n(cx)} ${n(cy)}) scale(1 .57735) translate(${n(-cx)} ${n(-cy)})">${stops(g.stops)}</radialGradient>`;
    })
    .join('\n    ');
  const cyl = `<linearGradient id="${scope}-cy" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${pal.l}"/><stop offset="1" stop-color="${pal.r}"/></linearGradient>`;
  const clipDefs = scene.clips
    .map((cl) => `<clipPath id="${scope}-${cl.id}"><path d="${d(cl.segs)}"/></clipPath>`)
    .join('');
  const merged = [];
  for (const it of scene.items) {
    const prev = merged.at(-1);
    if (prev && prev.cls === it.cls && prev.clip === it.clip && !it.cls.startsWith('#'))
      prev.d += d(it.segs);
    else merged.push({ cls: it.cls, clip: it.clip, d: d(it.segs) });
  }
  const body = merged
    .map((it) => {
      const clip = it.clip ? ` clip-path="url(#${scope}-${it.clip})"` : '';
      if (it.cls.startsWith('#'))
        return `<path fill="url(#${scope}-${it.cls.slice(1)})"${clip} d="${it.d}"/>`;
      return `<path class="${it.cls}"${clip} d="${it.d}"/>`;
    })
    .join('\n  ');
  const c = `.${scope}`;
  const css = [
    `${c} { stroke-linecap: round; stroke-linejoin: round; }`,
    `${c} path { vector-effect: non-scaling-stroke; }`,
    `${c} .t { fill: ${pal.t}; }`,
    `${c} .l { fill: ${pal.l}; }`,
    `${c} .r { fill: ${pal.r}; }`,
    `${c} .hole { fill: ${pal.hole}; }`,
    `${c} .cy { fill: url(#${scope}-cy); }`,
    `${c} .af { fill: ${pal.f}; }`,
    `${c} .kf { fill: ${pal.k}; }`,
    `${c} .eo { fill-rule: evenodd; }`,
    `${c} .o { stroke: ${pal.o}; stroke-width: 1.35; }`,
    `${c} .o2 { stroke: ${pal.o2}; stroke-width: 1.1; }`,
    `${c} .e { stroke: ${pal.e}; stroke-width: 1; }`,
    `${c} .d { stroke: ${pal.d}; stroke-width: 1.2; stroke-dasharray: 0 3; }`,
    `${c} .dh { stroke: ${pal.e}; stroke-width: 1.2; stroke-dasharray: 0 3; }`,
    `${c} .g { stroke: ${pal.o2}; stroke-width: 1; stroke-dasharray: 3 3; }`,
    `${c} .k { stroke: ${pal.k}; stroke-width: 1.2; }`,
    `${c} .ka, ${c} .oa { stroke: ${pal.f}; stroke-width: 1.35; }`,
    `${c} .da { stroke: ${pal.f}; stroke-width: 1.2; stroke-dasharray: 0 3; }`,
    `${c} .ga { stroke: ${pal.f}; stroke-width: 1; stroke-dasharray: 3 3; }`,
  ].join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-labelledby="${scope}-title ${scope}-description" class="${scope}">
  <title id="${scope}-title">${title}</title>
  <desc id="${scope}-description">${desc}</desc>
  <defs>
    ${cyl}
    ${grads}
    ${clipDefs}
  </defs>
  <style>
    ${css}
  </style>
  ${body}
</svg>
`.replace(/^[\t ]+$/gm, '');
}
