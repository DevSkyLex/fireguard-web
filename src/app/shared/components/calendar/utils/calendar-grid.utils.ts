import type {
  CalendarAgendaDay,
  CalendarCategoryGroup,
  CalendarDay,
  CalendarEvent,
  CalendarTimedEvent,
  CalendarWeekDay,
} from '../models';
import {
  addDays,
  dayKey,
  isSameDay,
  isSameMonth,
  minutesSinceMidnight,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './calendar-date.utils';
import { CALENDAR_DEFAULT_EVENT_MINUTES, CALENDAR_MONTH_GRID_DAYS } from './calendar.constants';

/** Internal day bucket used while grouping events. */
interface DayBucket {
  readonly date: Date;
  readonly events: CalendarEvent[];
}

/** Internal time span (minutes since midnight) of a timed event. */
interface EventSpan {
  readonly event: CalendarEvent;
  readonly startMin: number;
  readonly endMin: number;
}

/** Clamps a value into the inclusive `[min, max]` range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Function filterEventsByCategories
 *
 * @description
 * Hides events that belong to any switched-off category. Filtering is
 * conjunctive across groups: a single inactive membership removes the event.
 *
 * @param {readonly CalendarEvent[]} events - Events to filter.
 * @param {readonly CalendarCategoryGroup[]} groups - Active/inactive categories.
 * @returns {readonly CalendarEvent[]} The visible events.
 *
 * @since 1.0.0
 */
export function filterEventsByCategories(
  events: readonly CalendarEvent[],
  groups: readonly CalendarCategoryGroup[],
): readonly CalendarEvent[] {
  const inactive: Set<string> = new Set<string>();
  for (const group of groups) {
    for (const category of group.categories) {
      if (!category.active) inactive.add(category.id);
    }
  }

  if (inactive.size === 0) return events;

  return events.filter(
    (event: CalendarEvent): boolean =>
      !(event.categoryIds ?? []).some((id: string): boolean => inactive.has(id)),
  );
}

/**
 * Orders events the way an agenda reads them: all-day entries first, then timed
 * entries ascending by start instant.
 */
function compareAgendaEvents(a: CalendarEvent, b: CalendarEvent): number {
  const aAllDay: boolean = a.allDay === true;
  const bAllDay: boolean = b.allDay === true;
  if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
  return a.start.getTime() - b.start.getTime();
}

/** Buckets events by the local day of their start. */
function eventsByDayKey(events: readonly CalendarEvent[]): Map<string, DayBucket> {
  const byKey: Map<string, DayBucket> = new Map<string, DayBucket>();
  for (const event of events) {
    const day: Date = startOfDay(event.start);
    const key: string = dayKey(day);
    const bucket: DayBucket | undefined = byKey.get(key);
    if (bucket) {
      bucket.events.push(event);
    } else {
      byKey.set(key, { date: day, events: [event] });
    }
  }
  return byKey;
}

/**
 * Function buildMonthDays
 *
 * @description
 * Builds the fixed 6×7 month grid for `focused`, placing each event on the cell
 * matching its start day and flagging out-of-month and today cells.
 *
 * @param {Date} focused - Any date within the displayed month.
 * @param {readonly CalendarEvent[]} events - Events to plot.
 * @param {0 | 1} weekStartsOn - 0 = Sunday, 1 = Monday.
 * @param {Date} today - Current day, used to flag the "today" cell.
 * @returns {readonly CalendarDay[]} 42 ordered day cells.
 *
 * @since 1.0.0
 */
export function buildMonthDays(
  focused: Date,
  events: readonly CalendarEvent[],
  weekStartsOn: 0 | 1,
  today: Date,
): readonly CalendarDay[] {
  const first: Date = startOfMonth(focused);
  const gridStart: Date = startOfWeek(first, weekStartsOn);
  const byKey: Map<string, DayBucket> = eventsByDayKey(events);

  const days: CalendarDay[] = [];
  for (let index = 0; index < CALENDAR_MONTH_GRID_DAYS; index++) {
    const date: Date = addDays(gridStart, index);
    days.push({
      date,
      inMonth: isSameMonth(date, first),
      isToday: isSameDay(date, today),
      events: byKey.get(dayKey(date))?.events ?? [],
    });
  }

  return days;
}

/**
 * Function buildAgendaDays
 *
 * @description
 * Builds the agenda groups for the displayed month: dated day groups in
 * ascending order, each holding the events anchored on that day sorted the way
 * an agenda reads (all-day first, then ascending by start instant).
 *
 * @param {Date} focused - Any date within the displayed month.
 * @param {readonly CalendarEvent[]} events - Events to group.
 * @returns {readonly CalendarAgendaDay[]} Ascending day groups.
 *
 * @since 1.0.0
 */
export function buildAgendaDays(
  focused: Date,
  events: readonly CalendarEvent[],
): readonly CalendarAgendaDay[] {
  const monthEvents: readonly CalendarEvent[] = events.filter((event: CalendarEvent): boolean =>
    isSameMonth(event.start, focused),
  );

  return [...eventsByDayKey(monthEvents).values()]
    .toSorted((a: DayBucket, b: DayBucket): number => a.date.getTime() - b.date.getTime())
    .map(
      (bucket: DayBucket): CalendarAgendaDay => ({
        date: bucket.date,
        events: bucket.events.toSorted(compareAgendaEvents),
      }),
    );
}

/** Resolves the start/end minutes of a timed event within its start day. */
function toSpan(event: CalendarEvent): EventSpan {
  const startMin: number = minutesSinceMidnight(event.start);
  let endMin: number;
  if (event.end) {
    endMin = isSameDay(event.end, event.start) ? minutesSinceMidnight(event.end) : 24 * 60;
  } else {
    endMin = startMin + CALENDAR_DEFAULT_EVENT_MINUTES;
  }
  if (endMin <= startMin) endMin = startMin + CALENDAR_DEFAULT_EVENT_MINUTES;
  return { event, startMin, endMin };
}

/** Packs overlapping timed events into lanes and positions them in the window. */
function packDay(
  events: readonly CalendarEvent[],
  dayStartHour: number,
  dayEndHour: number,
): readonly CalendarTimedEvent[] {
  const windowStart: number = dayStartHour * 60;
  const windowEnd: number = dayEndHour * 60;
  const windowSpan: number = Math.max(windowEnd - windowStart, 1);

  const spans: readonly EventSpan[] = events
    .map(toSpan)
    .toSorted(
      (a: EventSpan, b: EventSpan): number => a.startMin - b.startMin || b.endMin - a.endMin,
    );

  const result: CalendarTimedEvent[] = [];
  let cluster: { span: EventSpan; lane: number }[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = -1;

  const flush = (): void => {
    const laneCount: number = Math.max(columnEnds.length, 1);
    for (const { span, lane } of cluster) {
      const top: number = clamp(span.startMin, windowStart, windowEnd);
      const bottom: number = clamp(span.endMin, windowStart, windowEnd);
      result.push({
        event: span.event,
        topPct: ((top - windowStart) / windowSpan) * 100,
        heightPct: Math.max(((bottom - top) / windowSpan) * 100, 2),
        lane,
        laneCount,
      });
    }
    cluster = [];
    columnEnds = [];
    clusterEnd = -1;
  };

  for (const span of spans) {
    if (cluster.length > 0 && span.startMin >= clusterEnd) flush();

    let lane: number = columnEnds.findIndex((end: number): boolean => end <= span.startMin);
    if (lane === -1) {
      lane = columnEnds.length;
      columnEnds.push(span.endMin);
    } else {
      columnEnds[lane] = span.endMin;
    }

    cluster.push({ span, lane });
    clusterEnd = Math.max(clusterEnd, span.endMin);
  }
  flush();

  return result;
}

/**
 * Function buildWeekDays
 *
 * @description
 * Builds the seven day columns of the week containing `focused`, splitting each
 * day's events into an all-day row and positioned, lane-packed timed events.
 *
 * @param {Date} focused - Any date within the displayed week.
 * @param {readonly CalendarEvent[]} events - Events to place.
 * @param {0 | 1} weekStartsOn - 0 = Sunday, 1 = Monday.
 * @param {Date} today - Current day, used to flag the "today" column.
 * @param {number} dayStartHour - First hour of the visible window.
 * @param {number} dayEndHour - Last hour of the visible window.
 * @returns {readonly CalendarWeekDay[]} Seven ordered day columns.
 *
 * @since 1.0.0
 */
export function buildWeekDays(
  focused: Date,
  events: readonly CalendarEvent[],
  weekStartsOn: 0 | 1,
  today: Date,
  dayStartHour: number,
  dayEndHour: number,
): readonly CalendarWeekDay[] {
  const weekStart: Date = startOfWeek(focused, weekStartsOn);

  const days: CalendarWeekDay[] = [];
  for (let index = 0; index < 7; index++) {
    const date: Date = addDays(weekStart, index);
    const dayEvents: readonly CalendarEvent[] = events.filter((event: CalendarEvent): boolean =>
      isSameDay(event.start, date),
    );
    days.push({
      date,
      isToday: isSameDay(date, today),
      allDayEvents: dayEvents.filter((event: CalendarEvent): boolean => event.allDay === true),
      timedEvents: packDay(
        dayEvents.filter((event: CalendarEvent): boolean => event.allDay !== true),
        dayStartHour,
        dayEndHour,
      ),
    });
  }

  return days;
}
