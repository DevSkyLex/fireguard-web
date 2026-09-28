/**
 * Isometric drawing kit for the FireGuard illustration catalogs.
 *
 * Coordinates are plan units: x runs toward the lower right of the screen, y toward
 * the lower left and z upward, projected with a true 30° isometric. Shapes are built
 * as 3D path segments (`['M', p]`, `['L', p]`, `['C', p1, p2, p3]`, `['Z']`) so the
 * emitter can fit every scene to the canvas and bake the projection into the SVG.
 */
/** cos 30°, the horizontal factor of the isometric projection. */
export const K = Math.sqrt(3) / 2;

/** Canvas width shared by both catalogs. */
export const W = 400;

/** Canvas height shared by both catalogs. */
export const H = 320;

/** Degrees to radians. */
export const DEG = Math.PI / 180;

/** Free border kept around every fitted scene, in canvas units. */
export const MARGIN = 24;

/** Plan axis toward the lower right of the screen. */
export const X = [1, 0, 0];

/** Plan axis toward the lower left of the screen. */
export const Y = [0, 1, 0];

/** Vertical axis. */
export const Z = [0, 0, 1];

/** Sum of two 3D vectors. */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** 3D vector scaled by s. */
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];

/** Point c moved by a list of `[vector, amount]` terms. */
export const combo = (c, ...terms) => terms.reduce((p, [v, s]) => add(p, mul(v, s)), c);

/** Linear part of the projection: a 3D direction on screen. */
export const lin = (v) => [(v[0] - v[1]) * K, (v[0] + v[1]) / 2 - v[2]];

/** Screen position of a 3D point, before the emitter fits the scene. */
export const project = (p) => lin(p);

/** 2D cross product. */
export const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];

/** 2D dot product. */
export const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];

/** End point of a segment. */
export const last = (seg) => seg[seg.length - 1];

/** 3D distance. */
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Whether a piece has a length (degenerate corners are skipped). */
export const live = (p) => dist(p.a, last(p.seg)) > 1e-6;

/** Angle folded into [0, 360). */
export const norm360 = (t) => ((t % 360) + 360) % 360;

/** Pieces traversed backwards, curves included. */
export function reverse(pieces) {
  return pieces
    .toReversed()
    .map((p) =>
      p.seg[0] === 'L'
        ? { a: p.seg[1], seg: ['L', p.a], mid: p.mid }
        : { a: p.seg[3], seg: ['C', p.seg[2], p.seg[1], p.a], mid: p.mid },
    );
}

/** Path segments of consecutive pieces, optionally opened with a move. */
export function chain(pieces, move = true) {
  const kept = pieces.filter(live);
  if (!kept.length) return [];
  return [...(move ? [['M', kept[0].a]] : []), ...kept.map((p) => p.seg)];
}

/** Pieces translated by v. */
export const shift = (pieces, v) =>
  pieces.map((p) => ({
    a: add(p.a, v),
    seg: [p.seg[0], ...p.seg.slice(1).map((q) => add(q, v))],
    mid: p.mid,
  }));

/** First point of the first non-degenerate piece. */
export const startOf = (pieces) => (pieces.find(live) ?? pieces[0]).a;

/** Last point of the last non-degenerate piece. */
export const endOf = (pieces) => last((pieces.findLast(live) ?? pieces.at(-1)).seg);

/** Closed region between one chain and the same chain on the other cap. */
export function band(a, b) {
  // a: chain on one cap, b: the same chain on the other cap
  const t = chain(a);
  const rb = reverse(b).filter(live);
  if (!t.length || !rb.length) return [];
  return [...t, ['L', rb[0].a], ...rb.map((p) => p.seg), ['Z']];
}

/**
 * Rounded rectangle centred on c in the (U, V) plane, extruded by t along N.
 * Splits the outline at the screen tangents of the extrusion and at each corner's
 * midpoint, so the silhouette, the visible cap, the side faces and their seams
 * can be painted separately.
 */
