import type { CalendarDisplayEvent } from '../../../../../models/calendar-display-event.interface';
import type { CalendarDaySummary } from '../../models/calendar-day-summary.interface';
import type { CalendarEventSpan } from '../../models/calendar-event-span.interface';
import type { CalendarMonthLayout } from '../../models/calendar-month-layout.interface';
import type { CalendarWeekSegment } from '../../models/calendar-week-segment.interface';
import type { CalendarWeekSpan } from '../../models/calendar-week-span.interface';
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
  const spans: readonly CalendarEventSpan[] = events
    .map(resolveCalendarEventSpan)
    .filter((span): span is CalendarEventSpan => span !== null);
  const summaries = new Map<string, CalendarDaySummary>(
    days.map((day) => [toIsoDay(day), summarizeCalendarDay(toIsoDay(day), [], [], [])]),
  );
  const segmentsByStart = new Map<string, CalendarWeekSegment[]>();
  const previousLane = new Map<string, number>();

  for (let weekIndex = 0; weekIndex < days.length; weekIndex += 7) {
    const weekDays = days.slice(weekIndex, weekIndex + 7).map(toIsoDay);
    const first = weekDays[0];
    const last = weekDays[6];
    if (first === undefined || last === undefined) continue;

    const candidates = spans
      .filter(({ startDay, endDay }) => startDay <= last && endDay >= first)
      .toSorted(
        (a, b) =>
          a.startDay.localeCompare(b.startDay) ||
          b.endDay.localeCompare(a.endDay) ||
          a.event.id.localeCompare(b.event.id),
      );

    const segments = placeCalendarWeekSpans(weekDays, candidates, previousLane);
    for (const segment of segments) {
      previousLane.set(segment.event.id, segment.lane);
      const bucket = segmentsByStart.get(segment.startDay) ?? [];
      bucket.push(segment);
      segmentsByStart.set(segment.startDay, bucket);
    }
    for (const day of weekDays) {
      summaries.set(day, summarizeCalendarDay(day, candidates, segments, weekDays));
    }
  }
  return { summaries, segmentsByStart };
}

/**
 * Function resolveCalendarEventSpan
 * @description Normalizes valid event dates while keeping all-day ends inclusive and timed midnight ends exclusive.
 * @access private
 * @since 1.0.0
 * @param {CalendarDisplayEvent} event - The owner's event to normalize without mutation.
 * @returns {CalendarEventSpan | null} Its included local days, or null for an invalid start.
 */
function resolveCalendarEventSpan(event: CalendarDisplayEvent): CalendarEventSpan | null {
  const start = parseCalendarDate(event.date);
  if (Number.isNaN(start.getTime())) return null;
  const startDay = toIsoDay(start);
  const end = event.endDate ? parseCalendarDate(event.endDate) : start;
  if (Number.isNaN(end.getTime()) || end <= start) {
    return { event, startDay, endDay: startDay };
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
  return { event, startDay, endDay: toIsoDay(effectiveEnd) };
}

/**
 * Function clipCalendarWeekSpan
 * @description Clips an event to a complete displayed week and retains its continuation affordances.
 * @access private
 * @since 1.0.0
 * @param {CalendarEventSpan} span - The normalized event range.
 * @param {readonly string[]} weekDays - The displayed week in local ISO-day order.
 * @returns {CalendarWeekSpan | null} Its visible columns, or null when the range cannot be placed.
 */
function clipCalendarWeekSpan(
  span: CalendarEventSpan,
  weekDays: readonly string[],
): CalendarWeekSpan | null {
  const first = weekDays[0];
  const last = weekDays[6];
  if (first === undefined || last === undefined) return null;
  const startColumn = span.startDay < first ? 0 : weekDays.indexOf(span.startDay);
  const endColumn = span.endDay > last ? 6 : weekDays.indexOf(span.endDay);
  if (startColumn < 0 || endColumn < startColumn) return null;
  const startDay = weekDays[startColumn];
  const endDay = weekDays[endColumn];
  if (startDay === undefined || endDay === undefined) return null;
  return {
    event: span.event,
    startDay,
    startColumn,
    days: endColumn - startColumn + 1,
    continuesBefore: span.startDay < startDay,
    continuesAfter: span.endDay > endDay,
  };
}

/**
 * Function placeCalendarWeekSpans
 * @description Assigns two non-overlapping lanes, preferring each event's previous-week lane without mutating inputs.
 * @access private
 * @since 1.0.0
 * @param {readonly string[]} weekDays - The complete displayed week.
 * @param {readonly CalendarEventSpan[]} candidates - Its events in stable placement order.
 * @param {ReadonlyMap<string, number>} previousLane - Lane choices from preceding weeks.
 * @returns {readonly CalendarWeekSegment[]} The visible event segments in placement order.
 */
function placeCalendarWeekSpans(
  weekDays: readonly string[],
  candidates: readonly CalendarEventSpan[],
  previousLane: ReadonlyMap<string, number>,
): readonly CalendarWeekSegment[] {
  const occupied = Array.from({ length: 2 }, () => Array.from({ length: 7 }, () => false));
  const remembered = new Map(previousLane);
  const segments: CalendarWeekSegment[] = [];
  for (const candidate of candidates) {
    const span = clipCalendarWeekSpan(candidate, weekDays);
    if (span === null) continue;
    const preferred = remembered.get(span.event.id);
    const lanes = preferred === undefined ? [0, 1] : [preferred, 1 - preferred];
    const lane = lanes.find((choice) =>
      occupied[choice]
        ?.slice(span.startColumn, span.startColumn + span.days)
        .every((slot) => !slot),
    );
    if (lane === undefined) continue;
    occupied[lane]?.fill(true, span.startColumn, span.startColumn + span.days);
    remembered.set(span.event.id, lane);
    segments.push({
      event: span.event,
      startDay: span.startDay,
      days: span.days,
      lane,
      continuesBefore: span.continuesBefore,
      continuesAfter: span.continuesAfter,
    });
  }
  return segments;
}

/**
 * Function summarizeCalendarDay
 * @description Counts every covered event, including hidden lanes, with stable distinct source labels.
 * @access private
 * @since 1.0.0
 * @param {string} day - The local ISO day to summarize.
 * @param {readonly CalendarEventSpan[]} candidates - Its week's normalized events.
 * @param {readonly CalendarWeekSegment[]} segments - Its week's visible lane segments.
 * @param {readonly string[]} weekDays - The displayed week used to resolve segment ends.
 * @returns {CalendarDaySummary} The total, capped dots, hidden count and source labels.
 */
function summarizeCalendarDay(
  day: string,
  candidates: readonly CalendarEventSpan[],
  segments: readonly CalendarWeekSegment[],
  weekDays: readonly string[],
): CalendarDaySummary {
  const active = candidates.filter((span) => span.startDay <= day && span.endDay >= day);
  const shown = segments.filter((segment) => {
    const endDay = weekDays[weekDays.indexOf(segment.startDay) + segment.days - 1];
    return segment.startDay <= day && endDay !== undefined && endDay >= day;
  }).length;
  const sourceLabels = active
    .map((span) => span.event.sourceLabel)
    .filter((label): label is string => typeof label === 'string' && label.length > 0);
  return {
    count: active.length,
    dots: Array.from({ length: Math.min(active.length, 3) }, (unused, index) => index),
    overflow: Math.max(0, active.length - shown),
    sourceLabels: [...new Set(sourceLabels)],
  };
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
