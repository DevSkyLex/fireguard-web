import { polygonCentroid } from '../polygon-centroid.utils';

describe('polygonCentroid', () => {
  it('returns the origin for an empty polygon', () => {
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 });
  });

  it('returns the single vertex for a one-point polygon', () => {
    expect(polygonCentroid([{ x: 5, y: 7 }])).toEqual({ x: 5, y: 7 });
  });

  it('computes the centroid of a square', () => {
    const centroid = polygonCentroid([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ]);

    expect(centroid.x).toBeCloseTo(5);
    expect(centroid.y).toBeCloseTo(5);
  });

  it('computes the centroid of a right triangle', () => {
    const centroid = polygonCentroid([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 6 },
    ]);

    expect(centroid.x).toBeCloseTo(2);
    expect(centroid.y).toBeCloseTo(2);
  });

  it('falls back to the vertex average for a degenerate (collinear) polygon', () => {
    const centroid = polygonCentroid([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 10, y: 0 },
    ]);

    expect(centroid).toEqual({ x: 5, y: 0 });
  });
});
