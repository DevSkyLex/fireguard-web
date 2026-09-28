import { icon } from './icons.mjs';
/**
 * Composition kit of the illustration catalogs, after the three reference plates: keycaps on a
 * keyboard slab (one lifted over a lit slot), rounded cubes with dotted inner edges, a lidded
 * translucent volume, thin sheets, and turned objects built as surfaces of revolution.
 *
 * Every helper paints back to front into a `Scene`: fills first, then inner edges, then the
 * silhouette, then any engraved Lucide icon. Class names map to the palette of `svg.mjs`.
 */
import {
  DEG,
  K,
  X,
  Y,
  add,
  band,
  chain,
  circle,
  combo,
  extrude,
  lin,
  mapSegs,
  marks,
  mul,
  parse,
  plane,
  rbox,
  shift,
  solid,
} from './iso.mjs';

/** Axes of a horizontal face for pictograms: upright on screen, foreshortened like a decal. */
export const TOP_U = [Math.SQRT1_2, -Math.SQRT1_2, 0];

/** Downward axis of a horizontal face for pictograms (screen down). */
export const TOP_V = [Math.SQRT1_2, Math.SQRT1_2, 0];

/** Horizontal axis of a vertical face turned toward +x (screen lower right). */
export const RIGHT_U = [0, -1, 0];

/** Downward axis of any vertical face. */
export const DOWN = [0, 0, -1];

/** Axis of an upright glyph on a face turned toward +y: in the face, horizontal on screen. */
export const UP_LEFT = [1, 0, 0.5];

/** Screen-space offset (sx, sy) expressed as a 3D vector: `lin` maps it back to (sx, sy). */
export const screen = (sx, sy) => [sx / (2 * K), -sx / (2 * K), -sy];

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Closed polyline through 3D points. */
export const loop = (pts) => [['M', pts[0]], ...pts.slice(1).map((p) => ['L', p]), ['Z']];

/** Open polyline through 3D points. */
export const line = (...pts) => [['M', pts[0]], ...pts.slice(1).map((p) => ['L', p])];

/**
 * Draws path data (in a `box`-unit square) in the plane (U, V), centred on c, `size` units wide.
 *
 * @returns the plane mapping of the box, for extra marks drawn in the same frame.
 */
export function pathAt(sc, cls, d, c, size, { box = 24, U = TOP_U, V = TOP_V } = {}) {
  const map = plane(combo(c, [U, -size / 2], [V, -size / 2]), U, V, size / box);
  sc.add(cls, mapSegs(parse(d), map));
  return map;
}

/** Engraves a Lucide icon, upright on a horizontal face unless other axes are given. */
export const iconAt = (sc, cls, name, c, size, U = TOP_U, V = TOP_V) =>
  pathAt(sc, cls, icon(name), c, size, { U, V });

/** Visible front run of a horizontal footprint at height dz above the solid's base. */
export const ringAt = (s, dz) => chain(shift(s.near, [0, 0, dz]));

/** Class of a face from its outward normal: top, right (+x) or left (+y). */
const faceClass = (n) => {
  const [ax, ay, az] = n.map(Math.abs);
  if (az >= ax && az >= ay) return 't';
  return n[0] >= n[1] ? 'r' : 'l';
};

/**
 * Paints a solid: faces, inner edges (`edge`: solid `e`, dotted `d` or none), horizontal
 * rings at the given heights, then the silhouette.
 */
export function paint(sc, s, { sil = 'o2', edge = 'e', rings = [], top = 't' } = {}) {
  for (const f of s.faces) sc.add(f.cls, f.d);
  sc.add(top, s.cap);
  if (edge) {
    sc.add(edge, s.rim);
    for (const seam of s.seams) sc.add(edge, seam);
  }
  for (const dz of rings) sc.add('e', ringAt(s, dz));
  sc.add(sil, s.sil);
  return s;
}

/** Horizontal rounded box painted in one call. */
export const block = (sc, o, style) => paint(sc, rbox(o), style);

