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
 * Component InterventionCalendarEntryList
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
 * @example
 * ```html
 * <app-intervention-calendar-entry-list
 *   [items]="dayItems()"
 *   [organizationId]="organizationId()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
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
   * @description The interventions to render, in the order given — the caller sorts.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly items: InputSignal<readonly InterventionOutput[]> =
    input.required<readonly InterventionOutput[]>();

  /**
   * Property organizationId
   * @readonly
   * @description The organization a row's link routes into.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  private readonly locale: string = inject(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method numberLabelOf
   * @description The intervention's per-organization number, rendered `FG-{number}`.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput} intervention - The row's intervention.
   * @returns {string} The `FG-` label.
   */
  protected numberLabelOf(intervention: InterventionOutput): string {
    return `FG-${intervention.number}`;
  }

  /**
   * Method timeLabelOf
   * @description The row's schedule anchor (`plannedStartAt`, falling back to `dueAt`) as a localized time-of-day — the same anchor the calendar places the entry by.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput} intervention - The row's intervention.
   * @returns {string} A short time label.
   */
  protected timeLabelOf(intervention: InterventionOutput): string {
    const anchor: string | null = intervention.plannedStartAt ?? intervention.dueAt;
    if (anchor === null) return '';

    return new Intl.DateTimeFormat(this.locale, { timeStyle: 'short' }).format(new Date(anchor));
  }

  /**
   * Method detailLinkOf
   * @description The intervention's workspace route.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput} intervention - The row's intervention.
   * @returns {readonly string[]} The router commands.
   */
  protected detailLinkOf(intervention: InterventionOutput): readonly string[] {
    return ['/organizations', this.organizationId(), 'interventions', intervention.id];
  }
  //#endregion
}
