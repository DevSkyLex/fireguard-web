import {
  addDraftVertex,
  isClosablePolygon,
  isTapGesture,
  screenPointToNormalized,
  undoDraftVertex,
} from '../draft-polygon.utils';

describe('screenPointToNormalized', () => {
  it('normalizes a point relative to the rect origin and size', () => {
    expect(
      screenPointToNormalized({ x: 150, y: 50 }, { left: 100, top: 0, width: 200, height: 100 }),
    ).toEqual([0.25, 0.5]);
  });

  it('maps the rect origin to [0, 0]', () => {
    expect(
      screenPointToNormalized({ x: 10, y: 20 }, { left: 10, top: 20, width: 400, height: 200 }),
    ).toEqual([0, 0]);
  });

  it('maps the far corner to [1, 1]', () => {
    expect(
      screenPointToNormalized({ x: 410, y: 220 }, { left: 10, top: 20, width: 400, height: 200 }),
    ).toEqual([1, 1]);
  });

  it('clamps a point beyond the rect to [0, 1]', () => {
    expect(
      screenPointToNormalized({ x: -50, y: 999 }, { left: 0, top: 0, width: 100, height: 100 }),
    ).toEqual([0, 1]);
  });

  it('falls back to the origin when the rect has no size yet', () => {
    expect(
      screenPointToNormalized({ x: 50, y: 50 }, { left: 0, top: 0, width: 0, height: 0 }),
    ).toEqual([0, 0]);
  });
});

describe('isTapGesture', () => {
  it('is a tap when the pointer never moved', () => {
    expect(isTapGesture({ x: 10, y: 10 }, { x: 10, y: 10 }, 6)).toBe(true);
  });

  it('is a tap when travel stays within the threshold', () => {
    expect(isTapGesture({ x: 10, y: 10 }, { x: 13, y: 14 }, 6)).toBe(true);
  });

  it('is a tap exactly at the threshold', () => {
    expect(isTapGesture({ x: 0, y: 0 }, { x: 6, y: 0 }, 6)).toBe(true);
  });

  it('is not a tap once travel exceeds the threshold', () => {
    expect(isTapGesture({ x: 0, y: 0 }, { x: 20, y: 0 }, 6)).toBe(false);
  });
});

describe('addDraftVertex', () => {
  it('appends a vertex without mutating the source array', () => {
    const points: ReadonlyArray<readonly [number, number]> = [[0.1, 0.1]];

    const next = addDraftVertex(points, [0.2, 0.2]);

    expect(next).toEqual([
      [0.1, 0.1],
      [0.2, 0.2],
    ]);
    expect(points).toEqual([[0.1, 0.1]]);
  });

  it('appends to an empty list', () => {
    expect(addDraftVertex([], [0.5, 0.5])).toEqual([[0.5, 0.5]]);
  });
});

describe('undoDraftVertex', () => {
  it('removes the last vertex', () => {
    const points: ReadonlyArray<readonly [number, number]> = [
      [0.1, 0.1],
      [0.2, 0.2],
      [0.3, 0.3],
    ];

    expect(undoDraftVertex(points)).toEqual([
      [0.1, 0.1],
      [0.2, 0.2],
    ]);
  });

  it('is a no-op on an empty list', () => {
    expect(undoDraftVertex([])).toEqual([]);
  });

  it('empties a single-vertex list', () => {
    expect(undoDraftVertex([[0.1, 0.1]])).toEqual([]);
  });
});

describe('isClosablePolygon', () => {
  it('is false below three vertices', () => {
    expect(isClosablePolygon([])).toBe(false);
    expect(isClosablePolygon([[0.1, 0.1]])).toBe(false);
    expect(
      isClosablePolygon([
        [0.1, 0.1],
        [0.2, 0.2],
      ]),
    ).toBe(false);
  });

  it('is true at exactly three vertices', () => {
    expect(
      isClosablePolygon([
        [0.1, 0.1],
        [0.2, 0.2],
        [0.3, 0.1],
      ]),
    ).toBe(true);
  });

  it('is true beyond three vertices', () => {
    expect(
      isClosablePolygon([
        [0.1, 0.1],
        [0.2, 0.2],
        [0.3, 0.1],
        [0.4, 0.2],
      ]),
    ).toBe(true);
  });
});
