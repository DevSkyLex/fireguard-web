/**
 * Empty-state artwork for generic situations shared across features. Same language as the
 * resource catalog: one subject, dark faces, fine and dotted linework, a single neutral light.
 */
import { icon } from '../lib/icons.mjs';
import {
  Scene,
  X,
  Y,
  circle,
  combo,
  mapSegs,
  marks,
  parse,
  plane,
  rbox,
  solid,
} from '../lib/iso.mjs';
import {
  DOWN,
  UP_LEFT,
  bezier,
  block,
  drum,
  ghost,
  glass,
  iconAt,
  key,
  lathe,
  latheBand,
  line,
  litSlot,
  loop,
  magnifier,
  paint,
  pathAt,
  plateShape,
  poly,
  prism,
  ring,
  ringArc,
  sheet,
  slab,
  slabShape,
  tray,
  tube,
  uprights,
} from '../lib/kit.mjs';

/** @type {Record<string, { title: string, desc: string, fn: () => Scene }>} */
export const STATES = {};

/** Registers one scene: its accessible title, its description and its builder. */
const state = (name, title, desc, build) => {
  STATES[name] = { title, desc, fn: build };
};

/** Paints items sorted back to front by the depth of their anchor (x + y). */
const backToFront = (items, draw) =>
  items.toSorted((a, b) => a.x + a.y - (b.x + b.y)).forEach((it) => draw(it));

/** Points sampled along path data mapped into 3D, for tubes that follow a drawn line. */
const along = (d, map, n = 12) => {
  const pts = [];
  let cur = null;
  for (const sg of parse(d)) {
    if (sg[0] === 'M') {
      cur = sg[1];
      pts.push(map(cur));
    } else if (sg[0] === 'L') {
      cur = sg[1];
      pts.push(map(cur));
    } else if (sg[0] === 'C') {
      const [p1, p2, p3] = sg.slice(1);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const w = 1 - t;
        pts.push(
          map([
            w * w * w * cur[0] + 3 * w * w * t * p1[0] + 3 * w * t * t * p2[0] + t * t * t * p3[0],
            w * w * w * cur[1] + 3 * w * w * t * p1[1] + 3 * w * t * t * p2[1] + t * t * t * p3[1],
          ]),
        );
      }
      cur = p3;
    }
  }
  return pts;
};

state(
  'empty-collection',
  'Empty collection',
  'An open lit container, its lid lifted, nothing inside.',
  () => {
    const sc = new Scene();
    const w = 210;
    const d = 150;
    const h = 110;
    glass(sc, 'box', { w, d, h });
    const zl = h + 56;
    uprights(sc, { w: w + 8, d: d + 8 }, zl, h, 'd');
    block(sc, { z: zl, w: w + 8, d: d + 8, h: 14, r: 2 }, { sil: 'o' });
    return sc;
  },
);

state(
  'no-results',
  'No results',
  'A magnifier held over empty dotted cells: nothing found.',
  () => {
    const sc = new Scene();
    const cells = [];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) cells.push([-72 + j * 72, -72 + i * 72]);
    for (const [x, y] of cells) ghost(sc, { x, y, w: 56, r: 6 });
    magnifier(sc, { x: -20, y: -20, z: 40 });
    return sc;
  },
);

state('empty-inbox', 'Empty inbox', 'An empty letter tray, lit from its floor.', () => {
  const sc = new Scene();
  const t = tray(sc, 'inbox', { w: 250, d: 190, h: 44, wall: 12, r: 10 });
  const p = plane([-98, -68, t.zf + 0.5], X, Y);
  sc.add('d', [
    ['M', p([0, 0])],
    ['L', p([196, 0])],
    ['L', p([196, 136])],
    ['L', p([0, 136])],
    ['Z'],
    ['M', p([0, 0])],
    ['L', p([98, 76])],
    ['L', p([196, 0])],
  ]);
  return sc;
});

