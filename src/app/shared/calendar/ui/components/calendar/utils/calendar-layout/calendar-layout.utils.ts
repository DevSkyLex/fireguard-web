import type { CalendarDisplayEvent } from '../../../../../models/calendar-display-event.interface';
import type { CalendarDaySummary } from '../../models/calendar-day-summary.interface';
import type { CalendarMonthLayout } from '../../models/calendar-month-layout.interface';
import type { CalendarWeekSegment } from '../../models/calendar-week-segment.interface';
import { toIsoDay } from '../calendar-month/calendar-month.utils';

/**
 * Function buildCalendarMonthLayout
 * @description Places overlapping events in two stable lanes per week and counts every day they cover.
 * @access public
 * @since 1.0.0
 * @param {readonly Date[]} days - The grid's complete, consecutive weeks.
 * @param {readonly CalendarDisplayEvent[]} events - Generic events with optional ends.
 * @returns {CalendarMonthLayout} Accessible counts and the visible week segments.
 */
export function buildCalendarMonthLayout(
  days: readonly Date[],
  events: readonly CalendarDisplayEvent[],
): CalendarMonthLayout {
  const spans = events.flatMap((event) => {
    const start = parseCalendarDate(event.date);
    if (Number.isNaN(start.getTime())) return [];

    const end = event.endDate ? parseCalendarDate(event.endDate) : start;
    if (Number.isNaN(end.getTime()) || end <= start) {
      return [{ event, startDay: toIsoDay(start), endDay: toIsoDay(start) }];
    }

    const effectiveEnd = new Date(end);
    if (
      event.allDay !== true &&
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getSeconds() === 0 &&
      end.getMilliseconds() === 0
    ) {
      effectiveEnd.setMilliseconds(-1);
    }

    return [{ event, startDay: toIsoDay(start), endDay: toIsoDay(effectiveEnd) }];
  });

  const counts = new Map<string, number>();
  const shown = new Map<string, number>();
  const segmentsByStart = new Map<string, CalendarWeekSegment[]>();
  const previousLane = new Map<string, number>();

  for (let weekIndex = 0; weekIndex < days.length; weekIndex += 7) {
    const weekDays = days.slice(weekIndex, weekIndex + 7).map(toIsoDay);
    const first = weekDays[0];
    const last = weekDays[6];
    if (first === undefined || last === undefined) continue;

    const occupied = Array.from({ length: 2 }, () => Array<boolean>(7).fill(false));
    const candidates = spans
      .filter(({ startDay, endDay }) => startDay <= last && endDay >= first)
      .toSorted(
        (a, b) =>
          a.startDay.localeCompare(b.startDay) ||
          b.endDay.localeCompare(a.endDay) ||
          a.event.id.localeCompare(b.event.id),
      );

    for (const span of candidates) {
      const startColumn = span.startDay < first ? 0 : weekDays.indexOf(span.startDay);
      const endColumn = span.endDay > last ? 6 : weekDays.indexOf(span.endDay);
      if (startColumn < 0 || endColumn < startColumn) continue;
      const startDay = weekDays[startColumn];
      const endDay = weekDays[endColumn];
      if (startDay === undefined || endDay === undefined) continue;

      for (let column = startColumn; column <= endColumn; column += 1) {
        const day = weekDays[column];
        if (day !== undefined) counts.set(day, (counts.get(day) ?? 0) + 1);
      }

      const preferred = previousLane.get(span.event.id);
      const lanes = preferred === undefined ? [0, 1] : [preferred, 1 - preferred];
      const lane = lanes.find((candidate) =>
        occupied[candidate]?.slice(startColumn, endColumn + 1).every((slot) => !slot),
      );
      if (lane === undefined) continue;
      const laneSlots = occupied[lane];
      if (laneSlots === undefined) continue;

      for (let column = startColumn; column <= endColumn; column += 1) {
        laneSlots[column] = true;
        const day = weekDays[column];
        if (day !== undefined) shown.set(day, (shown.get(day) ?? 0) + 1);
      }

      previousLane.set(span.event.id, lane);
      const segment: CalendarWeekSegment = {
        event: span.event,
        startDay,
        days: endColumn - startColumn + 1,
        lane,
        continuesBefore: span.startDay < startDay,
        continuesAfter: span.endDay > endDay,
      };
      const bucket = segmentsByStart.get(startDay) ?? [];
      bucket.push(segment);
      segmentsByStart.set(startDay, bucket);
    }
  }

  const summaries = new Map<string, CalendarDaySummary>();
  for (const day of days) {
    const iso = toIsoDay(day);
    const count = counts.get(iso) ?? 0;
    summaries.set(iso, {
      count,
      dots: Array.from({ length: Math.min(count, 3) }, (unused, index) => index),
      overflow: Math.max(0, count - (shown.get(iso) ?? 0)),
    });
  }

  return { summaries, segmentsByStart };
}

/**
 * Function parseCalendarDate
 * @description Reads a date-only value at local midnight so it stays on its wall-calendar day.
 * @access private
 * @since 1.0.0
 * @param {string} value - Date-only or full ISO value.
 * @returns {Date} The corresponding local or offset-aware date.
 */
function parseCalendarDate(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value);
}
