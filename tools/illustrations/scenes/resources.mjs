/**
 * Resource artwork: one scene per catalog resource. Each scene is one clear subject drawn in
 * the language of the reference plates (keycaps, rounded cubes, lit translucent volumes, turned
 * objects), monochrome like them, with a single light: a lit slot, a glowing volume, a lit
 * screen or opening, or the one brightest object.
 */
import { icon } from '../lib/icons.mjs';
import {
  Scene,
  X,
  Y,
  arcIn,
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
  RIGHT_U,
  UP_LEFT,
  bezier,
  block,
  bust,
  cube,
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
  mapPin,
  paint,
  pathAt,
  plateShape,
  poly,
  prism,
  ring,
  ringArc,
  rows,
  sheet,
  slab,
  slabShape,
  sphere,
  tube,
  uprights,
} from '../lib/kit.mjs';

/** @type {Record<string, { title: string, desc: string, fn: () => Scene }>} */
export const RESOURCES = {};

/** Registers one scene: its accessible title, its description and its builder. */
const scene = (name, title, desc, build) => {
  RESOURCES[name] = { title, desc, fn: build };
};

/** Paints items sorted back to front by the depth of their anchor (x + y). */
const backToFront = (items, draw) =>
  items.toSorted((a, b) => a.x + a.y - (b.x + b.y)).forEach((it) => draw(it));

/** Plain building block with floor lines, standing on z. */
const tower = (sc, { x, y, z = 0, w, d, h, floors, sil = 'o2' }) =>
  paint(sc, rbox({ x, y, z, w, d, h, r: 2 }), {
    sil,
    rings: Array.from({ length: floors - 1 }, (_, i) => ((i + 1) * h) / floors),
  });

/** Pine tree: a short trunk under two stacked cones. */
const tree = (sc, { x, y, z = 0, s = 1 }) => {
  drum(sc, { x, y, z, r: 3 * s, h: 12 * s }, { sil: 'o2' });
  const tier = (z0, r0, h) =>
    lathe(
      sc,
      {
        x,
        y,
        z0: z + z0 * s,
        z1: z + (z0 + h) * s,
        r: (zz) => r0 * s * (1 - (zz - z - z0 * s) / (h * s)) + 0.01,
      },
      { sil: 'o2' },
    );
  tier(10, 19, 28);
  tier(26, 14, 30);
};

/** Glyph box of a Lucide outline mapped flat on the ground plane around (x, y, z). */
const flat = (x, y, z, size, U = X, V = Y) => ({
  o: combo([x, y, z], [U, -size / 2], [V, -size / 2]),
  U,
  V,
  s: size / 24,
});

scene(
  'organization',
  'Organization',
  'A central workspace cube linked to its sites, people, equipment and inspections.',
  () => {
    const sc = new Scene();
    const d = 172;
    const hub = 62;
    const half = 32;
    const sats = [
      { x: -d, y: 0, icon: 'map-pin' },
      { x: 0, y: -d, icon: 'clipboard-list' },
      { x: 0, y: d, icon: 'users' },
      { x: d, y: 0, icon: 'fire-extinguisher' },
    ];
    const link = (s) => {
      const ux = Math.sign(s.x);
      const uy = Math.sign(s.y);
      sc.guide('d', [s.x - ux * half, s.y - uy * half, 32], [ux * hub, uy * hub, 32]);
    };
    const satellite = (s) => cube(sc, { x: s.x, y: s.y, s: 64, r: 7, icon: s.icon, size: 42 });
    const back = sats.filter((s) => s.x + s.y < 0);
    const front = sats.filter((s) => s.x + s.y > 0);
    back.forEach(satellite);
    back.forEach(link);
    cube(sc, { s: 124, r: 11, hero: true, icon: 'building-2', size: 72, accent: true });
    front.forEach(link);
    front.forEach(satellite);
    return sc;
  },
);

scene(
  'site',
  'Site',
  'A parcel with two buildings and trees inside its dashed boundary line.',
  () => {
    const sc = new Scene();
    block(sc, { w: 340, d: 260, h: 8, r: 12 }, { sil: 'o' });
    sc.add('ga', rbox({ w: 304, d: 224, z: 8, r: 6 }).cap);
    backToFront(
      [
        { x: -45, y: -30, kind: 'a' },
        { x: 75, y: 25, kind: 'b' },
        { x: -105, y: 72, kind: 't' },
        { x: -48, y: 92, kind: 't' },
        { x: 120, y: -70, kind: 't' },
      ],
      (it) => {
        if (it.kind === 'a')
          tower(sc, { x: it.x, y: it.y, z: 8, w: 96, d: 76, h: 120, floors: 4, sil: 'o' });
        else if (it.kind === 'b')
          tower(sc, { x: it.x, y: it.y, z: 8, w: 72, d: 64, h: 66, floors: 2 });
        else tree(sc, { x: it.x, y: it.y, z: 8, s: 0.9 });
      },
    );
    return sc;
  },
);

scene('building', 'Building', 'A building, its entrance lit and spilling light outside.', () => {
  const sc = new Scene();
  const w = 124;
  const h = 230;
  const front = w / 2;
  sc.add(
    sc.linear(
      'spill',
      [0, front, 0],
      [0, front + 70, 0],
      [
        [0, 'a', 'glow'],
        [1, 'a', 0],
      ],
    ),
    loop([
      [-17, front, 0],
      [17, front, 0],
      [34, front + 70, 0],
      [-34, front + 70, 0],
    ]),
  );
  paint(sc, rbox({ w, d: w, h, r: 2 }), { sil: 'o', rings: [46, 92, 138, 184] });
  const L = plane([-w / 2, front, 0], X, [0, 0, 1]);
  const R = plane([w / 2, w / 2, 0], RIGHT_U, [0, 0, 1]);
  for (const f of [L, R]) sc.add('e', line(f([w / 2, 46]), f([w / 2, h])));
  const door = loop([
    L([w / 2 - 17, 0]),
    L([w / 2 - 17, 36]),
    L([w / 2 + 17, 36]),
    L([w / 2 + 17, 0]),
  ]);
  sc.add(
    sc.linear('door', L([w / 2, 36]), L([w / 2, 0]), [
      [0, 'a', 0.25],
      [1, 'a', 'glow'],
    ]),
    door,
  );
  sc.add('oa', door);
  block(sc, { x: 0, y: front + 7, z: 40, w: 50, d: 14, h: 4, r: 1 }, { sil: 'o2' });
  sc.add('e', rbox({ w: w - 16, d: w - 16, z: h, r: 1 }).cap);
  block(sc, { x: -16, y: -12, z: h, w: 42, d: 32, h: 16, r: 3 }, { sil: 'o2' });
  return sc;
});

