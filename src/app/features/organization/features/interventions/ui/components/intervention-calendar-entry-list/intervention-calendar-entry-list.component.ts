import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  LOCALE_ID,
  type InputSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { HlmItemImports } from '@shared/ui/item';
import { InterventionTag } from '../intervention-tag';

/**
 * Class InterventionCalendarEntryList
 * @class InterventionCalendarEntryList
 *
 * @description
 * The row rendering shared by the interventions calendar's selected-day
 * panel (desktop) and its agenda (mobile, grouped by day) —
 * `organization/features/calendar`'s own `CalendarEntryList` for one feed
 * source, kept feature-local rather than reused across the boundary: this
 * row renders `FG-{number} {name}` plus the status tag registry
 * (`app-intervention-tag`), a shape the domain-agnostic `shared/calendar`
 * package must never import (`ARCHITECTURE.md` §2.7). Every row is a real,
 * keyboard-reachable link to the intervention's workspace. Purely
 * presentational: it takes the interventions and the organization to link
 * into, and injects no store or service (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-intervention-calendar-entry-list
 *   [items]="dayItems()"
 *   [organizationId]="organizationId()"
 * />
 * ```
 */
@Component({
  selector: 'app-intervention-calendar-entry-list',
  imports: [RouterLink, InterventionTag, ...HlmItemImports],
  templateUrl: './intervention-calendar-entry-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCalendarEntryList {
  //#region Inputs
  /**
   * Property items
   * @readonly
   *
   * @description
   * The interventions to render, in the order given — the caller sorts.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly items: InputSignal<readonly InterventionOutput[]> =
    input.required<readonly InterventionOutput[]>();

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The organization a row's link routes into.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property compact
   * @readonly
   *
   * @description
   * Stacks the status under the title inside a narrow contextual panel.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compact: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Properties
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Provides the active locale used to format calendar dates and times.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method numberLabelOf
   * @method numberLabelOf
   *
   * @description
   * The intervention's per-organization number, rendered `FG-{number}`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {string} The `FG-` label.
   */
  protected numberLabelOf(intervention: InterventionOutput): string {
    return `FG-${intervention.number}`;
  }

  /**
   * Method anchorLabelOf
   * @method anchorLabelOf
   *
   * @description
   * Names which end of the schedule window placed the row here — "Starts {date}" for
   * `plannedStartAt`, "Due {date}" when only `dueAt` is set — the same anchor the calendar places
   * the entry by. Both fields are date-only (UTC midnight), so this never prints a time of day:
   * doing so would show "02:00" in most timezones for a value that was never meant to carry one.
   *
   * @access protected
   * @since 6.4.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {string} The localized anchor label, or `''` when the intervention carries neither
   *   date.
   */
  protected anchorLabelOf(intervention: InterventionOutput): string {
    if (intervention.plannedStartAt) {
      return $localize`:@@intervention.calendar.entryStarts:Starts ${this.dateOnlyLabelOf(intervention.plannedStartAt)}:date:`;
    }
    if (intervention.dueAt) {
      return $localize`:@@intervention.calendar.entryDue:Due ${this.dateOnlyLabelOf(intervention.dueAt)}:date:`;
    }

    return '';
  }

  /**
   * Method dateOnlyLabelOf
   * @method dateOnlyLabelOf
   *
   * @description
   * Formats a date-only anchor (a `YYYY-MM-DD` string or a UTC-midnight instant) from its own
   * written calendar day, never through a timezone conversion that could shift it.
   *
   * @access private
   * @since 6.4.0
   *
   * @param {string} anchor - The date-only value.
   *
   * @returns {string} The localized day, or `''` when it does not parse.
   */
  private dateOnlyLabelOf(anchor: string): string {
    const match: RegExpMatchArray | null = /^(\d{4})-(\d{2})-(\d{2})/.exec(anchor);
    if (!match) return '';

    const [, year, month, day] = match as unknown as [string, string, string, string];
    const local: Date = new Date(Number(year), Number(month) - 1, Number(day));

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium' }).format(local);
  }

  /**
   * Method detailLinkOf
   * @method detailLinkOf
   *
   * @description
   * The intervention's workspace route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {readonly string[]} The router commands.
   */
  protected detailLinkOf(intervention: InterventionOutput): readonly string[] {
    return ['/organizations', this.organizationId(), 'interventions', intervention.id];
  }
  //#endregion
}