/** Vertical cylinder painted in one call (a box whose corner radius is its half width). */
export const drum = (sc, { x = 0, y = 0, z = 0, r, h }, style) =>
  paint(sc, rbox({ x, y, z, w: 2 * r, d: 2 * r, h, r }), style);

/** A lit slot on a horizontal surface: dark recess, accent gradient from the rear, accent rim. */
export function litSlot(
  sc,
  id,
  { x = 0, y = 0, w, d, r = 0 },
  z,
  { rim = 'oa', strength = 'glow' } = {},
) {
  const m = marks({ x, y, w, d, r }, z);
  const f = rbox({ x, y, z, w, d, r, h: 0 });
  sc.add('hole', f.cap);
  sc.add(
    sc.linear(id, m.rear, m.fore, [
      [0, 'a', strength],
      [1, 'a', 0.03],
    ]),
    f.cap,
  );
  if (rim) sc.add(rim, f.cap);
}

/** Dotted uprights from a lifted footprint's visible corners down to z. */
export function uprights(sc, o, zTop, zBottom, cls = 'da') {
  const up = marks(o, zTop);
  const down = marks(o, zBottom);
  for (const k of ['left', 'fore', 'right']) sc.guide(cls, up[k], down[k]);
}

/**
 * Keycap after reference 1: a rounded box split in two bands, its icon engraved on top.
 * `lift` raises it over a lit slot joined by dotted uprights; `hero` brightens the outline.
 */
export function key(
  sc,
  {
    x = 0,
    y = 0,
    z = 0,
    w = 80,
    d = w,
    h = 18,
    r = 5,
    icon: name = null,
    size = Math.min(w, d) * 0.62,
    hero = false,
    accent = hero,
    lift = 0,
    glow = 'slot',
    split = 0.5,
    sil = hero ? 'o' : 'o2',
  } = {},
) {
  const zb = z + lift;
  if (lift > 0) {
    litSlot(sc, glow, { x, y, w, d, r }, z);
    uprights(sc, { x, y, w, d, r }, zb, z);
  }
  const s = paint(sc, rbox({ x, y, z: zb, w, d, h, r }), {
    sil,
    rings: split ? [h * split] : [],
  });
  if (name) iconAt(sc, accent ? 'ka' : 'k', name, [x, y, zb + h], size);
  return { s, top: zb + h };
}

/** Rounded cube after reference 2: bright or quiet silhouette, fine inner edges, icon on top. */
export function cube(
  sc,
  {
    x = 0,
    y = 0,
    z = 0,
    s = 100,
    h = s,
    r = 9,
    icon: name = null,
    size = s * 0.5,
    hero = false,
    accent = false,
  },
) {
  const b = paint(sc, rbox({ x, y, z, w: s, d: s, h, r }), { sil: hero ? 'o' : 'o2' });
  if (name) iconAt(sc, accent ? 'ka' : 'k', name, [x, y, z + h], size);
  return b;
}

/** Keyboard slab after reference 1: bright silhouette, inset rim and optional cell grooves. */
export function slab(
  sc,
  { x = 0, y = 0, z = 0, w, d, h = 12, r = 12, inset = 12, grid = null, sil = 'o' },
) {
  const s = paint(sc, rbox({ x, y, z, w, d, h, r }), { sil });
  const zt = z + h;
  if (inset)
    sc.add(
      'e',
      rbox({ x, y, z: zt, w: w - 2 * inset, d: d - 2 * inset, r: Math.max(2, r - inset / 2) }).cap,
    );
  if (grid) {
    const { cols, rows } = grid;
    const [iw, id] = [w - 2 * inset, d - 2 * inset];
    for (let c = 1; c < cols; c++) {
      const gx = x - iw / 2 + (iw * c) / cols;
      sc.guide('e', [gx, y - id / 2, zt], [gx, y + id / 2, zt]);
    }
    for (let rr = 1; rr < rows; rr++) {
      const gy = y - id / 2 + (id * rr) / rows;
      sc.guide('e', [x - iw / 2, gy, zt], [x + iw / 2, gy, zt]);
    }
  }
  return { s, top: zt };
}

/**
 * Translucent volume after reference 3: a lit haze behind dotted edges, optionally capped by
 * a solid lid. Returns the height of its top.
 */