scene('floor', 'Floor', 'A building with one floor slid out like a drawer, its plan lit.', () => {
  const sc = new Scene();
  const w = 150;
  const z0 = 88;
  const z1 = 132;
  const top = 220;
  const windows = (zBase, floors) => {
    const L = plane([-w / 2, w / 2, 0], X, [0, 0, 1]);
    const R = plane([w / 2, w / 2, 0], RIGHT_U, [0, 0, 1]);
    for (const f of [L, R])
      for (let fl = 0; fl < floors; fl++)
        for (let c = 0; c < 3; c++) {
          const u0 = 18 + c * 42;
          const v0 = zBase + fl * 44 + 14;
          sc.add(
            'e',
            loop([f([u0, v0]), f([u0 + 28, v0]), f([u0 + 28, v0 + 18]), f([u0, v0 + 18])]),
          );
        }
  };
  paint(sc, rbox({ w, d: w, h: z0, r: 2 }), { sil: 'o', rings: [44] });
  windows(0, 2);
  paint(sc, rbox({ w: w - 16, d: w - 16, z: z0, h: z1 - z0, r: 2 }), { sil: 'e' });
  const pull = 76;
  const pw = w - 8;
  const zp = z0 + 6;
  paint(sc, rbox({ x: 0, y: pull, z: zp, w: pw, d: pw, h: 10, r: 2 }), { sil: 'oa' });
  const zt = zp + 10;
  const m = marks({ x: 0, y: pull, w: pw, d: pw }, zt);
  sc.add(
    sc.linear('plate', m.rear, m.fore, [
      [0, 'a', 'glow'],
      [1, 'a', 0.04],
    ]),
    rbox({ x: 0, y: pull, z: zt, w: pw, d: pw, r: 2 }).cap,
  );
  const p = plane([-pw / 2, pull - pw / 2, zt], X, Y);
  sc.add('o2', line(p([0, 64]), p([pw, 64])));
  sc.add('o2', line(p([70, 64]), p([70, pw])));
  sc.add('o2', line(p([96, 0]), p([96, 64])));
  paint(sc, rbox({ w, d: w, z: z1, h: top - z1, r: 2 }), { sil: 'o', rings: [44] });
  windows(z1, 2);
  sc.add('e', rbox({ w: w - 16, d: w - 16, z: top, r: 1 }).cap);
  block(sc, { x: -20, y: -16, z: top, w: 44, d: 34, h: 16, r: 3 }, { sil: 'o2' });
  return sc;
});

scene(
  'room',
  'Room',
  'A room cut open: two walls, a doorway, and daylight through the window.',
  () => {
    const sc = new Scene();
    const s = 240;
    const t = 12;
    const H = 150;
    const e = s / 2;
    block(sc, { w: s, d: s, h: 10, r: 3 }, { sil: 'o' });
    const wy = [-40, 40];
    const wz = [70, 130];
    const pieces = [
      { x: -e + t / 2, y: (-e + wy[0]) / 2, w: t, d: wy[0] + e, z: 10, h: H },
      { x: -e + t / 2, y: (wy[1] + e) / 2, w: t, d: e - wy[1], z: 10, h: H },
      { x: -e + t / 2, y: 0, w: t, d: wy[1] - wy[0], z: 10, h: wz[0] - 10 },
      { x: -e + t / 2, y: 0, w: t, d: wy[1] - wy[0], z: wz[1], h: H + 10 - wz[1] },
      { x: (-e + t + 20) / 2, y: -e + t / 2, w: 20 + e - t, d: t, z: 10, h: H },
      { x: (80 + e) / 2, y: -e + t / 2, w: e - 80, d: t, z: 10, h: H },
      { x: 50, y: -e + t / 2, w: 60, d: t, z: 125, h: H + 10 - 125 },
    ];
    const pane = loop([
      [-e + t, wy[0], wz[0]],
      [-e + t, wy[1], wz[0]],
      [-e + t, wy[1], wz[1]],
      [-e + t, wy[0], wz[1]],
    ]);
    sc.add(
      sc.linear(
        'pane',
        [-e + t, 0, wz[1]],
        [-e + t, 0, wz[0]],
        [
          [0, 'a', 'haze'],
          [1, 'a', 0.34],
        ],
      ),
      pane,
    );
    sc.add(
      sc.linear(
        'sun',
        [-e + t, 0, 10],
        [e - 60, 60, 10],
        [
          [0, 'a', 'glow'],
          [1, 'a', 0],
        ],
      ),
      loop([
        [-e + t, wy[0], 10],
        [-e + t, wy[1], 10],
        [-10, wy[1] + 40, 10],
        [-10, wy[0] + 40, 10],
      ]),
    );
    backToFront(pieces, (p) =>
      block(sc, { x: p.x, y: p.y, z: p.z, w: p.w, d: p.d, h: p.h, r: 0 }, { sil: 'o2' }),
    );
    sc.add('oa', pane);
    return sc;
  },
);

scene('zone', 'Zone', 'A floor plan where one compartment fills with a lit volume.', () => {
  const sc = new Scene();
  const W = 300;
  const D = 240;
  const t = 6;
  const hw = 22;
  block(sc, { w: W, d: D, h: 10, r: 4 }, { sil: 'o' });
  const z = 10;
  const walls = [
    { x: 0, y: -D / 2 + t / 2, w: W, d: t },
    { x: -W / 2 + t / 2, y: 0, w: t, d: D },
    { x: 20, y: -60, w: t, d: 120 - t },
    { x: 20, y: 85, w: t, d: 70 },
    { x: -W / 2 + 45, y: 0, w: 90 - t, d: t },
    { x: -W / 2 + 145, y: 0, w: 50, d: t },
  ];
  backToFront(walls, (p) => block(sc, { ...p, z, h: hw, r: 0 }, { sil: 'o2' }));
  glass(sc, 'zone', {
    x: 20 + (W / 2 - 20) / 2 + t / 2,
    y: t / 2,
    z,
    w: W / 2 - 20 - t,
    d: D - t,
    h: 74,
  });
  block(sc, { x: 0, y: D / 2 - t / 2, z, w: W, d: t, h: hw, r: 0 }, { sil: 'o2' });
  block(sc, { x: W / 2 - t / 2, y: 0, z, w: t, d: D, h: hw, r: 0 }, { sil: 'o2' });
  return sc;
});

