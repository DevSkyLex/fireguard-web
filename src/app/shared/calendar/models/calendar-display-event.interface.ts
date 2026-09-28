/**
 * Interface CalendarDisplayEvent
 * @interface CalendarDisplayEvent
 *
 * @description
 * One event on the month grid, as the generic shape the shared calendar
 * renders: a stable id, its start and optional end, a short label and the
 * `hlm-badge` variant carrying its tone. Deliberately domain-free — a feature
 * maps its own records onto this before handing them over
 * (ARCHITECTURE.md §2.7: the calendar is a shared concept precisely because
 * its inputs stay generic).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CalendarDisplayEvent {
  //#region Properties
  /** Stable identity, used for tracking only — the calendar emits days, not events. */
  readonly id: string;

  /** ISO date (`yyyy-MM-dd` or a full ISO string) at which the event begins. */
  readonly date: string;

  /** Optional ISO end; a timed event ending at midnight excludes that final day. */
  readonly endDate?: string | null;

  /** All-day ends are inclusive, including an end at local midnight. */
  readonly allDay?: boolean;

  /** Short label shown inside the chip, truncated by the cell. */
  readonly label: string;

  /** The `hlm-badge` variant carrying the chip's tone. */
  readonly tone: 'default' | 'secondary' | 'destructive' | 'outline';

  /**
   * Optional `ng-icon` name shown, `aria-hidden`, before the chip's label —
   * tone alone does not distinguish an event's kind once several sources
   * share one tone. The host must register the icon through `provideIcons`
   * somewhere in its own injector chain; the calendar renders whatever name
   * it is given without importing an icon set of its own.
   */
  readonly icon?: string;

  /**
   * Optional human name of the event's source (e.g. "Maintenance"), read by
   * assistive technology through the day cell's accessible summary — the
   * chip itself stays `aria-hidden` decoration, so this is the only path a
   * screen reader has to which kinds of event a day carries.
   */
  readonly sourceLabel?: string;

  /**
   * Whether the chip may be pointer-dragged onto another day, reported back
   * through `eventDropped`. Off by default; the hosting feature sets it only
   * on events it can actually reschedule, and must keep a keyboard path to
   * the same reschedule (see the `Calendar` class doc's a11y contract).
   */
  readonly draggable?: boolean;
  //#endregion
}