export function solid({ c, U = X, V = Y, N = Z, a, b, r = 0, t = 0 }) {
  const rr = Math.max(0, Math.min(r, a, b));
  const Us = lin(U);
  const Vs = lin(V);
  const e = lin(mul(N, t));
  const tan = t > 0 ? norm360(Math.atan2(cross2(Vs, e), cross2(Us, e)) / DEG) : null;
  const cuts = tan === null ? [] : [tan, norm360(tan + 180)];
  const at = (cc, th) => combo(cc, [U, rr * Math.cos(th * DEG)], [V, rr * Math.sin(th * DEG)]);
  const arcPiece = (cc, t0, t1) => {
    const k = (4 / 3) * Math.tan(((t1 - t0) * DEG) / 4) * rr;
    const tg = (th) => combo([0, 0, 0], [U, -Math.sin(th * DEG)], [V, Math.cos(th * DEG)]);
    const p0 = at(cc, t0);
    const p3 = at(cc, t1);
    return {
      a: p0,
      seg: ['C', add(p0, mul(tg(t0), k)), add(p3, mul(tg(t1), -k)), p3],
      mid: (t0 + t1) / 2,
    };
  };
  const corners = [
    [1, 1, 0],
    [-1, 1, 90],
    [-1, -1, 180],
    [1, -1, 270],
  ];
  const pieces = [];
  corners.forEach(([sx, sy, t0], i) => {
    const cc = combo(c, [U, sx * (a - rr)], [V, sy * (b - rr)]);
    const angles = [t0, t0 + 45, t0 + 90];
    for (const cut of cuts) {
      const cu = cut < t0 - 1e-9 ? cut + 360 : cut;
      if (cu > t0 + 1e-6 && cu < t0 + 90 - 1e-6) angles.push(cu);
    }
    angles.sort((p, q) => p - q);
    for (let k = 0; k < angles.length - 1; k++) {
      const piece = arcPiece(cc, angles[k], angles[k + 1]);
      piece.seamAfter = Math.abs(angles[k + 1] - (t0 + 45)) < 1e-6;
      pieces.push(piece);
    }
    const [nx, ny, n0] = corners[(i + 1) % 4];
    const nc = combo(c, [U, nx * (a - rr)], [V, ny * (b - rr)]);
    pieces.push({ a: at(cc, t0 + 90), seg: ['L', at(nc, n0)], mid: t0 + 90 });
  });
  // Classify each piece by its projected outward normal against the extrusion.
  for (const p of pieces) {
    const th = p.mid * DEG;
    const nw = combo([0, 0, 0], [U, Math.cos(th)], [V, Math.sin(th)]);
    const tau = combo([0, 0, 0], [U, -Math.sin(th)], [V, Math.cos(th)]);
    const ts = lin(tau);
    let n2 = [ts[1], -ts[0]];
    if (dot2(n2, lin(nw)) < 0) n2 = [-n2[0], -n2[1]];
    p.far = t > 0 ? dot2(n2, e) > 0 : false;
    p.normal = nw;
  }
  // Rotate so that each class forms one contiguous run.
  let start = pieces.findIndex(
    (p, i) => p.far && !pieces[(i + pieces.length - 1) % pieces.length].far,
  );
  if (start < 0) start = 0;
  const ordered = [...pieces.slice(start), ...pieces.slice(0, start)];
  const farRun = ordered.filter((p) => p.far);
  const nearRun = ordered.filter((p) => !p.far);
  const off = mul(N, t);
  const capFar = N[0] + N[1] + N[2] > 0;
  const capOff = capFar ? off : [0, 0, 0];
  const capPieces = shift(ordered, capOff);
  const cap = [...chain(capPieces), ['Z']];
  if (t <= 0)
    return { cap, sil: cap, rim: [], faces: [], seams: [], normal: N, capPieces, U, V, c, a, b };
  const sil = [
    ...chain(shift(farRun, off)),
    ['L', startOf(nearRun)],
    ...chain(nearRun, false),
    ['Z'],
  ];
  // Side band: the visible cap's non-silhouette run, joined to the other cap.
  const sideRun = capFar ? nearRun : farRun;
  const sideCap = shift(sideRun, capOff);
  const sideOther = shift(sideRun, capFar ? [0, 0, 0] : off);
  const groups = [];
  let cur = [];
  sideRun.forEach((p, i) => {
    cur.push(i);
    if (p.seamAfter && i < sideRun.length - 1) {
      groups.push(cur);
      cur = [];
    }
  });
  if (cur.length) groups.push(cur);
  const faces = groups.map((g) => {
    const rep = sideRun[g[Math.floor(g.length / 2)]].normal;
    const cls = rep[2] >= rep[0] && rep[2] >= rep[1] ? 't' : rep[0] >= rep[1] ? 'r' : 'l';
    return {
      cls,
      d: band(
        g.map((i) => sideCap[i]),
        g.map((i) => sideOther[i]),
      ),
    };
  });
  const seams = groups.slice(0, -1).map((g) => {
    const p = endOf(g.map((i) => sideCap[i]));
    const q = endOf(g.map((i) => sideOther[i]));
    return [
      ['M', p],
      ['L', q],
    ];
  });
  return {
    cap,
    sil,
    rim: chain(sideCap),
    faces,
    side: band(sideCap, sideOther),
    seams,
    normal: N,
    capPieces,
    capOff,
    far: farRun,
    near: nearRun,
    off,
  };
}