scene('equipment', 'Equipment', 'A fire extinguisher: banded body, valve, handle and hose.', () => {
  const sc = new Scene();
  const R = 38;
  const body = (z) => {
    if (z < 5) return R - 5 + z;
    if (z < 150) return R;
    if (z < 180) return 13 + (R - 13) * Math.sqrt(1 - ((z - 150) / 30) ** 2);
    return 13;
  };
  lathe(sc, { z0: 0, z1: 192, r: body, rims: [14] }, { sil: 'o', rim: 'e' });
  const label = latheBand(0, 0, 62, body(62), 124, body(124));
  sc.add(
    sc.linear(
      'label',
      [0, 0, 124],
      [0, 0, 62],
      [
        [0, 'a', 0.2],
        [1, 'a', 'glow'],
      ],
    ),
    label,
  );
  sc.add('oa', label);
  block(sc, { x: 0, y: 0, z: 192, w: 30, d: 24, h: 18, r: 3 }, { sil: 'o2' });
  prism(
    sc,
    [
      [-10, -5],
      [52, -5],
      [52, 5],
      [-10, 5],
    ],
    214,
    5,
  );
  prism(
    sc,
    [
      [2, -4],
      [46, -4],
      [46, 4],
      [2, 4],
    ],
    204,
    4,
  );
  const hose = bezier([-6, 14, 200], [-10, 70, 196], [-4, 62, 110], [4, 52, 70], 40);
  tube(sc, hose, 8, { sil: 'o2' });
  lathe(sc, { x: 4, y: 52, z0: 44, z1: 70, r: (z) => 3 + (z - 44) * 0.12 }, { sil: 'o2' });
  return sc;
});

scene('intervention', 'Intervention', 'A field compass lying flat, its north needle lit.', () => {
  const sc = new Scene();
  const R = 108;
  drum(sc, { r: R, h: 20 }, { sil: 'o' });
  drum(sc, { r: R - 6, h: 6, z: 20 }, { sil: 'o2' });
  const z = 26;
  sc.add('e', ring(0, 0, z, R - 18));
  for (let i = 0; i < 16; i++) {
    const a = ((i * 22.5 - 135) * Math.PI) / 180;
    const r0 = i % 4 ? R - 28 : R - 38;
    sc.add(
      'e',
      line(
        [r0 * Math.cos(a), r0 * Math.sin(a), z],
        [(R - 22) * Math.cos(a), (R - 22) * Math.sin(a), z],
      ),
    );
  }
  const a = (-135 * Math.PI) / 180;
  const dir = [Math.cos(a), Math.sin(a)];
  const perp = [-dir[1], dir[0]];
  const north = [dir[0] * (R - 30), dir[1] * (R - 30)];
  sc.add(
    'af',
    loop([
      [...combo([...north, z], [[dir[0], dir[1], 0], 16]).slice(0, 2), z],
      [north[0] + perp[0] * 8, north[1] + perp[1] * 8, z],
      [north[0] - perp[0] * 8, north[1] - perp[1] * 8, z],
    ]),
  );
  const tipN = [dir[0] * 70, dir[1] * 70];
  const tipS = [-dir[0] * 70, -dir[1] * 70];
  const side = (s) => [perp[0] * 13 * s, perp[1] * 13 * s];
  prism(sc, [tipS, side(1), side(-1)], z, 4, { sil: 'o2' });
  prism(sc, [tipN, side(-1), side(1)], z, 4, { sil: 'oa', top: 'hole' });
  sc.add(
    sc.linear(
      'needle',
      [...tipN, z + 4],
      [0, 0, z + 4],
      [
        [0, 'a', 'glow'],
        [1, 'a', 0.1],
      ],
    ),
    loop([
      [...tipN, z + 4],
      [...side(-1), z + 4],
      [...side(1), z + 4],
    ]),
  );
  drum(sc, { r: 8, h: 6, z: z + 4 }, { sil: 'o2' });
  return sc;
});

scene(
  'inspection',
  'Inspection',
  'An inspection report on its clipboard, a magnifier resting on it.',
  () => {
    const sc = new Scene();
    const bw = 190;
    const bd = 244;
    sheet(sc, { w: bw, d: bd, h: 8, r: 10 }, { sil: 'o' });
    const p = sheet(sc, { x: 0, y: 10, z: 8, w: bw - 26, d: bd - 46, h: 2, r: 3 });
    block(sc, { x: 0, y: -bd / 2 + 14, z: 8, w: 76, d: 24, h: 12, r: 5 }, { sil: 'o2' });
    iconAt(sc, 'k', 'fire-extinguisher', p([30, 34]), 40);
    rows(sc, 'e', p, [
      [60, 140, 26],
      [60, 116, 44],
    ]);
    [0, 1, 2].forEach((i) => {
      const v = 86 + i * 36;
      sc.add(
        'o2',
        rbox({ x: -bw / 2 + 13 + 28, y: -bd / 2 + 33 + v, z: 10, w: 20, d: 20, r: 3 }).cap,
      );
      if (i < 2) iconAt(sc, 'k', 'check', p([28, v]), 22);
      rows(sc, 'e', p, [[48, 132 - i * 20, v]]);
    });
    magnifier(sc, { x: 34, y: 58, z: 10, R: 48, rim: 11, h: 10 });
    return sc;
  },
);

scene('checklist', 'Checklist', 'A to-do list of three rows, the first ticked and lit.', () => {
  const sc = new Scene();
  const items = [];
  [-88, 0, 88].forEach((y, i) => {
    items.push({ kind: 'box', x: -118, y, i });
    items.push({ kind: 'bar', x: 42, y, i });
  });
  backToFront(items, (it) => {
    if (it.kind === 'bar') {
      block(sc, { x: it.x, y: it.y, w: 210, d: 46, h: 10, r: 7 }, { sil: 'o2' });
      const p = plane([it.x - 105, it.y - 23, 10], X, Y);
      sc.add(it.i === 0 ? 'ka' : 'e', line(p([22, 23]), p([it.i === 1 ? 130 : 170, 23])));
      return;
    }
    key(sc, {
      x: it.x,
      y: it.y,
      w: 60,
      h: 20,
      r: 7,
      split: 0,
      icon: it.i < 2 ? 'check' : null,
      size: 46,
      hero: it.i === 0,
      lift: it.i === 0 ? 30 : 0,
    });
  });
  return sc;
});

scene(
  'maintenance',
  'Maintenance',
  'A service gear with a wrench, circled by a recurrence arrow.',
  () => {
    const sc = new Scene();
    const R = 150;
    sc.add('ga', ringArc(0, 0, 0, R, 150, 480));
    const tip = [R * Math.cos(480 * (Math.PI / 180)), R * Math.sin(480 * (Math.PI / 180)), 0];
    const tg = [-Math.sin(480 * (Math.PI / 180)), Math.cos(480 * (Math.PI / 180)), 0];
    const nr = [Math.cos(480 * (Math.PI / 180)), Math.sin(480 * (Math.PI / 180)), 0];
    sc.add('oa', line(combo(tip, [tg, -16], [nr, 11]), tip, combo(tip, [tg, -16], [nr, -11])));
    const teeth = 10;
    const pts = [];
    for (let i = 0; i < teeth; i++) {
      const a = (Math.PI * 2 * i) / teeth;
      const w = Math.PI / teeth;
      for (const [da, rr] of [
        [-w * 0.62, 78],
        [-w * 0.36, 96],
        [w * 0.36, 96],
        [w * 0.62, 78],
      ])
        pts.push([rr * Math.cos(a + da), rr * Math.sin(a + da)]);
    }
    prism(sc, pts, 0, 22, { sil: 'o' });
    iconAt(sc, 'k', 'wrench', [0, 0, 22], 92);
    return sc;
  },
);

