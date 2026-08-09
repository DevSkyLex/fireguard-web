import { buildCalendarMonth, toIsoDay } from '../calendar-month.utils';

describe('calendar month utils', () => {
  it('should collapse a date to its local day, never shifting through UTC', () => {
    expect(toIsoDay(new Date(2026, 7, 9, 23, 30))).toBe('2026-08-09');
    expect(toIsoDay(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('should build Monday-first full weeks covering the whole month', () => {
    const weeks = buildCalendarMonth(new Date(2026, 7, 15), new Date(2026, 7, 9));

    // August 2026 starts on a Saturday: the first week leads with July fillers.
    expect(weeks[0]?.[0]?.iso).toBe('2026-07-27');
    expect(weeks[0]?.[0]?.inMonth).toBe(false);
    expect(weeks[0]?.[5]?.iso).toBe('2026-08-01');
    expect(weeks[0]?.[5]?.inMonth).toBe(true);

    const lastWeek = weeks[weeks.length - 1];
    expect(lastWeek?.[lastWeek.length - 1]?.iso).toBe('2026-09-06');
    for (const week of weeks) expect(week).toHaveLength(7);
  });

  it('should mark today from the instant passed in, not the wall clock', () => {
    const weeks = buildCalendarMonth(new Date(2026, 7, 15), new Date(2026, 7, 9));
    const today = weeks.flat().find((cell) => cell.isToday);

    expect(today?.iso).toBe('2026-08-09');
  });
});