state(
  'no-messages',
  'No messages',
  'An empty dotted speech bubble behind a small one with no text yet.',
  () => {
    const sc = new Scene();
    const bubble = icon('message-square');
    sc.add('d', mapSegs(parse(bubble), plane([-120, -60, 214], X, DOWN, 8.4)));
    const front = plateShape(
      sc,
      bubble,
      { o: [-40, 30, 150], U: X, V: DOWN, N: Y, s: 6.4, t: 12 },
      { sil: 'oa', fill: 't', side: 'l' },
    );
    for (const [u0, u1, v] of [
      [6, 18, 8.5],
      [6, 14, 13],
    ])
      sc.add('d', line(front([u0, v]), front([u1, v])));
    return sc;
  },
);

state(
  'no-attachments',
  'No attachments',
  'A paperclip resting on the dotted outline of a missing file.',
  () => {
    const sc = new Scene();
    const w = 190;
    const d = 240;
    sc.add('d', rbox({ w, d, r: 6 }).cap);
    const p = plane([-w / 2, -d / 2, 0], X, Y);
    for (const [u0, u1, v] of [
      [26, 130, 70],
      [26, 164, 100],
      [26, 150, 130],
    ])
      sc.add('d', line(p([u0, v]), p([u1, v])));
    const clip = along(icon('paperclip'), plane([-w / 2 - 34, -d / 2 - 46, 6], X, Y, 170 / 24));
    tube(sc, clip, 9, { sil: 'oa', fill: 't' });
    return sc;
  },
);

state('upload', 'Upload', 'A file rising from a dashed, softly lit drop zone.', () => {
  const sc = new Scene();
  const W = 250;
  const D = 200;
  const m = marks({ w: W, d: D }, 0);
  sc.add(
    sc.linear('zone', m.rear, m.fore, [
      [0, 'a', 0.22],
      [1, 'a', 0.02],
    ]),
    rbox({ w: W, d: D, r: 18 }).cap,
  );
  sc.add('ga', rbox({ w: W, d: D, r: 18 }).cap);
  const fw = 124;
  const fd = 150;
  const z = 96;
  sc.add('d', rbox({ w: fw, d: fd, r: 4 }).cap);
  uprights(sc, { w: fw, d: fd, r: 4 }, z, 0, 'd');
  sheet(sc, { z, w: fw, d: fd, h: 4, r: 4 }, { sil: 'o' });
  iconAt(sc, 'ka', 'arrow-up', [0, 0, z + 4], 84);
  return sc;
});

state(
  'offline',
  'Offline',
  'A plug lifted out of its outlet, its prongs hanging over the holes.',
  () => {
    const sc = new Scene();
    block(sc, { w: 160, d: 160, h: 24, r: 24 }, { sil: 'o' });
    const zt = 24;
    sc.add('e', ring(0, 0, zt, 58));
    sc.add('e', ring(0, 0, zt, 50));
    const holes = [-22, 22].map((d) => [d * Math.SQRT1_2, -d * Math.SQRT1_2]);
    for (const [x, y] of holes) {
      sc.add('hole', ring(x, y, zt, 7));
      sc.add('oa', ring(x, y, zt, 7));
    }
    const zp = 152;
    const tip = zp - 62;
    for (const [x, y] of holes) sc.guide('da', [x, y, zt], [x, y, tip]);
    tube(
      sc,
      bezier([0, 0, zp + 30], [0, 0, zp + 84], [-96, 30, zp + 76], [-160, 64, zp - 36], 30),
      13,
      { sil: 'o2' },
    );
    for (const [x, y] of holes) drum(sc, { x, y, z: tip, r: 4.5, h: zp - tip }, { sil: 'oa' });
    lathe(
      sc,
      {
        z0: zp,
        z1: zp + 44,
        r: (z) => (z < zp + 30 ? 40 : 40 - (z - zp - 30) * 1.4),
        rims: [zp + 30],
      },
      { sil: 'o' },
    );
    return sc;
  },
);

