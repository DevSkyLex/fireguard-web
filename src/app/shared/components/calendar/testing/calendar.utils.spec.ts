import type { CalendarCategoryGroup, CalendarEvent } from '../models';
import {
  buildAgendaDays,
  buildMonthDays,
  buildWeekDays,
  filterEventsByCategories,
  isSameDay,
  startOfWeek,
  weekdayLabels,
} from '../utils';

function event(id: string, start: Date, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id, title: `Event ${id}`, start, ...extra };
}

describe('calendar utils', () => {
  describe('filterEventsByCategories', () => {
    const events = [
      event('a', new Date(2026, 5, 10, 9), { categoryIds: ['status:draft'] }),
      event('b', new Date(2026, 5, 11, 9), { categoryIds: ['status:planned'] }),
    ];

    it('returns all events when every category is active', () => {
      const groups: CalendarCategoryGroup[] = [
        {
          id: 'status',
          label: 'Status',
          categories: [
            { id: 'status:draft', label: 'Draft', active: true },
            { id: 'status:planned', label: 'Planned', active: true },
          ],
        },
      ];
      expect(filterEventsByCategories(events, groups).map((e) => e.id)).toEqual(['a', 'b']);
    });

    it('hides events that belong to a switched-off category', () => {
      const groups: CalendarCategoryGroup[] = [
        {
          id: 'status',
          label: 'Status',
          categories: [
            { id: 'status:draft', label: 'Draft', active: false },
            { id: 'status:planned', label: 'Planned', active: true },
          ],
        },
      ];
      expect(filterEventsByCategories(events, groups).map((e) => e.id)).toEqual(['b']);
    });
  });

  describe('weekdayLabels / startOfWeek', () => {
    it('orders weekday labels by the week start', () => {
      expect(weekdayLabels(1)[0]).toBe('Mon');
      expect(weekdayLabels(0)[0]).toBe('Sun');
    });

    it('resolves the Monday of a week', () => {
      const monday = startOfWeek(new Date(2026, 5, 18), 1); // Thu 18 June 2026
      expect(isSameDay(monday, new Date(2026, 5, 15))).toBe(true);
    });
  });

  describe('buildMonthDays', () => {
    const today = new Date(2026, 5, 21);
    const days = buildMonthDays(
      new Date(2026, 5, 10),
      [event('x', new Date(2026, 5, 15, 9))],
      1,
      today,
    );

    it('returns a 42-cell, Monday-first grid', () => {
      expect(days).toHaveLength(42);
      expect(days[0].date.getDay()).toBe(1);
    });

    it('flags in-month/today cells and places the event', () => {
      const june15 = days.find((d) => isSameDay(d.date, new Date(2026, 5, 15)));
      expect(june15?.inMonth).toBe(true);
      expect(june15?.events.map((e) => e.id)).toEqual(['x']);
      expect(days.filter((d) => d.isToday)).toHaveLength(1);
    });
  });

  describe('buildAgendaDays', () => {
    const agenda = buildAgendaDays(new Date(2026, 5, 1), [
      event('june-15', new Date(2026, 5, 15, 9)),
      event('june-10', new Date(2026, 5, 10, 9)),
      event('july-05', new Date(2026, 6, 5, 9)),
    ]);

    it('groups the displayed month by day, ascending, excluding others', () => {
      expect(agenda.map((d) => d.date.getDate())).toEqual([10, 15]);
    });

    it('orders a day all-day first, then ascending by start time', () => {
      const [day] = buildAgendaDays(new Date(2026, 5, 1), [
        event('timed-late', new Date(2026, 5, 12, 14, 0)),
        event('all-day', new Date(2026, 5, 12, 8, 0), { allDay: true }),
        event('timed-early', new Date(2026, 5, 12, 9, 0)),
      ]);
      expect(day.events.map((e) => e.id)).toEqual(['all-day', 'timed-early', 'timed-late']);
    });
  });

  describe('buildWeekDays', () => {
    const today = new Date(2026, 5, 21);
    const week = buildWeekDays(
      new Date(2026, 5, 16),
      [
        event('e1', new Date(2026, 5, 16, 9, 0), { end: new Date(2026, 5, 16, 10, 0) }),
        event('e2', new Date(2026, 5, 16, 9, 30), { end: new Date(2026, 5, 16, 10, 30) }),
      ],
      1,
      today,
      7,
      20,
    );

    it('returns 7 columns starting Monday', () => {
      expect(week).toHaveLength(7);
      expect(week[0].date.getDay()).toBe(1);
    });

    it('places and lane-packs overlapping timed events', () => {
      const tuesday = week[1]; // 16 June
      expect(tuesday.timedEvents).toHaveLength(2);
      expect(tuesday.timedEvents.every((t) => t.laneCount === 2)).toBe(true);
      expect(new Set(tuesday.timedEvents.map((t) => t.lane))).toEqual(new Set([0, 1]));
      const first = tuesday.timedEvents.find((t) => t.event.id === 'e1');
      // 9:00 in a 07:00–20:00 window → (540-420)/780 ≈ 15.4%
      expect(first?.topPct).toBeCloseTo(15.38, 1);
      expect(first?.heightPct).toBeCloseTo(7.69, 1);
    });
  });
});
