/**
 * Lucide pictograms for the illustration catalogs, read from `@ng-icons/lucide` so the artwork
 * engraves the very icons the interface shows. Every icon becomes one path data string in its
 * 24-unit box, ready to be projected onto a face by `parse` + `plane`.
 */
import * as LUCIDE from '@ng-icons/lucide';
import { circle, parse, rrect } from './iso.mjs';

/**
 * One element's path data rewritten in absolute commands. Elements are joined into a single
 * path afterwards, where a leading relative `m` would otherwise continue from the previous
 * element's end instead of the icon's origin.
 */
const absolute = (d) =>
  parse(d)
    .map((sg) => (sg[0] === 'Z' ? 'Z' : sg[0] + sg.slice(1).flat().join(' ')))
    .join('');

/** Value of one attribute of an SVG element tag. */
const attr = (tag, name) => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? match[1] : null;
};

/** Numeric attribute, defaulting to 0. */
const num = (tag, name) => Number.parseFloat(attr(tag, name) ?? '0');

/** Point list of a polyline or polygon as path data. */
const points = (tag) => {
  const values = (attr(tag, 'points') ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const pairs = [];
  for (let i = 0; i + 1 < values.length; i += 2) pairs.push(`${values[i]} ${values[i + 1]}`);
  return `M${pairs.join('L')}`;
};

/** One SVG shape element as path data. */
function toPath(tag) {
  const kind = /^<(\w+)/.exec(tag)[1];
  if (kind === 'path') return attr(tag, 'd');
  if (kind === 'circle') return circle(num(tag, 'cx'), num(tag, 'cy'), num(tag, 'r'));
  if (kind === 'ellipse') {
    const [cx, cy, rx, ry] = ['cx', 'cy', 'rx', 'ry'].map((n) => num(tag, n));
    return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
  }
  if (kind === 'rect') {
    const [x, y, w, h] = ['x', 'y', 'width', 'height'].map((n) => num(tag, n));
    const r = Math.max(num(tag, 'rx'), num(tag, 'ry'));
    return r > 0 ? rrect(x, y, w, h, r) : `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  }
  if (kind === 'line')
    return `M${num(tag, 'x1')} ${num(tag, 'y1')}L${num(tag, 'x2')} ${num(tag, 'y2')}`;
  if (kind === 'polyline') return points(tag);
  if (kind === 'polygon') return `${points(tag)}Z`;
  throw new Error(`Unsupported Lucide element <${kind}>`);
}

/**
 * Path data of a Lucide icon by its kebab-case name (`fire-extinguisher`, `building-2`).
 *
 * @param {string} name
 * @returns {string}
 */
export function icon(name) {
  const key = `lucide${name
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')}`;
  const svg = LUCIDE[key];
  if (typeof svg !== 'string') throw new Error(`Unknown Lucide icon "${name}"`);
  return svg
    .match(/<(?:path|circle|ellipse|rect|line|polyline|polygon)\b[^>]*>/g)
    .map((tag) => absolute(toPath(tag)))
    .join('');
}