state('access-denied', 'Access restricted', 'A padlock, its keyhole lit from inside.', () => {
  const sc = new Scene();
  const w = 160;
  const d = 74;
  const h = 128;
  block(sc, { w, d, h, r: 16 }, { sil: 'o' });
  for (const x of [-50, 50]) {
    sc.add('hole', ring(x, 0, h, 10));
    sc.add('e', ring(x, 0, h, 10));
  }
  const arch = Array.from({ length: 33 }, (_, i) => {
    const a = (Math.PI * i) / 32;
    return [-50 * Math.cos(a), 0, h + 34 + 50 * Math.sin(a)];
  });
  tube(sc, [[-50, 0, h], [-50, 0, h + 34], ...arch, [50, 0, h + 34], [50, 0, h]], 17, {
    sil: 'o2',
    caps: false,
  });
  const face = plane([0, d / 2, 0], X, [0, 0, 1]);
  const hole = mapSegs(parse(circle(0, 64, 13)), face);
  const slot = loop([face([-6, 58]), face([6, 58]), face([10, 28]), face([-10, 28])]);
  const lit = sc.linear('keyhole', face([0, 78]), face([0, 28]), [
    [0, 'a', 0.3],
    [1, 'a', 'glow'],
  ]);
  sc.add('hole', hole);
  sc.add('hole', slot);
  sc.add(lit, hole);
  sc.add(lit, slot);
  sc.add('oa', hole);
  sc.add('oa', slot);
  return sc;
});

state('error', 'Something went wrong', 'A block split along a lit crack.', () => {
  const sc = new Scene();
  const s = 78;
  const H = 150;
  const crack = [
    [0, -s],
    [12, -44],
    [-8, -12],
    [14, 18],
    [-6, 46],
    [0, s],
  ];
  const gap = 11;
  const left = [[-s, -s], ...crack, [-s, s]].map(([x, y]) => [x - gap, y]);
  const right = [[s, -s], [s, s], ...crack.toReversed()].map(([x, y]) => [x + gap, y]);
  prism(sc, left, 0, H, { sil: 'o' });
  const walls = crack.slice(0, -1).map((p, i) => [p, crack[i + 1]]);
  const light = sc.linear(
    'crack',
    [0, 0, H],
    [0, 0, 0],
    [
      [0, 'a', 0.5],
      [1, 'a', 0.08],
    ],
  );
  for (const [p, q] of walls)
    sc.add(
      light,
      loop([
        [p[0] - gap, p[1], H],
        [q[0] - gap, q[1], H],
        [q[0] - gap, q[1], 0],
        [p[0] - gap, p[1], 0],
      ]),
    );
  sc.add('ka', line(...crack.map(([x, y]) => [x - gap, y, H])));
  prism(sc, right, 0, H, { sil: 'o' });
  return sc;
});

state(
  'all-clear',
  'All clear',
  'A single round button lit around its base, marked with a check.',
  () => {
    const sc = new Scene();
    drum(sc, { r: 124, h: 18 }, { sil: 'o' });
    litSlot(sc, 'ring', { w: 216, d: 216, r: 108 }, 18);
    drum(sc, { r: 96, h: 22, z: 18 }, { sil: 'o' });
    iconAt(sc, 'ka', 'check', [0, 0, 40], 150);
    return sc;
  },
);