scene('calendar', 'Calendar', 'A calendar pad of day keys, one day lifted over a lit slot.', () => {
  const sc = new Scene();
  const cols = 4;
  const rowsN = 3;
  const cw = 66;
  const W = cols * cw + 28;
  const D = rowsN * cw + 28 + 40;
  slab(sc, { w: W, d: D, h: 14, r: 14, inset: 0 });
  block(sc, { x: 0, y: -D / 2 + 26, z: 14, w: W - 28, d: 26, h: 8, r: 4 }, { sil: 'o2' });
  const days = [];
  for (let r = 0; r < rowsN; r++)
    for (let c = 0; c < cols; c++)
      days.push({
        x: -W / 2 + 14 + cw / 2 + c * cw,
        y: -D / 2 + 54 + cw / 2 + r * cw,
        hero: r === 1 && c === 2,
      });
  backToFront(days, (d) => {
    const k = key(sc, {
      x: d.x,
      y: d.y,
      z: 14,
      w: cw - 14,
      h: 12,
      r: 4,
      hero: d.hero,
      lift: d.hero ? 42 : 0,
    });
    if (d.hero) sc.add('af', ring(d.x, d.y, k.top, 9));
  });
  for (const x of [-W / 4, W / 4]) {
    const pts = Array.from({ length: 17 }, (_, i) => {
      const a = (Math.PI * i) / 16;
      return [x, -D / 2 + 26 - 18 * Math.cos(a), 22 + 26 * Math.sin(a)];
    });
    tube(sc, pts, 6, { sil: 'o2' });
  }
  return sc;
});

scene(
  'workload',
  'Workload',
  'Stacks of work inside dotted capacity boxes, one stack overflowing.',
  () => {
    const sc = new Scene();
    const bh = 30;
    const cap = 4;
    const cols = [
      { x: -110, y: 0, n: 2 },
      { x: 0, y: 0, n: 3 },
      { x: 110, y: 0, n: 5 },
    ];
    backToFront(cols, (c) => {
      for (let i = 0; i < Math.min(c.n, cap); i++)
        key(sc, { x: c.x, y: c.y, z: i * bh, w: 70, h: bh - 4, r: 5, split: 0 });
      ghost(sc, { x: c.x, y: c.y, w: 82, h: cap * bh, r: 6 }, c.n > cap ? 'da' : 'd');
      for (let i = cap; i < c.n; i++)
        key(sc, {
          x: c.x,
          y: c.y,
          z: i * bh,
          w: 70,
          h: bh - 4,
          r: 5,
          split: 0,
          hero: true,
          sil: 'oa',
        });
    });
    return sc;
  },
);

scene('member', 'Member', 'A single person standing on a round base.', () => {
  const sc = new Scene();
  drum(sc, { r: 76, h: 12 }, { sil: 'o2' });
  sc.add('e', ring(0, 0, 12, 62));
  bust(sc, { z: 12, s: 1.4, sil: 'oa' });
  return sc;
});

scene('team', 'Team', 'Three people gathered on one base, the lead one brighter.', () => {
  const sc = new Scene();
  drum(sc, { r: 128, h: 14 }, { sil: 'o' });
  const people = [
    { x: -54, y: 18, s: 0.95 },
    { x: 18, y: -54, s: 0.95 },
    { x: 34, y: 34, s: 1.12, hero: true },
  ];
  backToFront(people, (p) =>
    bust(sc, { x: p.x, y: p.y, z: 14, s: p.s, sil: p.hero ? 'oa' : 'o2' }),
  );
  return sc;
});

/** Sheet rotated by `deg` in plan, with an optional folded corner; returns its top-face plane. */
const page = (sc, { x = 0, y = 0, z = 0, w, d, h = 3, deg = 0, fold = 0 }, style = {}) => {
  const U = [Math.cos(deg * (Math.PI / 180)), Math.sin(deg * (Math.PI / 180)), 0];
  const V = [-U[1], U[0], 0];
  const at = (u, v) => combo([x, y, 0], [U, u - w / 2], [V, v - d / 2]);
  const outline = fold
    ? [
        [0, 0],
        [w - fold, 0],
        [w, fold],
        [w, d],
        [0, d],
      ]
    : [
        [0, 0],
        [w, 0],
        [w, d],
        [0, d],
      ];
  prism(
    sc,
    outline.map(([u, v]) => at(u, v).slice(0, 2)),
    z,
    h,
    style,
  );
  const map = ([u, v]) => [...at(u, v).slice(0, 2), z + h];
  if (fold) {
    const flap = loop([map([w - fold, 0]), map([w, fold]), map([w - fold, fold])]);
    sc.add(
      sc.linear('fold', map([w - fold, 0]), map([w - fold / 2, fold]), [
        [0, 'a', 'glow'],
        [1, 'a', 0.08],
      ]),
      flap,
    );
    sc.add('oa', flap);
  }
  return map;
};

scene(
  'document',
  'Document',
  'A fanned stack of records, the top page folded at its corner.',
  () => {
    const sc = new Scene();
    page(sc, { x: -18, y: 10, z: 0, w: 190, d: 236, deg: -12 });
    page(sc, { x: -6, y: 4, z: 3, w: 190, d: 236, deg: -5 });
    const p = page(sc, { x: 8, y: 0, z: 6, w: 190, d: 236, deg: 3, fold: 40 }, { sil: 'o' });
    rows(sc, 'e', p, [
      [24, 120, 40],
      [24, 166, 76],
      [24, 150, 106],
      [24, 166, 136],
      [24, 110, 166],
    ]);
    return sc;
  },
);

scene('approval', 'Approval', 'A rubber stamp beside the approval seal it printed.', () => {
  const sc = new Scene();
  const p = page(sc, { w: 250, d: 280, deg: -4 }, { sil: 'o' });
  rows(sc, 'e', p, [
    [26, 150, 40],
    [26, 200, 70],
    [26, 180, 100],
  ]);
  const c = p([88, 200]);
  sc.add('oa', ring(c[0], c[1], c[2], 50));
  sc.add('ka', ring(c[0], c[1], c[2], 41));
  iconAt(sc, 'ka', 'check', c, 58);
  block(sc, { x: 62, y: 10, z: 3, w: 72, d: 72, h: 18, r: 6 }, { sil: 'o' });
  lathe(
    sc,
    {
      x: 62,
      y: 10,
      z0: 21,
      z1: 100,
      r: (z) =>
        z < 60
          ? 10 + (z < 28 ? (28 - z) * 1.6 : 0)
          : 27 * Math.sin((Math.PI * (z - 60)) / 40) ** 0.7 + 1,
      rims: [[60, 10]],
      cap: false,
    },
    { sil: 'o' },
  );
  return sc;
});

