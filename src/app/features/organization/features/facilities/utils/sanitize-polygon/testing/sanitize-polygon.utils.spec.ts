import type { SanitizedPolygonResult } from '@features/organization/features/facilities/models';
import { sanitizePolygon } from '../sanitize-polygon.utils';

describe('sanitizePolygon', () => {
  it('accepts a valid triangle', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.5, 0.1],
      [0.3, 0.5],
    ]);

    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') {
      expect(result.points.length).toBe(3);
    }
  });

  it('drops the closing duplicate between the first and last point', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.5, 0.1],
      [0.3, 0.5],
      [0.1, 0.1],
    ]);

    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') {
      expect(result.points.length).toBe(3);
    }
  });

  it('drops a zero-length segment created by a repeated point', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.5, 0.1],
      [0.5, 0.1],
      [0.3, 0.5],
    ]);

    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') {
      expect(result.points.length).toBe(3);
    }
  });

  it('collapses an intermediate collinear vertex', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.3, 0.1],
      [0.5, 0.1],
      [0.3, 0.5],
    ]);

    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') {
      expect(result.points.length).toBe(3);
      expect(result.points).not.toContainEqual([0.3, 0.1]);
    }
  });

  it('rejects a polygon whose area is near zero', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.2, 0.1],
      [0.3, 0.1],
    ]);

    expect(result.status).toBe('rejected');
  });

  it('rejects a self-intersecting (bow-tie) outline', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.5, 0.5],
      [0.5, 0.1],
      [0.1, 0.5],
    ]);

    expect(result.status).toBe('rejected');
  });

  it('rejects a non-finite coordinate', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.5, Number.NaN],
      [0.3, 0.5],
    ]);

    expect(result.status).toBe('rejected');
  });

  it('rejects a coordinate outside the [0, 1] bounds', () => {
    const result: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [1.5, 0.1],
      [0.3, 0.5],
    ]);

    expect(result.status).toBe('rejected');
  });

  it('normalizes a clockwise contour to counter-clockwise winding', () => {
    const clockwise: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.3, 0.5],
      [0.5, 0.1],
    ]);
    const counterClockwise: SanitizedPolygonResult = sanitizePolygon([
      [0.1, 0.1],
      [0.5, 0.1],
      [0.3, 0.5],
    ]);

    expect(clockwise.status).toBe('accepted');
    expect(counterClockwise.status).toBe('accepted');
    if (clockwise.status === 'accepted' && counterClockwise.status === 'accepted') {
      expect(shoelaceArea(clockwise.points)).toBeGreaterThan(0);
      expect(shoelaceArea(counterClockwise.points)).toBeGreaterThan(0);
    }
  });
});

function shoelaceArea(points: ReadonlyArray<readonly [number, number]>): number {
  let sum = 0;

  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }

  return sum / 2;
}