state('waiting', 'Waiting', 'An hourglass, its sand half run through.', () => {
  const sc = new Scene();
  const zb = 14;
  const zt = 186;
  const glassR = (z) => {
    const t = (z - zb) / (zt - zb);
    return 9 + 46 * Math.sin((Math.PI / 2) * Math.abs(2 * t - 1)) ** 1.15;
  };
  const posts = [90, 210, 330].map((deg) => ({
    x: 58 * Math.cos((deg * Math.PI) / 180),
    y: 58 * Math.sin((deg * Math.PI) / 180),
  }));
  drum(sc, { r: 70, h: zb }, { sil: 'o' });
  for (const p of posts.filter((q) => q.x + q.y < 0))
    drum(sc, { x: p.x, y: p.y, z: zb, r: 4, h: zt - zb }, { sil: 'o2' });
  const g = lathe(sc, { z0: zb, z1: zt, r: glassR, cap: false }, { sil: null, fill: 'cy' });
  const sand = (z) => Math.max(0, Math.min(glassR(z) - 5, (zb + 62 - z) * 1.25));
  lathe(
    sc,
    { z0: zb, z1: zb + 61.9, r: sand, cap: false },
    { sil: 'oa', fill: '#sand', rim: 'ka' },
  );
  sc.linear(
    'sand',
    [0, 0, zb + 62],
    [0, 0, zb],
    [
      [0, 'a', 'glow'],
      [1, 'a', 0.25],
    ],
  );
  sc.add('ka', line([0, 0, (zb + zt) / 2], [0, 0, zb + 62]));
  const top = (z) => Math.max(0, Math.min(glassR(z) - 5, (z - (zb + zt) / 2 - 4) * 1.1));
  lathe(
    sc,
    { z0: (zb + zt) / 2 + 4.1, z1: (zb + zt) / 2 + 30, r: top },
    { sil: 'oa', fill: '#sand', rim: 'ka', top: '#sand' },
  );
  sc.add('o', g.path);
  for (const p of posts.filter((q) => q.x + q.y >= 0))
    drum(sc, { x: p.x, y: p.y, z: zb, r: 4, h: zt - zb }, { sil: 'o2' });
  drum(sc, { r: 70, h: 14, z: zt }, { sil: 'o' });
  return sc;
});

/** Radius profile of the bell: lip, flare, waist and crown, from its mouth upward. */
const bellProfile = (z) => {
  if (z < 4) return 60 + z * 0.5;
  if (z < 10) return 62 - (z - 4) * 0.33;
  if (z < 104) return 30 + 30 * (1 - (z - 10) / 94) ** 2.4;
  return 30 * Math.sqrt(Math.max(0, 1 - ((z - 104) / 24) ** 2));
};

/** Radius profile of the funnel: spout below z = 100, cone above. */
const funnelProfile = (z) => (z < 100 ? 12 : 12 + (z - 100) * 0.75);

state('no-notifications', 'No notifications', 'A quiet bell, its lip lit.', () => {
  const sc = new Scene();
  lathe(sc, { z0: 0, z1: 127.9, r: bellProfile, rims: [10], cap: false }, { sil: 'o' });
  const lip = latheBand(0, 0, 0.5, bellProfile(0.5), 10, bellProfile(10));
  sc.add(
    sc.linear(
      'lip',
      [0, 0, 10],
      [0, 0, 0],
      [
        [0, 'a', 0.25],
        [1, 'a', 'glow'],
      ],
    ),
    lip,
  );
  sc.add('oa', lip);
  const loopPts = Array.from({ length: 33 }, (_, i) => {
    const a = (2 * Math.PI * i) / 32;
    return [13 * Math.cos(a), 0, 140 + 13 * Math.sin(a)];
  });
  tube(sc, loopPts, 6, { sil: 'o2', fill: 't' });
  return sc;
});

state(
  'no-matches',
  'No matches',
  'A filter funnel with nothing coming out onto its dotted landing mark.',
  () => {
    const sc = new Scene();
    sc.add('da', ring(0, 0, 0, 40));
    ghost(sc, { x: 0, y: 0, z: 0, w: 46, h: 0 });
    lathe(sc, { z0: 50, z1: 190, r: funnelProfile, cap: false }, { sil: 'o' });
    const rim = ring(0, 0, 190, funnelProfile(190));
    sc.add('hole', rim);
    sc.add('oa', rim);
    return sc;
  },
);