export function glass(
  sc,
  id,
  { x = 0, y = 0, z = 0, w, d, h },
  { lid = 0, overhang = 3, floor = true, tone = 'a', edges = 'd' } = {},
) {
  const o = { x, y, w, d, r: 0 };
  const b = solid({ c: [x, y, z], a: w / 2, b: d / 2, r: 0, t: h });
  const m0 = marks(o, z);
  const m1 = marks(o, z + h);
  if (floor)
    sc.add(
      sc.linear(`${id}-floor`, m0.rear, m0.fore, [
        [0, tone, 'glow'],
        [1, tone, 0.02],
      ]),
      rbox({ ...o, z, h: 0 }).cap,
    );
  sc.add(
    sc.linear(
      id,
      [x, y, z + h],
      [x, y, z],
      [
        [0, tone, 'haze'],
        [1, tone, 0.02],
      ],
    ),
    b.sil,
  );
  for (const [p, q] of [
    [m0.rear, m0.left],
    [m0.rear, m0.right],
    [m0.rear, m1.rear],
  ])
    sc.guide(edges, p, q);
  for (const k of ['left', 'fore', 'right']) sc.guide(edges, m0[k], m1[k]);
  sc.add(edges, line(m0.left, m0.fore, m0.right));
  if (!lid) {
    sc.add(edges, rbox({ ...o, z: z + h, h: 0 }).cap);
    return z + h;
  }
  block(
    sc,
    { x, y, z: z + h, w: w + 2 * overhang, d: d + 2 * overhang, h: lid, r: 2 },
    { sil: 'o' },
  );
  return z + h + lid;
}

/**
 * Open tray: outer walls, a hollow interior lit from its floor and clipped to the opening.
 * Returns the floor height and the inner footprint.
 */
export function tray(
  sc,
  id,
  { x = 0, y = 0, z = 0, w, d, h, wall = 10, r = 8, floor = 4 },
  { sil = 'o', lit = true } = {},
) {
  const outer = rbox({ x, y, z, w, d, h, r });
  for (const f of outer.faces) sc.add(f.cls, f.d);
  const inner = { x, y, w: w - 2 * wall, d: d - 2 * wall, r: Math.max(1, r - wall / 2) };
  const zt = z + h;
  const zf = z + floor;
  const opening = rbox({ ...inner, z: zt }).cap;
  sc.add('t eo', [...outer.cap, ...opening]);
  const clip = sc.clipTo(`${id}-opening`, opening);
  const bed = rbox({ ...inner, z: zf }).cap;
  sc.add('hole', opening, clip);
  if (lit) {
    const m = marks(inner, zf);
    sc.add(
      sc.linear(id, m.rear, m.fore, [
        [0, 'a', 'glow'],
        [1, 'a', 0.03],
      ]),
      bed,
      clip,
    );
  }
  const hole = solid({ c: [x, y, zf], a: inner.w / 2, b: inner.d / 2, r: inner.r, t: zt - zf });
  const topRun = shift(hole.far, hole.off);
  hole.far.forEach((bottom, i) => {
    const inward = mul(bottom.normal, -1);
    sc.add(faceClass(inward), band([topRun[i]], [bottom]), clip);
  });
  sc.add('e', chain(hole.far), clip);
  sc.add('e', outer.rim);
  for (const seam of outer.seams) sc.add('e', seam);
  sc.add('e', opening);
  sc.add(sil, outer.sil);
  return { zf, inner, zt };
}

/**
 * Thin sheet lying flat (paper, card, badge). Returns the plane of its top face with the
 * origin at the rear corner, u along x and v along y, in world units.
 */
export function sheet(
  sc,
  { x = 0, y = 0, z = 0, w, d, h = 3, r = 3 },
  { sil = 'o2', edge = 'e', top = 't' } = {},
) {
  paint(sc, rbox({ x, y, z, w, d, h, r }), { sil, edge, top });
  return plane([x - w / 2, y - d / 2, z + h], X, Y);
}

