import type { CalendarDisplayEvent } from '@shared/calendar/models/calendar-display-event.interface';
import { buildCalendarMonthLayout } from '../calendar-layout.utils';

/**
 * Function event
 * @description Creates one valid calendar input with explicit overrides for range boundaries.
 * @access private
 * @since 1.0.0
 * @param {Partial<CalendarDisplayEvent>} overrides - Values for the tested range or source.
 * @returns {CalendarDisplayEvent} The generic event supplied to the layout.
 */
function event(overrides: Partial<CalendarDisplayEvent> = {}): CalendarDisplayEvent {
  return {
    id: 'event',
    date: '2026-09-09',
    label: 'Inspection',
    tone: 'default',
    ...overrides,
  };
}

/**
 * Function days
 * @description Builds consecutive local calendar days from a Monday without timezone conversion.
 * @access private
 * @since 1.0.0
 * @param {number} count - Number of days included in the displayed grid.
 * @returns {readonly Date[]} The local grid dates.
 */
function days(count: number = 14): readonly Date[] {
  return Array.from({ length: count }, (unused, index) => new Date(2026, 8, 7 + index));
}

describe('buildCalendarMonthLayout', () => {
  it('keeps previous-week lanes and counts sources for events hidden by the two-lane limit', () => {
    const layout = buildCalendarMonthLayout(days(), [
      event({
        id: 'long',
        date: '2026-09-11',
        endDate: '2026-09-16T17:00:00',
        sourceLabel: 'Work',
      }),
      event({
        id: 'second',
        date: '2026-09-12',
        endDate: '2026-09-14T17:00:00',
        sourceLabel: 'Work',
      }),
      event({ id: 'hidden', date: '2026-09-13', sourceLabel: 'Inspection' }),
    ]);

    expect(layout.summaries.get('2026-09-13')).toEqual({
      count: 3,
      dots: [0, 1, 2],
      overflow: 1,
      sourceLabels: ['Work', 'Inspection'],
    });
    expect(layout.segmentsByStart.get('2026-09-14')).toEqual([
      expect.objectContaining({ event: expect.objectContaining({ id: 'long' }), lane: 0, days: 3 }),
      expect.objectContaining({
        event: expect.objectContaining({ id: 'second' }),
        lane: 1,
        days: 1,
      }),
    ]);
    expect(
      [...layout.segmentsByStart.values()].flat().some((segment) => segment.event.id === 'hidden'),
    ).toBe(false);
  });

  it('excludes timed midnight ends while retaining all-day ends on the following week', () => {
    const layout = buildCalendarMonthLayout(days(), [
      event({ id: 'timed', date: '2026-09-13T10:00:00', endDate: '2026-09-14T00:00:00' }),
      event({ id: 'all-day', date: '2026-09-13', endDate: '2026-09-14', allDay: true }),
    ]);

    expect(layout.summaries.get('2026-09-13')?.count).toBe(2);
    expect(layout.summaries.get('2026-09-14')?.count).toBe(1);
    expect(layout.segmentsByStart.get('2026-09-14')).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ id: 'all-day' }),
        continuesBefore: true,
      }),
    ]);
  });

  it('ignores invalid starts and treats invalid or reversed ends as single-day events', () => {
    const layout = buildCalendarMonthLayout(days(), [
      event({ id: 'invalid-start', date: 'invalid' }),
      event({ id: 'invalid-end', endDate: 'invalid' }),
      event({ id: 'reversed', endDate: '2026-09-08' }),
      event({ id: 'outside', date: '2026-10-01' }),
    ]);

    expect(layout.summaries.get('2026-09-09')?.count).toBe(2);
    expect(layout.summaries.get('2026-09-10')?.count).toBe(0);
    expect([...layout.segmentsByStart.values()].flat()).toHaveLength(2);
  });

  it('clips both grid edges without changing the supplied events or dates', () => {
    const grid = Object.freeze(days());
    const item = Object.freeze(event({ date: '2026-09-01', endDate: '2026-09-30', allDay: true }));
    const events = Object.freeze([item]);
    const timestamps = grid.map((day) => day.getTime());
    const layout = buildCalendarMonthLayout(grid, events);

    expect(layout.segmentsByStart.get('2026-09-07')).toEqual([
      expect.objectContaining({
        event: item,
        days: 7,
        continuesBefore: true,
        continuesAfter: true,
      }),
    ]);
    expect(layout.segmentsByStart.get('2026-09-14')).toEqual([
      expect.objectContaining({
        event: item,
        days: 7,
        continuesBefore: true,
        continuesAfter: true,
      }),
    ]);
    expect(grid.map((day) => day.getTime())).toEqual(timestamps);
    expect(item.endDate).toBe('2026-09-30');
  });

  it('keeps empty summaries for an incomplete week and returns empty maps for an empty grid', () => {
    const partial = buildCalendarMonthLayout(days(3), [event()]);

    expect(partial.summaries.size).toBe(3);
    expect(partial.summaries.get('2026-09-09')).toEqual({
      count: 0,
      dots: [],
      overflow: 0,
      sourceLabels: [],
    });
    expect(partial.segmentsByStart.size).toBe(0);
    const empty = buildCalendarMonthLayout([], [event()]);
    expect(empty.summaries.size).toBe(0);
    expect(empty.segmentsByStart.size).toBe(0);
  });
});
