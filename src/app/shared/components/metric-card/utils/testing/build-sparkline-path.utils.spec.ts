import { buildSparklinePath } from '../build-sparkline-path.utils';

describe('buildSparklinePath', () => {
  it('should return null when fewer than two points are provided', () => {
    expect(buildSparklinePath([])).toBeNull();
    expect(buildSparklinePath([5])).toBeNull();
  });

  it('should span the full 120x26 viewBox with a 2px vertical inset', () => {
    const path = buildSparklinePath([0, 10]);

    expect(path).toBe('M0,24 L120,2');
  });

  it('should distribute points evenly on the x axis', () => {
    const path = buildSparklinePath([0, 5, 10]);

    expect(path).toBe('M0,24 L60,13 L120,2');
  });

  it('should render a flat series as a centered horizontal line', () => {
    const path = buildSparklinePath([7, 7, 7]);

    expect(path).toBe('M0,13 L60,13 L120,13');
  });

  it('should keep intermediate values proportional between min and max', () => {
    const path = buildSparklinePath([0, 2.5, 10]);

    expect(path).toBe('M0,24 L60,18.5 L120,2');
  });
});
