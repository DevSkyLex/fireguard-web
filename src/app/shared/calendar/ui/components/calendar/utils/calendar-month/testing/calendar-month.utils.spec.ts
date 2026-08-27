import { buildCalendarMonthDays, startOfMonth, toIsoDay } from '../calendar-month.utils';

describe('calendar month utils', () => {
  it('should collapse a date to its local day, never shifting through UTC', () => {
    expect(toIsoDay(new Date(2026, 7, 9, 23, 30))).toBe('2026-08-09');
    expect(toIsoDay(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('should anchor any date on local midnight of the first of its month', () => {
    const anchor = startOfMonth(new Date(2026, 7, 15, 18, 45));

    expect(toIsoDay(anchor)).toBe('2026-08-01');
    expect(anchor.getHours()).toBe(0);
  });

  it('should build Monday-first full weeks covering the whole month', () => {
    const days = buildCalendarMonthDays(new Date(2026, 7, 15)).map(toIsoDay);

    expect(days.length % 7).toBe(0);
    expect(days[0]).toBe('2026-07-27');
    expect(days[5]).toBe('2026-08-01');
    expect(days[days.length - 1]).toBe('2026-09-06');
  });

  it('should build Sunday-first full weeks when the preference says so', () => {
    const days = buildCalendarMonthDays(new Date(2026, 7, 15), 'sunday').map(toIsoDay);

    expect(days.length % 7).toBe(0);
    expect(days[0]).toBe('2026-07-26');
    expect(days[6]).toBe('2026-08-01');
    expect(days[days.length - 1]).toBe('2026-09-05');
  });

  it('should be pure — the same anchor always yields the same grid', () => {
    const first = buildCalendarMonthDays(new Date(2026, 1, 10)).map(toIsoDay);
    const second = buildCalendarMonthDays(new Date(2026, 1, 27)).map(toIsoDay);

    expect(second).toEqual(first);
    expect(first[0]).toBe('2026-01-26');
  });
});
