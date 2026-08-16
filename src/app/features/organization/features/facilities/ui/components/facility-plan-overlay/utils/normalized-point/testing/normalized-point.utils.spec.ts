import { normalizedPointToPixel } from '../normalized-point.utils';

describe('normalizedPointToPixel', () => {
  it('scales a normalized point by the image dimensions', () => {
    expect(normalizedPointToPixel({ x: 0.5, y: 0.25 }, 1200, 800)).toEqual({ x: 600, y: 200 });
  });

  it('maps the origin to the origin', () => {
    expect(normalizedPointToPixel({ x: 0, y: 0 }, 1200, 800)).toEqual({ x: 0, y: 0 });
  });

  it('maps the far corner to the image size', () => {
    expect(normalizedPointToPixel({ x: 1, y: 1 }, 1200, 800)).toEqual({ x: 1200, y: 800 });
  });
});