/** Horizontal rounded box standing on z. */
export const rbox = ({ x = 0, y = 0, z = 0, w, d, h = 0, r = 0 }) =>
  solid({ c: [x, y, z], a: w / 2, b: d / 2, r, t: h });

/** Screen-extreme and front points of a horizontal rounded footprint. */
export function marks({ x = 0, y = 0, w, d, r = 0 }, z) {
  const rr = Math.min(r, w / 2, d / 2);
  const q = rr * (1 - Math.SQRT1_2);
  return {
    left: [x - w / 2 + q, y + d / 2 - q, z],
    fore: [x + w / 2 - q, y + d / 2 - q, z],
    right: [x + w / 2 - q, y - d / 2 + q, z],
    rear: [x - w / 2 + q, y - d / 2 + q, z],
  };
}

/** Quadratic Bézier from b through control q to p, raised to a cubic segment. */
const quadTo = (b, q, p) => [
  'C',
  [b[0] + (2 / 3) * (q[0] - b[0]), b[1] + (2 / 3) * (q[1] - b[1])],
  [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])],
  p,
];

/** Point mirrored through c, the implicit control point of the S and T commands. */
const mirror = (p, c) => [2 * c[0] - p[0], 2 * c[1] - p[1]];

/** SVG path data (every command, absolute or relative, compact arc flags included) as 2D segments. */
export function parse(d) {
  let i = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i])) i++;
  };
  const num = () => {
    skip();
    const match = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(d.slice(i));
    if (!match) throw new Error(`Bad path number at ${i} in "${d}"`);
    i += match[0].length;
    return Number.parseFloat(match[0]);
  };
  const flag = () => {
    skip();
    return d[i++] === '1';
  };
  const out = [];
  let cmd = '';
  let cur = [0, 0];
  let start = [0, 0];
  let prevCubic = null;
  let prevQuad = null;
  for (skip(); i < d.length; skip()) {
    if (/[a-zA-Z]/.test(d[i])) cmd = d[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const pt = () => {
      const u = num();
      const v = num();
      return rel ? [cur[0] + u, cur[1] + v] : [u, v];
    };
    let cubic = null;
    let quad = null;
    if (C === 'Z') {
      out.push(['Z']);
      cur = start;
    } else if (C === 'M') {
      cur = pt();
      start = cur;
      out.push(['M', cur]);
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      cur = pt();
      out.push(['L', cur]);
    } else if (C === 'H') {
      const u = num();
      cur = [rel ? cur[0] + u : u, cur[1]];
      out.push(['L', cur]);
    } else if (C === 'V') {
      const v = num();
      cur = [cur[0], rel ? cur[1] + v : v];
      out.push(['L', cur]);
    } else if (C === 'C' || C === 'S') {
      const p1 = C === 'C' ? pt() : prevCubic ? mirror(prevCubic, cur) : cur;
      const p2 = pt();
      const p3 = pt();
      out.push(['C', p1, p2, p3]);
      cubic = p2;
      cur = p3;
    } else if (C === 'Q' || C === 'T') {
      const q = C === 'Q' ? pt() : prevQuad ? mirror(prevQuad, cur) : cur;
      const p3 = pt();
      out.push(quadTo(cur, q, p3));
      quad = q;
      cur = p3;
    } else if (C === 'A') {
      const rx = Math.abs(num());
      const ry = Math.abs(num());
      const phi = num() * DEG;
      const large = flag();
      const sweep = flag();
      const p = pt();
      out.push(...arcToCubics(cur, rx, ry, phi, large, sweep, p));
      cur = p;
    } else throw new Error(`Unsupported path command ${cmd}`);
    prevCubic = cubic;
    prevQuad = quad;
  }
  return out;
}