state(
  'no-selection',
  'Nothing selected',
  'A pointer hovering over a keypad, no key chosen yet.',
  () => {
    const sc = new Scene();
    const W = 290;
    const inset = 14;
    const cell = (W - 2 * inset) / 3;
    slab(sc, { w: W, d: W, h: 14, r: 16, inset, grid: { cols: 3, rows: 3 } });
    const keys = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) keys.push({ x: -cell + c * cell, y: -cell + r * cell });
    backToFront(keys, (k) => key(sc, { x: k.x, y: k.y, z: 14, w: cell - 22, h: 16, r: 5 }));
    const s = 150 / 24;
    const U = [Math.SQRT1_2, -Math.SQRT1_2, 0];
    const V = [Math.SQRT1_2, Math.SQRT1_2, 0];
    const z = 96;
    const tip = [0, 0, z];
    sc.guide('da', [0, 0, 30], tip);
    sc.add('da', ring(0, 0, 30, 14));
    slabShape(
      sc,
      icon('mouse-pointer-2'),
      { o: combo(tip, [U, -4.2 * s], [V, -4.7 * s]), U, V, s, h: 8 },
      { sil: 'oa', fill: 't', side: 'l' },
    );
    return sc;
  },
);

state(
  'no-data',
  'No data yet',
  'An empty chart: axes and dotted bars waiting, the first slot lit.',
  () => {
    const sc = new Scene();
    const W = 300;
    const D = 150;
    block(sc, { w: W, d: D, h: 8, r: 8 }, { sil: 'o' });
    const bars = [
      { x: -84, h: 70 },
      { x: -24, h: 118 },
      { x: 36, h: 88 },
      { x: 96, h: 140 },
    ];
    litSlot(sc, 'first', { x: bars[0].x, y: -4, w: 38, d: 38, r: 2 }, 8);
    bars.forEach((b, i) =>
      ghost(sc, { x: b.x, y: -4, z: 8, w: 38, d: 38, h: b.h, r: 2 }, i === 0 ? 'da' : 'd'),
    );
    block(sc, { x: -W / 2 + 16, y: 34, z: 8, w: 7, d: 7, h: 170, r: 2 }, { sil: 'o' });
    block(sc, { x: 8, y: 34, z: 8, w: W - 30, d: 7, h: 5, r: 2 }, { sil: 'o' });
    const post = plane([-W / 2 + 16, 34 + 3.5, 8], X, [0, 0, 1]);
    for (let zt = 34; zt < 170; zt += 34) sc.add('e', line(post([0, zt]), post([12, zt])));
    return sc;
  },
);

state('not-found', 'Not found', 'A signpost whose lit board only asks a question.', () => {
  const sc = new Scene();
  drum(sc, { r: 42, h: 10 }, { sil: 'o' });
  const board = (u0, len, U, N, z, hero) => {
    const outline = `M0 0H${len}L${len + 26} 24L${len} 48H0Z`;
    const o = combo([0, 0, z], [U, u0], [N, -4]);
    return plateShape(
      sc,
      outline,
      { o, U, V: DOWN, N, s: 1, t: 8 },
      { sil: hero ? 'oa' : 'o2', fill: 't', side: 'l' },
    );
  };
  board(-12, 118, [0, -1, 0], X, 170, false);
  drum(sc, { r: 7, h: 216, z: 10 }, { sil: 'o' });
  const face = board(-14, 136, X, Y, 222, true);
  const q = pathAt(
    sc,
    'ka',
    'M8.5 8.2a3.6 3.6 0 1 1 5.2 3.3c-1.1.5-1.7 1.4-1.7 2.5v1.2',
    face([72, 24]),
    60,
    { U: UP_LEFT, V: DOWN },
  );
  sc.add('af', mapSegs(parse(circle(12, 18.6, 1.3)), q));
  return sc;
});