/** Text rows on a face mapped by `map`: [u0, u1, v] triples. */
export const rows = (sc, cls, map, list) => {
  for (const [u0, u1, v] of list) sc.add(cls, line(map([u0, v]), map([u1, v])));
};

/** Identity projection of points that are already 2D. */
const flat2 = (p) => p;

/** Ramer–Douglas–Peucker simplification of a polyline, measured on screen through `view`. */
function simplify(pts, tol, view = flat2) {
  if (pts.length < 3) return pts;
  const [a, b] = [view(pts[0]), view(pts.at(-1))];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let worst = 0;
  let at = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = view(pts[i]);
    const dd = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / len;
    if (dd > worst) [worst, at] = [dd, i];
  }
  if (worst <= tol) return [pts[0], pts.at(-1)];
  return [
    ...simplify(pts.slice(0, at + 1), tol, view).slice(0, -1),
    ...simplify(pts.slice(at), tol, view),
  ];
}

/** Unit tangent of a horizontal circle at plan angle t (degrees). */
const tangentAt = (t) => [-Math.sin(t * DEG), Math.cos(t * DEG), 0];

/** Horizontal circle of radius r at height z around (x, y), from plan angle t0 to t1 (degrees). */
export function ringArc(x, y, z, r, t0, t1, move = true) {
  const at = (t) => [x + r * Math.cos(t * DEG), y + r * Math.sin(t * DEG), z];
  const tg = tangentAt;
  const steps = Math.max(1, Math.ceil(Math.abs(t1 - t0) / 45));
  const step = (t1 - t0) / steps;
  const k = (4 / 3) * Math.tan((step * DEG) / 4) * r;
  const out = move ? [['M', at(t0)]] : [];
  for (let i = 0; i < steps; i++) {
    const a0 = t0 + i * step;
    out.push([
      'C',
      add(at(a0), mul(tg(a0), k)),
      add(at(a0 + step), mul(tg(a0 + step), -k)),
      at(a0 + step),
    ]);
  }
  return out;
}

/** Full horizontal circle. */
export const ring = (x, y, z, r) => [...ringArc(x, y, z, r, 0, 360), ['Z']];

/**
 * Surface of revolution around the vertical through (x, y): `r(z)` gives the radius between
 * `z0` and `z1`. Paints the side (the exact outline of the stacked circles, with the cylinder
 * shading), the top cap, the visible front arcs of `rims`, then the silhouette. A rim is a
 * height, or a `[z, r]` pair for a step where the radius jumps.
 */
export function lathe(
  sc,
  { x = 0, y = 0, z0, z1, r, rims = [], cap = true },
  { sil = 'o', rim = 'e', fill = 'cy', top = 't' } = {},
) {
  const rings = [];
  for (let i = 0; i <= 600; i++) {
    const z = z0 + ((z1 - z0) * i) / 600;
    const rz = r(z);
    if (rz > 1e-6) rings.push({ z, A: rz * Math.sqrt(1.5), B: rz * Math.SQRT1_2 });
  }
  const yTop = Math.min(...rings.map((q) => -q.z - q.B));
  const yBottom = Math.max(...rings.map((q) => -q.z + q.B));
  const right = [];
  const steps = Math.ceil((yBottom - yTop) / 0.06);
  for (let i = 0; i <= steps; i++) {
    const sy = yTop + ((yBottom - yTop) * i) / steps;
    let widest = 0;
    for (const q of rings) {
      const u = (sy + q.z) / q.B;
      if (u > -1 && u < 1) widest = Math.max(widest, q.A * Math.sqrt(1 - u * u));
    }
    right.push([widest, sy]);
  }
  const half = simplify(right, 0.03);
  const outline = [...half, ...half.toReversed().map(([sx, sy]) => [-sx, sy])];
  const path = loop(outline.map(([sx, sy]) => add([x, y, 0], screen(sx, sy))));
  sc.add(fill, path);
  const slope = (z) => {
    const a = Math.max(z0, z - 0.05);
    const b = Math.min(z1, z + 0.05);
    return (r(b) - r(a)) / (b - a);
  };
  const rt = r(z1);
  if (cap && rt > 0.5) {
    sc.add(top, ring(x, y, z1, rt));
    sc.add(rim, ringArc(x, y, z1, rt, -45, 135));
  }
  for (const item of rims) {
    if (Array.isArray(item)) {
      sc.add(rim, ringArc(x, y, item[0], item[1], -45, 135));
      continue;
    }
    const s = Math.SQRT1_2 * slope(item);
    if (Math.abs(s) >= 1) continue;
    const phi = Math.asin(s) / DEG;
    sc.add(rim, ringArc(x, y, item, r(item), phi - 45, 135 - phi));
  }
  if (sil) sc.add(sil, path);
  return { top: z1, path };
}

