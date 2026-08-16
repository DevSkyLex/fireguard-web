#!/usr/bin/env node
/**
 * Builds `public/map/style-light.json` and `public/map/style-dark.json` from
 * OpenFreeMap's "positron" style (`tools/map-style/positron-source.json`,
 * fetched once from `https://tiles.openfreemap.org/styles/positron`).
 *
 * Every paint/layout color is desaturated to the app's achromatic neutral
 * scale (`oklch(L 0 0)` in `src/styles.css`) — hue and saturation stripped,
 * lightness kept — because the source style carries a faint green/blue tint
 * that the shared map primitive must not reintroduce. The dark variant then
 * inverts each color's lightness around the midpoint, mirroring how
 * `html[data-theme="dark"]` inverts the neutral ramp in `src/styles.css`.
 *
 * The unused `ne2_shaded` raster source (no layer in the style references
 * it) is dropped. Every other layer is kept: the source style already holds
 * only the orientation set — land, water, buildings, roads, railways,
 * boundaries, waterway/place labels — with no POI icon layers.
 *
 * Run with `node tools/map-style/build-map-styles.mjs` whenever the source
 * style is re-fetched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = resolve(HERE, 'positron-source.json');
const OUTPUT_DIR = resolve(HERE, '../../public/map');

/**
 * Parses a CSS color string (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`, `hsl()`,
 * `hsla()`) into `{ h, s, l, a }`, or returns `null` when the string is not
 * a recognized color.
 *
 * @param {string} value
 * @returns {{ h: number, s: number, l: number, a: number } | null}
 */
function parseColor(value) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split('')
            .map((c) => c + c)
            .join('')
        : hex[1];
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    return { ...rgbToHsl(r, g, b), a: 1 };
  }

  const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(
    value,
  );
  if (rgb) {
    const [, r, g, b, a] = rgb;
    return { ...rgbToHsl(Number(r), Number(g), Number(b)), a: a === undefined ? 1 : Number(a) };
  }

  const hsl = /^hsla?\(\s*([\d.]+)[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:[,\s/]+([\d.]+))?\s*\)$/i.exec(
    value,
  );
  if (hsl) {
    const [, h, s, l, a] = hsl;
    return { h: Number(h), s: Number(s), l: Number(l), a: a === undefined ? 1 : Number(a) };
  }

  return null;
}

/**
 * Converts an 8-bit RGB triple to `{ h, s, l }` (degrees, percent, percent).
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, s: number, l: number }}
 */
function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }

  return { h: h * 60, s: s * 100, l: l * 100 };
}

/**
 * Renders a grayscale color (hue and saturation stripped) at the given
 * lightness and alpha, as `hsl()`/`hsla()`.
 *
 * @param {number} l - Lightness, 0-100.
 * @param {number} a - Alpha, 0-1.
 * @returns {string}
 */
function toGrayCss(l, a) {
  const clamped = Math.min(100, Math.max(0, l));
  return a === 1
    ? `hsl(0, 0%, ${clamped.toFixed(1)}%)`
    : `hsla(0, 0%, ${clamped.toFixed(1)}%, ${a})`;
}

/**
 * Desaturates a single value if it is a recognized color string; anything
 * else is returned unchanged. `invert` mirrors lightness around the
 * midpoint, producing the dark-theme counterpart of a light-theme gray.
 *
 * @param {unknown} value
 * @param {boolean} invert
 * @returns {unknown}
 */
function neutralize(value, invert) {
  if (typeof value !== 'string') return value;

  const parsed = parseColor(value);
  if (!parsed) return value;

  const lightness = invert ? 100 - parsed.l : parsed.l;
  return toGrayCss(lightness, parsed.a);
}

/**
 * Deep-walks a paint/layout value tree (plain values, expression arrays, or
 * stop objects) and neutralizes every color found.
 *
 * @param {unknown} node
 * @param {boolean} invert
 * @returns {unknown}
 */
function walk(node, invert) {
  if (Array.isArray(node)) return node.map((child) => walk(child, invert));
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, child]) => [key, walk(child, invert)]),
    );
  }
  return neutralize(node, invert);
}

/**
 * Builds one theme variant of the style from the source document.
 *
 * @param {Record<string, unknown>} source
 * @param {boolean} invert
 * @returns {Record<string, unknown>}
 */
function buildVariant(source, invert) {
  const { ne2_shaded: unused, ...sources } = source.sources;
  void unused;

  return {
    ...source,
    sources,
    layers: source.layers.map((layer) => ({
      ...layer,
      ...(layer.paint ? { paint: walk(layer.paint, invert) } : {}),
      ...(layer.layout ? { layout: walk(layer.layout, invert) } : {}),
    })),
  };
}

const source = JSON.parse(readFileSync(SOURCE_PATH, 'utf-8'));

writeFileSync(
  resolve(OUTPUT_DIR, 'style-light.json'),
  `${JSON.stringify(buildVariant(source, false), null, 2)}\n`,
);
writeFileSync(
  resolve(OUTPUT_DIR, 'style-dark.json'),
  `${JSON.stringify(buildVariant(source, true), null, 2)}\n`,
);