state(
  'no-history',
  'No history yet',
  'An unrolled register with nothing written in it yet.',
  () => {
    const sc = new Scene();
    const w = 220;
    const len = 210;
    sheet(sc, { x: 0, y: 12, w, d: len, h: 2, r: 2 }, { sil: 'o' });
    const p = plane([-w / 2, 12 - len / 2, 2], X, Y);
    for (let i = 0; i < 5; i++) {
      const v = 64 + i * 32;
      sc.add('d', ring(...p([26, v]).slice(0, 2), 2, 5));
      sc.add('d', line(p([44, v]), p([150 - (i % 2) * 40, v])));
    }
    paint(
      sc,
      solid({
        c: [-w / 2 - 6, -len / 2 + 12, 26],
        U: Y,
        V: [0, 0, 1],
        N: X,
        a: 26,
        b: 26,
        r: 26,
        t: w + 12,
      }),
      { sil: 'o' },
    );
    iconAt(sc, 'k', 'history', p([188, 160]), 44);
    return sc;
  },
);

state(
  'sync-pending',
  'Waiting to sync',
  'Queued changes stacked inside a two-arrow sync loop.',
  () => {
    const sc = new Scene();
    const R = 140;
    const zr = 34;
    const head = (deg, cls) => {
      const t = (deg * Math.PI) / 180;
      const tip = [R * Math.cos(t), R * Math.sin(t), zr];
      const tg = [-Math.sin(t), Math.cos(t), 0];
      const nr = [Math.cos(t), Math.sin(t), 0];
      sc.add(cls, line(combo(tip, [tg, -16], [nr, 11]), tip, combo(tip, [tg, -16], [nr, -11])));
    };
    sc.add('da', ringArc(0, 0, zr, R, 150, 290));
    head(290, 'o2');
    for (let i = 0; i < 3; i++)
      key(sc, {
        x: 0,
        y: 0,
        z: i * 30,
        w: 150,
        d: 110,
        h: 10,
        r: 6,
        split: 0,
        hero: i === 2,
        sil: i === 2 ? 'o' : 'o2',
      });
    sc.add('oa', ringArc(0, 0, zr, R, -30, 110));
    head(110, 'oa');
    const p = plane([-75, -55, 70], X, Y);
    sc.add('e', line(p([20, 30]), p([110, 30])));
    sc.add('e', line(p([20, 56]), p([90, 56])));
    return sc;
  },
);

state(
  'no-events',
  'Nothing scheduled',
  'A standing desk calendar with an empty page, today marked.',
  () => {
    const sc = new Scene();
    const L = 220;
    const Dp = 70;
    const Ht = 170;
    const A = (x) => [x, 0, Ht];
    const F = (x) => [x, Dp, 0];
    const B = (x) => [x, -Dp, 0];
    const e = L / 2;
    poly(
      sc,
      [
        [F(-e), F(e), A(e), A(-e)],
        [B(-e), A(-e), A(e), B(e)],
        [F(-e), B(-e), B(e), F(e)],
        [F(e), B(e), A(e)],
        [F(-e), A(-e), B(-e)],
      ],
      { sil: 'o', edge: 'e' },
    );
    const len = Math.hypot(Dp, Ht);
    const V = [0, Dp / len, -Ht / len];
    const page = plane(A(-e), X, V);
    sc.add('e', line(page([10, 40]), page([L - 10, 40])));
    const cols = 4;
    const rowsN = 3;
    const cw = (L - 40) / cols;
    const ch = (len - 70) / rowsN;
    for (let r = 0; r < rowsN; r++)
      for (let c = 0; c < cols; c++) {
        const u = 20 + c * cw + 6;
        const v = 54 + r * ch + 4;
        const today = r === 1 && c === 1;
        const cell = loop([
          page([u, v]),
          page([u + cw - 12, v]),
          page([u + cw - 12, v + ch - 8]),
          page([u, v + ch - 8]),
        ]);
        sc.add(today ? 'oa' : 'd', cell);
      }
    for (const x of [-e / 2, e / 2]) {
      const pts = Array.from({ length: 25 }, (_, i) => {
        const a = (2 * Math.PI * i) / 24;
        return combo(A(x), [[0, 1, 0], 11 * Math.cos(a)], [[0, 0, 1], 11 * Math.sin(a)]);
      });
      tube(sc, pts, 5, { sil: 'o2' });
    }
    return sc;
  },
);