scene(
  'audit',
  'Audit',
  'An audit register unrolled from its scroll, one entry highlighted.',
  () => {
    const sc = new Scene();
    const w = 220;
    const len = 210;
    const p = sheet(sc, { x: 0, y: 12, z: 0, w, d: len, h: 2, r: 2 }, { sil: 'o' });
    const rowsList = [0, 1, 2, 3, 4];
    rowsList.forEach((i) => {
      const v = 64 + i * 32;
      const hero = i === 2;
      sc.add(hero ? 'af' : 'kf', ring(...p([26, v]).slice(0, 2), 2, 5));
      sc.add(hero ? 'ka' : 'e', line(p([44, v]), p([hero ? 170 : 150 - (i % 2) * 40, v])));
    });
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
      {
        sil: 'o',
      },
    );
    return sc;
  },
);

scene(
  'automation',
  'Automation',
  'A workflow on the ground: a trigger key branching to two actions.',
  () => {
    const sc = new Scene();
    const k = 82;
    const nodes = [
      { x: -160, y: 0, icon: 'zap', hero: true },
      { x: 0, y: 0, icon: 'git-branch' },
      { x: 150, y: -86, icon: 'mail' },
      { x: 150, y: 86, icon: 'bell' },
    ];
    const run = (cls, pts) => sc.add(cls, line(...pts.map(([x, y]) => [x, y, 0])));
    const chevron = (cls, [x, y]) =>
      sc.add(cls, line([x - 12, y - 9, 0], [x, y, 0], [x - 12, y + 9, 0]));
    run('da', [
      [-160 + k / 2, 0],
      [-k / 2, 0],
    ]);
    chevron('oa', [-k / 2 - 6, 0]);
    run('da', [
      [k / 2, 0],
      [75, 0],
      [75, -86],
      [150 - k / 2, -86],
    ]);
    chevron('oa', [150 - k / 2 - 6, -86]);
    run('d', [
      [75, 0],
      [75, 86],
      [150 - k / 2, 86],
    ]);
    chevron('o2', [150 - k / 2 - 6, 86]);
    backToFront(nodes, (n) =>
      key(sc, { x: n.x, y: n.y, w: k, h: 24, r: 7, icon: n.icon, hero: n.hero }),
    );
    return sc;
  },
);

scene(
  'channel',
  'Channel',
  'A standing speech bubble with the channel hash engraved on it.',
  () => {
    const sc = new Scene();
    const bubble = icon('message-square');
    plateShape(
      sc,
      bubble,
      { o: [-10, -70, 250], U: X, V: DOWN, N: Y, s: 6.4, t: 12 },
      { sil: 'o2', fill: 't', side: 'l' },
    );
    const front = plateShape(
      sc,
      bubble,
      { o: [-130, 0, 244], U: X, V: DOWN, N: Y, s: 10, t: 18 },
      { sil: 'o', fill: 't', side: 'l' },
    );
    pathAt(sc, 'ka', icon('hash'), front([12, 11]), 100, { U: UP_LEFT, V: DOWN });
    return sc;
  },
);

scene('device', 'Device', 'A trusted phone, its lit screen showing a checked shield.', () => {
  const sc = new Scene();
  block(sc, { w: 124, d: 230, h: 12, r: 18 }, { sil: 'o' });
  const scr = rbox({ w: 104, d: 196, z: 12, r: 10 }).cap;
  const m = marks({ w: 104, d: 196 }, 12);
  sc.add('hole', scr);
  sc.add(
    sc.linear('screen', m.rear, m.fore, [
      [0, 'a', 'glow'],
      [1, 'a', 0.05],
    ]),
    scr,
  );
  sc.add('e', scr);
  sc.add('o2', rbox({ x: 0, y: -104, z: 12, w: 30, d: 6, r: 3 }).cap);
  iconAt(sc, 'ka', 'shield-check', [0, 6, 12], 78);
  return sc;
});

/** Wireframe globe: meridians and parallels split into visible and hidden runs. */
const globe = (sc, c, R) => {
  const view = [1, 1, 1];
  const vis = (p) =>
    (p[0] - c[0]) * view[0] + (p[1] - c[1]) * view[1] + (p[2] - c[2]) * view[2] > 0;
  const draw = (pts) => {
    let run = [pts[0]];
    let v = vis(pts[0]);
    for (const p of pts.slice(1)) {
      if (vis(p) !== v) {
        sc.add(v ? 'o2' : 'dh', line(...run, p));
        run = [p];
        v = vis(p);
      } else run.push(p);
    }
    sc.add(v ? 'o2' : 'dh', line(...run));
  };
  const N = 96;
  for (const lon of [0, 60, 120]) {
    const u = [Math.cos((lon * Math.PI) / 180), Math.sin((lon * Math.PI) / 180), 0];
    draw(
      Array.from({ length: N + 1 }, (_, i) =>
        combo(
          c,
          [u, R * Math.cos((2 * Math.PI * i) / N)],
          [[0, 0, 1], R * Math.sin((2 * Math.PI * i) / N)],
        ),
      ),
    );
  }
  for (const lat of [-40, 0, 40]) {
    const rr = R * Math.cos((lat * Math.PI) / 180);
    const zz = c[2] + R * Math.sin((lat * Math.PI) / 180);
    draw(
      Array.from({ length: N + 1 }, (_, i) => [
        c[0] + rr * Math.cos((2 * Math.PI * i) / N),
        c[1] + rr * Math.sin((2 * Math.PI * i) / N),
        zz,
      ]),
    );
  }
};

scene(
  'domain',
  'Domain',
  'A wireframe globe circled by an orbit carrying the @ of the domain.',
  () => {
    const sc = new Scene();
    const R = 96;
    const O = 150;
    sc.add('da', ringArc(0, 0, 0, O, 135, 315));
    sphere(sc, [0, 0, 0], R, { sil: 'o', equator: null });
    globe(sc, [0, 0, 0], R);
    sc.add('oa', ringArc(0, 0, 0, O, -45, 135));
    const at = [O * Math.cos(Math.PI / 5), O * Math.sin(Math.PI / 5)];
    cube(sc, {
      x: at[0],
      y: at[1],
      z: -28,
      s: 56,
      r: 7,
      icon: 'at-sign',
      size: 40,
      hero: true,
      accent: true,
    });
    return sc;
  },
);

scene('import', 'Import', 'A spreadsheet lowered onto a database, its landing spot lit.', () => {
  const sc = new Scene();
  const R = 92;
  for (let i = 0; i < 3; i++) drum(sc, { r: R, h: 30, z: i * 38 }, { sil: i === 2 ? 'o' : 'o2' });
  const zt = 2 * 38 + 30;
  const f = { w: 124, d: 96, r: 5 };
  litSlot(sc, 'landing', f, zt);
  const z = 200;
  uprights(sc, f, z, zt);
  const p = sheet(sc, { z, ...f, h: 3 }, { sil: 'o' });
  for (const u of [42, 84]) sc.add('e', line(p([u, 8]), p([u, 88])));
  for (const v of [30, 52, 74]) sc.add('e', line(p([8, v]), p([116, v])));
  sc.add('ka', line(p([8, 30]), p([116, 30])));
  return sc;
});