/** Sphere of radius rho: a screen circle with its visible equator. */
export function sphere(sc, c, rho, { sil = 'o2', fill = 't', equator = 'e' } = {}) {
  const R = rho * Math.sqrt(1.5);
  const path = mapSegs(parse(circle(0, 0, R)), ([sx, sy]) => add(c, screen(sx, sy)));
  sc.add(fill, path);
  if (equator) sc.add(equator, ringArc(c[0], c[1], c[2], rho, -45, 135));
  sc.add(sil, path);
}

/**
 * Tube of screen width w along 3D points (a hose, a wire, a strap): a round-capped outline,
 * filled then stroked.
 */
export function tube(sc, pts, w, { sil = 'o2', fill = 't', caps = true } = {}) {
  const P = pts.map(lin);
  const n = P.length;
  const side = (sign) =>
    pts.map((p, i) => {
      const a = P[Math.max(0, i - 1)];
      const b = P[Math.min(n - 1, i + 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return add(
        p,
        screen(((-(b[1] - a[1]) / len) * w * sign) / 2, (((b[0] - a[0]) / len) * w * sign) / 2),
      );
    });
  const capAt = (i, dir) => {
    const a = P[Math.max(0, i - dir)];
    const b = P[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = [((b[0] - a[0]) / len) * dir, ((b[1] - a[1]) / len) * dir];
    const nrm = [-t[1], t[0]];
    const out = [];
    for (let k = 1; k < 8; k++) {
      const th = (Math.PI * k) / 8;
      const u = Math.cos(th);
      const v = Math.sin(th);
      out.push(
        add(pts[i], screen(((nrm[0] * u + t[0] * v) * w) / 2, ((nrm[1] * u + t[1] * v) * w) / 2)),
      );
    }
    return out;
  };
  const left = side(1);
  const right = side(-1);
  const outline = [
    ...simplify(left, 0.03, lin),
    ...(caps ? capAt(n - 1, 1) : []),
    ...simplify(right.toReversed(), 0.03, lin),
    ...(caps ? capAt(0, -1) : []),
  ];
  sc.add(fill, loop(outline));
  sc.add(sil, loop(outline));
}

/** Points along a cubic Bézier through 3D control points. */
export function bezier(p0, p1, p2, p3, n = 32) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const w = 1 - t;
    return combo(
      [0, 0, 0],
      [p0, w * w * w],
      [p1, 3 * w * w * t],
      [p2, 3 * w * t * t],
      [p3, t * t * t],
    );
  });
}

/** Stable key of a vertex, to match the shared edges of a polyhedron. */
const vertexId = (p) => p.map((v) => v.toFixed(3)).join(',');

/** Convex polyhedron from its faces: visible faces shaded, shared edges, hull silhouette. */
export function poly(sc, faces, { sil = 'o2', edge = 'e', fill = null } = {}) {
  const all = faces.flat();
  const centre = mul(
    all.reduce((s, p) => add(s, p), [0, 0, 0]),
    1 / all.length,
  );
  const view = [1, 1, 1];
  const shown = [];
  for (const f of faces) {
    let nrm = cross(sub(f[1], f[0]), sub(f[2], f[0]));
    const mid = mul(
      f.reduce((s, p) => add(s, p), [0, 0, 0]),
      1 / f.length,
    );
    if (dot(nrm, sub(mid, centre)) < 0) nrm = mul(nrm, -1);
    if (dot(nrm, view) > 1e-9) shown.push({ f, nrm });
  }
  for (const { f, nrm } of shown) sc.add(fill ?? faceClass(nrm), loop(f));
  const seen = new Map();
  const id = vertexId;
  for (const { f } of shown)
    f.forEach((p, i) => {
      const q = f[(i + 1) % f.length];
      const k = [id(p), id(q)].toSorted().join('|');
      seen.set(k, { p, q, count: (seen.get(k)?.count ?? 0) + 1 });
    });
  for (const { p, q, count } of seen.values()) if (count > 1) sc.guide(edge, p, q);
  sc.add(sil, loop(hull(all)));
}