/** Signed angle between two 2D vectors. */
const angleBetween = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);

/** SVG endpoint arc to cubic Béziers (SVG 2, appendix B.2.4). */
export function arcToCubics([x1, y1], rx, ry, phi, large, sweep, [x2, y2]) {
  if (rx === 0 || ry === 0) return [['L', [x2, y2]]];
  const cp = Math.cos(phi);
  const sp = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy;
  const y1p = -sp * dx + cp * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coef = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2;
  const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const t1 = angleBetween(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = angleBetween((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9));
  const step = dt / n;
  const E = (t) => [
    cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp,
    cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp,
  ];
  const D = (t) => [
    -rx * Math.sin(t) * cp - ry * Math.cos(t) * sp,
    -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp,
  ];
  const k = (4 / 3) * Math.tan(step / 4);
  const segs = [];
  for (let i = 0; i < n; i++) {
    const a = t1 + i * step;
    const b = a + step;
    const [ax, ay] = E(a);
    const [bx, by] = E(b);
    const [dax, day] = D(a);
    const [dbx, dby] = D(b);
    segs.push([
      'C',
      [ax + k * dax, ay + k * day],
      [bx - k * dbx, by - k * dby],
      i === n - 1 ? [x2, y2] : [bx, by],
    ]);
  }
  return segs;
}

/** Circle path data from four cubic arcs. */
export const circle = (cx, cy, r) => {
  const k = 0.5522847498 * r;
  return (
    `M${cx + r} ${cy}C${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r}` +
    `C${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy}` +
    `C${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r}` +
    `C${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy}Z`
  );
};

/** Rounded rectangle path data. */
export const rrect = (x, y, w, h, r) => {
  const k = 0.4477152502 * r;
  return (
    `M${x + r} ${y}H${x + w - r}C${x + w - k} ${y} ${x + w} ${y + k} ${x + w} ${y + r}V${y + h - r}` +
    `C${x + w} ${y + h - k} ${x + w - k} ${y + h} ${x + w - r} ${y + h}H${x + r}` +
    `C${x + k} ${y + h} ${x} ${y + h - k} ${x} ${y + h - r}V${y + r}C${x} ${y + k} ${x + k} ${y} ${x + r} ${y}Z`
  );
};

/** Segments with every point mapped by fn. */
export const mapSegs = (segs, fn) => segs.map((s) => [s[0], ...s.slice(1).map(fn)]);

/** Local (u, v) on a plane through o with unit axes U, V and scale s. */
export const plane =
  (o, U, V, s = 1) =>
  ([u, v]) =>
    combo(o, [U, u * s], [V, v * s]);

/** FireGuard mark (three lamellae) as path data in a 96-unit box. */
export const MARK =
  'M4 47Q4 40 8.95 35.05L23.05 20.95Q28 16 35 16h2Q44 16 39.05 20.95L24.95 35.05Q20 40 20 47v16Q20 70 15.05 74.95L8.95 81.05Q4 86 4 79V47Z' +
  'M28 47Q28 40 32.95 35.05L47.05 20.95Q52 16 59 16h2Q68 16 63.05 20.95L48.95 35.05Q44 40 44 47v16Q44 70 39.05 74.95L32.95 81.05Q28 86 28 79V47Z' +
  'M52 47Q52 40 56.95 35.05L71.05 20.95Q76 16 83 16h2Q92 16 87.05 20.95L72.95 35.05Q68 40 68 47v16Q68 70 63.05 74.95L56.95 81.05Q52 86 52 79V47Z';

/** Ordered paint list of one illustration: paths, gradients and clips. */
export class Scene {
  items = [];
  grads = [];
  clips = [];
  add(cls, segs, clip) {
    if (segs && segs.length) this.items.push({ cls, segs, clip });
    return this;
  }
  clipTo(id, segs) {
    this.clips.push({ id, segs });
    return id;
  }
  guide(cls, a, b) {
    return this.add(cls, [
      ['M', a],
      ['L', b],
    ]);
  }
  linear(id, a, b, stops) {
    this.grads.push({ type: 'linear', id, a, b, stops });
    return `#${id}`;
  }
  radial(id, c, r, stops) {
    this.grads.push({ type: 'radial', id, c, r, stops });
    return `#${id}`;
  }
}

/** Arc of radius r in the plane (U, V) around c, angles in degrees. */
export function arcIn(c, U, V, r, t0, t1, move = true) {
  const at = (t) => combo(c, [U, r * Math.cos(t * DEG)], [V, r * Math.sin(t * DEG)]);
  const tg = (t) => combo([0, 0, 0], [U, -Math.sin(t * DEG)], [V, Math.cos(t * DEG)]);
  const steps = Math.max(1, Math.ceil(Math.abs(t1 - t0) / 45));
  const step = (t1 - t0) / steps;
  const k = (4 / 3) * Math.tan((step * DEG) / 4) * r;
  const out = move ? [['M', at(t0)]] : [];
  for (let i = 0; i < steps; i++) {
    const a = t0 + i * step;
    const b = a + step;
    out.push(['C', add(at(a), mul(tg(a), k)), add(at(b), mul(tg(b), -k)), at(b)]);
  }
  return out;
}

/**
 * Flat outline (SVG path data in a local box) extruded by `t` along `N` from the plane
 * `o + u·U + v·V`, the way an icon plate stands in space: swept walls, the far outline, the
 * silhouette connectors where a wall turns away, then the front face on top.
 */
export function extrude(
  sc,
  d,
  { o, U = X, V = [0, 0, -1], N = Y, s = 1, t = 8 },
  { sil = 'o', fill = 't', side = 'l' } = {},
) {
  const back = mapSegs(parse(d), plane(o, U, V, s));
  const off = mul(N, t);
  const front = back.map((sg) => [sg[0], ...sg.slice(1).map((p) => add(p, off))]);
  const e = lin(off);
  const tangentSign = (a, c1, c2, b, u) => {
    const w = 1 - u;
    const dp = combo(
      [0, 0, 0],
      [c1.map((v, i) => v - a[i]), 3 * w * w],
      [c2.map((v, i) => v - c1[i]), 6 * w * u],
      [b.map((v, i) => v - c2[i]), 3 * u * u],
    );
    return Math.sign(cross2(lin(dp), e));
  };
  const walls = [];
  const connectors = [];
  let cur = null;
  let start = null;
  let lastSign = 0;
  const vertexCheck = (p, sign) => {
    if (lastSign && sign && sign !== lastSign)
      connectors.push([
        ['M', add(p, off)],
        ['L', p],
      ]);
    if (sign) lastSign = sign;
  };
  for (const sg of back) {
    if (sg[0] === 'M') {
      cur = sg[1];
      start = sg[1];
      lastSign = 0;
      continue;
    }
    const seg = sg[0] === 'Z' ? ['L', start] : sg;
    const end = last(seg);
    if (dist(cur, end) < 1e-6) continue;
    const [c1, c2] = seg[0] === 'C' ? [seg[1], seg[2]] : [cur, end];
    const samples = seg[0] === 'C' ? 16 : 1;
    let prev = tangentSign(cur, c1, c2, end, seg[0] === 'C' ? 0.001 : 0.5);
    vertexCheck(cur, prev);
    for (let k = 1; k <= samples; k++) {
      const u = seg[0] === 'C' ? k / samples - 0.001 : 0.5;
      const sign = tangentSign(cur, c1, c2, end, u);
      if (sign && prev && sign !== prev) {
        const w = 1 - u;
        const p = combo(
          [0, 0, 0],
          [cur, w * w * w],
          [c1, 3 * w * w * u],
          [c2, 3 * w * u * u],
          [end, u * u * u],
        );
        connectors.push([
          ['M', add(p, off)],
          ['L', p],
        ]);
      }
      if (sign) prev = sign;
    }
    lastSign = prev;
    const fw =
      seg[0] === 'C' ? ['C', add(c1, off), add(c2, off), add(end, off)] : ['L', add(end, off)];
    const bw = seg[0] === 'C' ? ['C', c2, c1, cur] : ['L', cur];
    walls.push([['M', add(cur, off)], fw, ['L', end], bw, ['Z']]);
    cur = end;
  }
  for (const w of walls) sc.add(side, w);
  sc.add(sil, back);
  for (const c of connectors) sc.add(sil, c);
  sc.add(fill, front);
  sc.add(sil, front);
  return plane(add(o, off), U, V, s);
}