scene('invitation', 'Invitation', 'An invitation card rising out of an open envelope.', () => {
  const sc = new Scene();
  const W = 230;
  const D = 150;
  const back = -D / 2;
  const flapTip = [0, back - 46, 8 + 58];
  block(sc, { w: W, d: D, h: 8, r: 3 }, { sil: 'o' });
  sc.add('e', line([-W / 2 + 6, D / 2 - 6, 8], [0, 10, 8], [W / 2 - 6, D / 2 - 6, 8]));
  sc.add('l', loop([[-W / 2, back, 8], flapTip, [W / 2, back, 8]]));
  sc.add('o2', line([-W / 2, back, 8], flapTip, [W / 2, back, 8]));
  const slotY = back + 16;
  const card = solid({ c: [0, slotY, 8 + 66], U: X, V: [0, 0, 1], N: Y, a: 68, b: 66, r: 6, t: 3 });
  paint(sc, card, { sil: 'oa' });
  const face = plane([-68, slotY + 3, 8 + 132], X, DOWN);
  iconAt(sc, 'ka', 'user-plus', face([68, 54]), 78, UP_LEFT, DOWN);
  sc.add('e', line(face([36, 108]), face([100, 108])));
  return sc;
});

scene('invoice', 'Invoice', 'A receipt with its total underlined beside a stack of coins.', () => {
  const sc = new Scene();
  const w = 170;
  const d = 250;
  const teeth = 8;
  const pts = [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    ...Array.from({ length: 2 * teeth + 1 }, (_, i) => [
      w / 2 - (w * i) / (2 * teeth),
      d / 2 - (i % 2 ? 12 : 0),
    ]),
  ];
  prism(sc, pts, 0, 3, { sil: 'o' });
  const p = plane([-w / 2, -d / 2, 3], X, Y);
  rows(sc, 'e', p, [
    [22, 120, 34],
    [22, 148, 70],
    [22, 136, 98],
    [22, 148, 126],
  ]);
  sc.add('e', line(p([22, 160]), p([148, 160])));
  sc.add('ka', line(p([22, 192]), p([148, 192])));
  sc.add('ka', line(p([100, 192]), p([148, 192])));
  for (let i = 0; i < 3; i++)
    drum(sc, { x: 150, y: 70, z: i * 12, r: 40, h: 10 }, { sil: i === 2 ? 'o' : 'o2' });
  sc.add('e', ring(150, 70, 36, 28));
  return sc;
});

scene('label', 'Label', 'Two tags lying flat, the front one on its string.', () => {
  const sc = new Scene();
  const tag = `M${icon('tag').split('M')[1]}`;
  const size = 200;
  const U = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  const V = [Math.SQRT1_2, Math.SQRT1_2, 0];
  slabShape(sc, tag, flat(-70, -70, 0, size, U, V), { sil: 'o2', fill: 't', side: 'l' });
  const f = flat(30, 30, 12, size, U, V);
  slabShape(sc, tag, f, { sil: 'oa', fill: 't', side: 'l' });
  const hole = combo(f.o, [U, 7.3 * f.s], [V, 7.3 * f.s], [[0, 0, 1], 8]);
  sc.add('hole', ring(hole[0], hole[1], hole[2], 11));
  sc.add('oa', ring(hole[0], hole[1], hole[2], 11));
  tube(
    sc,
    bezier(
      hole,
      combo(hole, [U, -40], [V, -30]),
      combo(hole, [U, -60], [V, 40]),
      combo(hole, [U, -130], [V, 20]),
      28,
    ),
    3,
    { sil: 'o2' },
  );
  return sc;
});

scene('map', 'Map', 'A folded map with a route and a location marker.', () => {
  const sc = new Scene();
  const pw = 112;
  const D = 250;
  const z = (x) => {
    const u = (x + 1.5 * pw) / pw;
    const f = u - Math.floor(u);
    const up = Math.floor(u) % 2 === 0;
    return up ? 18 * f : 18 * (1 - f);
  };
  for (let i = 0; i < 3; i++) {
    const x0 = -1.5 * pw + i * pw;
    const x1 = x0 + pw;
    const quad = loop([
      [x0, -D / 2, z(x0 + 0.01)],
      [x1, -D / 2, z(x1 - 0.01)],
      [x1, D / 2, z(x1 - 0.01)],
      [x0, D / 2, z(x0 + 0.01)],
    ]);
    sc.add(i % 2 ? 'r' : 't', quad);
    sc.add('o', quad);
  }
  const route = (pts, cls) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [p, q] = [pts[i], pts[i + 1]];
      for (let k = 0; k <= 20; k++) {
        const x = p[0] + ((q[0] - p[0]) * k) / 20;
        const y = p[1] + ((q[1] - p[1]) * k) / 20;
        out.push([x, y, z(x)]);
      }
    }
    sc.add(cls, line(...out));
  };
  route(
    [
      [-150, 90],
      [-80, 30],
      [-10, 40],
      [70, -40],
      [150, -70],
    ],
    'e',
  );
  route(
    [
      [-40, -110],
      [-20, -40],
      [110, 60],
    ],
    'e',
  );
  const pin = [30, 10];
  sc.add('oa', ring(pin[0], pin[1], z(pin[0]), 16));
  mapPin(sc, { x: pin[0], y: pin[1], z: z(pin[0]), R: 30 });
  return sc;
});

/** Push pin: needle, flange, body and head, turned. */
const pushPin = (sc, { x, y, z, s = 1, sil = 'oa' }) => {
  const r = (zz) => {
    const u = (zz - z) / s;
    if (u < 16) return 1.6 * s;
    if (u < 21) return 17 * s;
    if (u < 40) return (8 + (1.5 * (u - 21)) / 19) * s;
    if (u < 43) return (9.5 + (u - 40) * 1.5) * s;
    if (u < 51) return 14 * s;
    return 14 * s * Math.sqrt(Math.max(0, 1 - ((u - 51) / 4) ** 2));
  };
  lathe(
    sc,
    {
      x,
      y,
      z0: z,
      z1: z + 55 * s,
      r,
      rims: [[z + 16 * s, 17 * s], [z + 21 * s, 17 * s], z + 43 * s],
      cap: false,
    },
    { sil, rim: 'e' },
  );
};

scene('pinned', 'Pinned', 'A note held in place by a push pin.', () => {
  const sc = new Scene();
  const p = sheet(sc, { w: 220, d: 190, h: 3, r: 4 }, { sil: 'o' });
  rows(sc, 'e', p, [
    [30, 150, 90],
    [30, 190, 118],
    [30, 170, 146],
  ]);
  pushPin(sc, { x: 0, y: -46, z: 3, s: 1.5 });
  return sc;
});