/** Screen turn direction of three projected points (positive: counter-clockwise). */
const turn = (o, a, b) =>
  (a.s[0] - o.s[0]) * (b.s[1] - o.s[1]) - (a.s[1] - o.s[1]) * (b.s[0] - o.s[0]);

/** Convex hull of 3D points as projected on screen (monotone chain), counter-clockwise. */
export function hull(points) {
  const pts = points
    .map((p) => ({ p, s: lin(p) }))
    .toSorted((a, b) => a.s[0] - b.s[0] || a.s[1] - b.s[1]);
  const build = (list) => {
    const out = [];
    for (const q of list) {
      while (out.length >= 2 && turn(out.at(-2), out.at(-1), q) <= 1e-9) out.pop();
      out.push(q);
    }
    return out;
  };
  const lower = build(pts);
  const upper = build(pts.toReversed());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)].map((q) => q.p);
}

/** Closed straight-edged prism standing on z: visible walls, cap, then silhouette. */
export function prism(sc, pts, z, h, { sil = 'o2', edge = 'e', top = 't' } = {}) {
  const area = pts.reduce(
    (s, p, i) => s + p[0] * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * p[1],
    0,
  );
  const ringPts = area > 0 ? pts : pts.toReversed();
  const m = ringPts.length;
  const facing = ringPts.map((p, i) => {
    const q = ringPts[(i + 1) % m];
    return q[1] - p[1] - (q[0] - p[0]) > 0;
  });
  const walls = [];
  ringPts.forEach((p, i) => {
    if (!facing[i]) return;
    const q = ringPts[(i + 1) % m];
    walls.push({
      p,
      q,
      i,
      depth: p[0] + p[1] + q[0] + q[1],
      cls: q[1] - p[1] > -(q[0] - p[0]) ? 'r' : 'l',
    });
  });
  for (const w of walls.toSorted((u, v) => u.depth - v.depth)) {
    sc.add(
      w.cls,
      loop([
        [...w.p, z + h],
        [...w.q, z + h],
        [...w.q, z],
        [...w.p, z],
      ]),
    );
    const outer = !facing[(w.i + m - 1) % m];
    sc.guide(outer ? sil : edge, [...w.p, z + h], [...w.p, z]);
    if (!facing[(w.i + 1) % m]) sc.guide(sil, [...w.q, z + h], [...w.q, z]);
    sc.guide(sil, [...w.p, z], [...w.q, z]);
  }
  const cap = loop(ringPts.map(([px, py]) => [px, py, z + h]));
  sc.add(top, cap);
  sc.add(sil, cap);
}

/**
 * Flat outline (SVG path data) extruded upward from the horizontal plane through `o`, mapped
 * with the (U, V) axes at scale s: walls, then the lit or plain top face.
 */
export const slabShape = (sc, d, { o, U = X, V = Y, s = 1, h = 8 }, style) =>
  extrude(sc, d, { o, U, V, N: [0, 0, 1], s, t: h }, style);

/**
 * Flat outline standing as a plate: drawn in the plane (U, V) through `o` and extruded by t
 * along N toward the viewer. Returns the plane of its front face.
 */
export const plateShape = (sc, d, { o, U = X, V = DOWN, N = Y, s = 1, t = 8 }, style) =>
  extrude(sc, d, { o, U, V, N, s, t }, style);

