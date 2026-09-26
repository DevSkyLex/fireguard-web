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
   * Whether the chip may be pointer-dragged onto another day, reported back
   * through `eventDropped`. Off by default; the hosting feature sets it only
   * on events it can actually reschedule, and must keep a keyboard path to
   * the same reschedule (see the `Calendar` class doc's a11y contract).
   */
  readonly draggable?: boolean;
  //#endregion
}
