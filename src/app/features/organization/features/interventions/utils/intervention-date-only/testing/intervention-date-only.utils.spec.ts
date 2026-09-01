import { toUtcMidnight } from '../intervention-date-only.utils';

describe('toUtcMidnight', () => {
  it('re-anchors a local-midnight date to midnight UTC of the same calendar day', () => {
    const local: Date = new Date(2026, 8, 2);

    expect(toUtcMidnight(local).toISOString()).toBe('2026-09-02T00:00:00.000Z');
  });

  it('keeps the local calendar day even when local midnight is a different UTC day', () => {
    const eveningOffset: Date = new Date(2026, 0, 1, 0, 0, 0);

    expect(toUtcMidnight(eveningOffset).toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('drops any time-of-day component', () => {
    const withTime: Date = new Date(2026, 8, 2, 17, 45, 12, 345);

    expect(toUtcMidnight(withTime).toISOString()).toBe('2026-09-02T00:00:00.000Z');
  });
});