/** Person as the interface draws one, in the round: a domed bust under a spherical head. */
export function bust(sc, { x = 0, y = 0, z = 0, s = 1, sil = 'o2' } = {}) {
  const R = 42 * s;
  const H = 28 * s;
  lathe(
    sc,
    {
      x,
      y,
      z0: z,
      z1: z + H * 0.999,
      r: (zz) => R * Math.sqrt(Math.max(0, 1 - ((zz - z) / H) ** 2)) ** 0.7,
      cap: false,
    },
    { sil },
  );
  sphere(sc, [x, y, z + H + 22 * s], 19 * s, { sil, equator: null });
}

/** Location marker: a sphere tapering to a point, with the icon's round window. */
export function mapPin(sc, { x = 0, y = 0, z = 0, R = 26, sil = 'oa', window = 'oa' } = {}) {
  const H = 2.3 * R;
  const sinA = R / H;
  const cosA = Math.sqrt(1 - sinA * sinA);
  const zt = H * cosA * cosA;
  const r = (zz) => {
    const u = zz - z;
    if (u <= zt) return (u * sinA) / cosA;
    return Math.sqrt(Math.max(0, R * R - (u - H) ** 2));
  };
  lathe(sc, { x, y, z0: z, z1: z + H + R * 0.999, r, cap: false }, { sil });
  const c = [x, y, z + H];
  sc.add(
    'hole',
    mapSegs(parse(circle(0, 0, R * 0.42)), ([sx, sy]) => add(c, screen(sx, sy))),
  );
  sc.add(
    window,
    mapSegs(parse(circle(0, 0, R * 0.42)), ([sx, sy]) => add(c, screen(sx, sy))),
  );
}

/**
 * Visible band of a surface of revolution between two heights, as a closed path: the front
 * arcs at `za` (radius ra) and `zb` (radius rb) joined along the silhouette generators.
 */
export function latheBand(x, y, za, ra, zb, rb) {
  const slope = (rb - ra) / (zb - za);
  const phi = Math.asin(Math.max(-1, Math.min(1, Math.SQRT1_2 * slope))) / DEG;
  const [t0, t1] = [phi - 45, 135 - phi];
  const at = (z, r, t) => [x + r * Math.cos(t * DEG), y + r * Math.sin(t * DEG), z];
  return [
    ...ringArc(x, y, za, ra, t0, t1),
    ['L', at(zb, rb, t1)],
    ...ringArc(x, y, zb, rb, t1, t0, false),
    ['Z'],
  ];
}

/** Magnifier lying flat: a thick ring around a tinted lens, handle toward +x. */
export function magnifier(sc, { x = 0, y = 0, z = 0, R = 66, rim = 13, h = 14, id = 'lens' }) {
  const ri = R - rim;
  const outer = rbox({ x, y, z, w: 2 * R, d: 2 * R, h, r: R });
  for (const f of outer.faces) sc.add(f.cls, f.d);
  const lens = rbox({ x, y, z: z + h, w: 2 * ri, d: 2 * ri, r: ri }).cap;
  sc.add('t eo', [...outer.cap, ...lens]);
  const m = marks({ x, y, w: 2 * ri, d: 2 * ri, r: ri }, z + h);
  sc.add(
    sc.linear(id, m.rear, m.fore, [
      [0, 'a', 'haze'],
      [1, 'a', 0.03],
    ]),
    lens,
  );
  sc.add('e', outer.rim);
  sc.add('oa', lens);
  sc.add('o', outer.sil);
  block(sc, { x: x + R + 44, y, z: z + 2, w: 96, d: 24, h: 10, r: 9 }, { sil: 'o' });
}

/** Dotted wireframe of an absent box: top outline, front uprights and front base edges. */
export function ghost(sc, { x = 0, y = 0, z = 0, w, d = w, h = 0, r = 4 }, cls = 'd') {
  sc.add(cls, rbox({ x, y, z: z + h, w, d, r }).cap);
  if (h <= 0) return;
  const b = marks({ x, y, w, d, r }, z);
  const t = marks({ x, y, w, d, r }, z + h);
  for (const k of ['left', 'fore', 'right']) sc.guide(cls, b[k], t[k]);
  sc.add(cls, line(b.left, b.fore, b.right));
}
