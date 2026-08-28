import { toApiDateTime } from '../api-date-time.utils';

describe('toApiDateTime', () => {
  it('should render the UTC instant without milliseconds, ATOM offset form', () => {
    expect(toApiDateTime(new Date('2026-08-12T09:00:00.000Z'))).toBe('2026-08-12T09:00:00+00:00');
  });

  it('should keep the instant identical to toISOString up to the second', () => {
    const value: Date = new Date('2026-12-31T23:59:59.999Z');

    expect(toApiDateTime(value)).toBe('2026-12-31T23:59:59+00:00');
  });
});
