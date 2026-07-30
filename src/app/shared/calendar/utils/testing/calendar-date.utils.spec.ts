import { isSameDay, startOfWeek, weekdayLabels } from '../calendar-date.utils';

describe('calendar-date utils', () => {
  describe('weekdayLabels', () => {
    it('orders weekday labels by the week start', () => {
      expect(weekdayLabels(1)[0]).toBe('Mon');
      expect(weekdayLabels(0)[0]).toBe('Sun');
    });
  });

  describe('startOfWeek', () => {
    it('resolves the Monday of a week', () => {
      const monday = startOfWeek(new Date(2026, 5, 18), 1); // Thu 18 June 2026
      expect(isSameDay(monday, new Date(2026, 5, 15))).toBe(true);
    });
  });
});