scene('plan', 'Plan', 'A cut gem floating over the lit slot of its pedestal.', () => {
  const sc = new Scene();
  block(sc, { w: 170, d: 170, h: 26, r: 12 }, { sil: 'o2' });
  litSlot(sc, 'slot', { w: 120, d: 120, r: 60 }, 26);
  const n = 8;
  const R = 62;
  const g = 26 + 40 + 76;
  const tableR = 0.5 * R;
  const ang = (i) => (2 * Math.PI * i) / n + Math.PI / n;
  const P = (rad, zz, i) => [rad * Math.cos(ang(i)), rad * Math.sin(ang(i)), zz];
  const culet = [0, 0, g - 76];
  const faces = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([culet, P(R, g, i), P(R, g, j)]);
    faces.push([P(R, g, i), P(R, g, j), P(R, g + 5, j), P(R, g + 5, i)]);
    faces.push([P(R, g + 5, i), P(R, g + 5, j), P(tableR, g + 27, j), P(tableR, g + 27, i)]);
  }
  faces.push(Array.from({ length: n }, (_, i) => P(tableR, g + 27, i)));
  poly(sc, faces, { sil: 'oa', edge: 'ka' });
  return sc;
});

scene(
  'request',
  'Membership request',
  'A person waiting in the light of a door opening toward them.',
  () => {
    const sc = new Scene();
    const H = 184;
    const ow = 78;
    const oh = 138;
    const t = 14;
    sc.add(
      sc.linear(
        'spill',
        [0, 0, 0],
        [0, 150, 0],
        [
          [0, 'a', 'glow'],
          [1, 'a', 0],
        ],
      ),
      loop([
        [-ow / 2, 0, 0],
        [ow / 2, 0, 0],
        [ow / 2 + 46, 150, 0],
        [-ow / 2 - 46, 150, 0],
      ]),
    );
    sc.add(
      sc.linear(
        'inside',
        [0, 0, oh],
        [0, 0, 0],
        [
          [0, 'a', 0.12],
          [1, 'a', 'glow'],
        ],
      ),
      loop([
        [-ow / 2, 0, 0],
        [ow / 2, 0, 0],
        [ow / 2, 0, oh],
        [-ow / 2, 0, oh],
      ]),
    );
    backToFront(
      [
        { x: -ow / 2 - 55, y: -t / 2, w: 110, h: H, z: 0 },
        { x: ow / 2 + 55, y: -t / 2, w: 110, h: H, z: 0 },
        { x: 0, y: -t / 2, w: ow, h: H - oh, z: oh },
      ],
      (p) => block(sc, { x: p.x, y: p.y, z: p.z, w: p.w, d: t, h: p.h, r: 0 }, { sil: 'o' }),
    );
    const open = (52 * Math.PI) / 180;
    const dir = [-Math.cos(open), Math.sin(open), 0];
    const leaf = solid({
      c: [ow / 2 + (dir[0] * ow) / 2, (dir[1] * ow) / 2, oh / 2],
      U: dir,
      V: [0, 0, 1],
      N: [dir[1], -dir[0], 0],
      a: ow / 2 - 1,
      b: oh / 2 - 1,
      r: 0,
      t: 6,
    });
    paint(sc, leaf, { sil: 'o' });
    const knob = combo([ow / 2, 0, 66], [dir, ow - 12], [[dir[1], -dir[0], 0], 10]);
    sphere(sc, knob, 3.5, { sil: 'o2', equator: null });
    bust(sc, { x: 40, y: 104, s: 0.95, sil: 'o2' });
    return sc;
  },
);

scene(
  'role',
  'Role',
  'A keypad of permissions, the key of the role lifted over a lit slot.',
  () => {
    const sc = new Scene();
    const W = 300;
    const inset = 14;
    const cell = (W - 2 * inset) / 3;
    slab(sc, { w: W, d: W, h: 14, r: 16, inset, grid: { cols: 3, rows: 3 } });
    const icons = [
      'eye',
      'pencil',
      'key-round',
      'users',
      'lock',
      'bell',
      'file-text',
      'settings',
      'trash-2',
    ];
    const keys = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        keys.push({
          x: -cell + c * cell,
          y: -cell + r * cell,
          icon: icons[r * 3 + c],
          hero: r === 0 && c === 2,
        });
    backToFront(keys, (k) =>
      key(sc, {
        x: k.x,
        y: k.y,
        z: 14,
        w: cell - 22,
        h: 16,
        r: 5,
        icon: k.icon,
        hero: k.hero,
        lift: k.hero ? 58 : 0,
      }),
    );
    return sc;
  },
);

scene('saved', 'Saved', 'A standing bookmark over a saved message card.', () => {
  const sc = new Scene();
  const p = sheet(sc, { w: 250, d: 170, h: 5, r: 10 }, { sil: 'o' });
  sc.add('o2', ring(...p([38, 40]).slice(0, 2), 5, 13));
  rows(sc, 'e', p, [
    [62, 150, 34],
    [62, 118, 50],
    [24, 196, 96],
    [24, 164, 122],
  ]);
  const mark = 'M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z';
  const s = 7.4;
  const o = [40 - 12 * s, 6, 5 + 21 * s];
  const front = plateShape(
    sc,
    mark,
    { o, U: X, V: DOWN, N: Y, s, t: 12 },
    { sil: 'oa', fill: 't', side: 'l' },
  );
  sc.add(
    sc.linear('mark', front([12, 3]), front([12, 21]), [
      [0, 'a', 'glow'],
      [1, 'a', 0.05],
    ]),
    mapSegs(parse(mark), front),
  );
  return sc;
});

scene('session', 'Session', 'An open laptop whose lit screen shows a sign-in.', () => {
  const sc = new Scene();
  const w = 230;
  const d = 156;
  const p = sheet(sc, { w, d, h: 9, r: 8 }, { sil: 'o' });
  sc.add('e', rbox({ x: 0, y: -18, z: 9, w: w - 30, d: 76, r: 4 }).cap);
  for (const v of [30, 48, 66]) sc.add('e', line(p([22, v]), p([w - 22, v])));
  sc.add('e', rbox({ x: 0, y: 50, z: 9, w: 70, d: 34, r: 4 }).cap);
  const tilt = (14 * Math.PI) / 180;
  const up = [0, -Math.sin(tilt), Math.cos(tilt)];
  const n = [0, Math.cos(tilt), Math.sin(tilt)];
  const H = 160;
  const base = [0, -d / 2 + 2, 9];
  const scr = solid({
    c: combo(base, [up, H / 2], [[0, 1, 0], -3]),
    U: X,
    V: up,
    N: n,
    a: w / 2,
    b: H / 2,
    r: 8,
    t: 6,
  });
  paint(sc, scr, { sil: 'o' });
  const face = (u, v) => combo(base, [n, 3.2], [X, u - w / 2], [up, H - v]);
  const glassQ = loop([face(14, 14), face(w - 14, 14), face(w - 14, H - 14), face(14, H - 14)]);
  sc.add('hole', glassQ);
  sc.add(
    sc.linear('screen', face(w / 2, 14), face(w / 2, H - 14), [
      [0, 'a', 0.06],
      [1, 'a', 'glow'],
    ]),
    glassQ,
  );
  sc.add('e', glassQ);
  const lean = 0.5 / (0.5 * Math.sin(tilt) + Math.cos(tilt));
  iconAt(sc, 'ka', 'log-in', face(w / 2, H / 2), 70, combo(X, [up, lean]), [0, -up[1], -up[2]]);
  return sc;
});

scene('time-entry', 'Time entry', 'A standing stopwatch, its elapsed time lit.', () => {
  const sc = new Scene();
  const R = 104;
  const t = 26;
  drum(sc, { x: 0, y: -2, z: 2 * R + 2, r: 9, h: 14 }, { sil: 'o2' });
  drum(sc, { x: 0, y: -2, z: 2 * R + 16, r: 16, h: 8 }, { sil: 'o2' });
  const body = solid({ c: [0, -t / 2, R], U: X, V: [0, 0, 1], N: Y, a: R, b: R, r: R, t });
  paint(sc, body, { sil: 'o' });
  const C = [0, t / 2, R];
  const at = (rr, deg) =>
    combo(
      C,
      [X, rr * Math.cos((deg * Math.PI) / 180)],
      [[0, 0, 1], rr * Math.sin((deg * Math.PI) / 180)],
    );
  sc.add('e', [...arcIn(C, X, [0, 0, 1], R - 12, 0, 360), ['Z']]);
  for (let i = 0; i < 12; i++) {
    const deg = 90 - i * 30;
    sc.add('e', line(at(i % 3 ? R - 28 : R - 36, deg), at(R - 20, deg)));
  }
  const r = R - 40;
  const pie = [['M', C], ['L', at(r, 90)], ...arcIn(C, X, [0, 0, 1], r, 90, -30, false), ['Z']];
  sc.add(
    sc.linear('elapsed', at(r, 90), at(r, -30), [
      [0, 'a', 'glow'],
      [1, 'a', 0.1],
    ]),
    pie,
  );
  sc.add('oa', pie);
  sc.add('af', [...arcIn(C, X, [0, 0, 1], 6, 0, 360), ['Z']]);
  return sc;
});

scene('usage', 'Usage', 'A battery meter with most of its cells used.', () => {
  const sc = new Scene();
  const L = 290;
  const D = 130;
  const H = 40;
  block(sc, { w: L, d: D, h: H, r: 20 }, { sil: 'o' });
  block(sc, { x: L / 2 + 10, y: 0, z: 8, w: 24, d: 48, h: 24, r: 6 }, { sil: 'o2' });
  sc.add('e', rbox({ w: L - 24, d: D - 24, z: H, r: 12 }).cap);
  const cw = (L - 60) / 4;
  const cells = [0, 1, 2, 3].map((i) => ({ x: -L / 2 + 30 + cw / 2 + i * cw, y: 0, i }));
  backToFront(cells, (c) => {
    if (c.i === 3) {
      ghost(sc, { x: c.x, y: 0, z: H, w: cw - 14, d: D - 44, h: 12, r: 5 });
      return;
    }
    key(sc, { x: c.x, y: 0, z: H, w: cw - 14, d: D - 44, h: 12, r: 5, split: 0, hero: c.i === 2 });
    const f = rbox({ x: c.x, z: H + 12, w: cw - 14, d: D - 44, r: 5 }).cap;
    const m = marks({ x: c.x, w: cw - 14, d: D - 44 }, H + 12);
    sc.add(
      sc.linear(`cell${c.i}`, m.rear, m.fore, [
        [0, 'a', 'glow'],
        [1, 'a', 0.06],
      ]),
      f,
    );
  });
  return sc;
});

/** Server cube: rack bands on its sides and a status light. */
const server = (sc, { x, y, s = 90, iconName = 'server' }) => {
  paint(sc, rbox({ x, y, w: s, d: s, h: s, r: 8 }), {
    sil: 'o2',
    edge: 'd',
    rings: [s / 3, (2 * s) / 3],
  });
  iconAt(sc, 'k', iconName, [x, y, s], s * 0.5);
};

scene('webhook', 'Webhook', 'A payload arcing from its source to an external endpoint.', () => {
  const sc = new Scene();
  const s = 86;
  const a = [-150, 0, s + 6];
  const b = [150, 0, s + 6];
  const arc = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return [a[0] + (b[0] - a[0]) * t, 0, a[2] + 110 * 4 * t * (1 - t)];
  });
  cube(sc, { x: -150, y: 0, s, r: 8, icon: 'send', size: 50 });
  sc.add('da', line(...arc));
  const end = arc.at(-1);
  sc.add(
    'oa',
    line(combo(end, [X, -12], [[0, 0, 1], 4]), end, combo(end, [X, 2], [[0, 0, 1], 14])),
  );
  server(sc, { x: 150, y: 0, s, iconName: 'globe' });
  const top = arc[20];
  cube(sc, {
    x: top[0],
    y: 0,
    z: top[2] - 20,
    s: 40,
    r: 6,
    icon: 'braces',
    size: 30,
    hero: true,
    accent: true,
  });
  return sc;
});

scene(
  'work-item',
  'Work item',
  'A task board, one card lifted on its way to the next column.',
  () => {
    const sc = new Scene();
    const W = 330;
    const D = 250;
    slab(sc, { w: W, d: D, h: 12, r: 12, inset: 12, grid: { cols: 3, rows: 1 } });
    const lane = (W - 24) / 3;
    const cw = lane - 24;
    const cd = 60;
    for (let i = 0; i < 3; i++) {
      const x = -lane + i * lane;
      sc.add('e', rbox({ x, y: -D / 2 + 30, z: 12, w: cw, d: 14, r: 4 }).cap);
    }
    const cards = [
      { x: -lane, y: -38 },
      { x: -lane, y: 34 },
      { x: 0, y: -38 },
      { x: 0, y: 34, hero: true },
      { x: lane, y: -38 },
    ];
    backToFront(cards, (c) => {
      const k = key(sc, {
        x: c.x,
        y: c.y,
        z: 12,
        w: cw,
        d: cd,
        h: 8,
        r: 5,
        split: 0,
        hero: c.hero,
        lift: c.hero ? 48 : 0,
      });
      const p = plane([c.x - cw / 2, c.y - cd / 2, k.top], X, Y);
      sc.add(c.hero ? 'af' : 'kf', ring(...p([16, 18]).slice(0, 2), k.top, 6));
      sc.add(c.hero ? 'ka' : 'e', line(p([30, 18]), p([cw - 14, 18])));
      sc.add('e', line(p([14, 38]), p([cw - 30, 38])));
    });
    return sc;
  },
);
