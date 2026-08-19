import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  LOCALE_ID,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePencil, lucideTrash2 } from '@ng-icons/lucide';
import { SOURCE_TONE } from '@features/organization/features/calendar/constants';
import type {
  CalendarFeedItemOutput,
  CalendarSourceKey,
} from '@features/organization/features/calendar/models';
import type { CalendarDisplayEvent } from '@shared/calendar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';

/**
 * Component CalendarEntryList
 * @class CalendarEntryList
 *
 * @description
 * The row rendering shared by the calendar's day panel (desktop sidebar) and
 * its agenda (mobile, grouped by day): title, time-of-day, source badge, and
 * — for an intervention entry only — a link to its workspace. A
 * `calendar_event`-source row additionally offers Edit/Delete icon buttons
 * when {@link canWrite} is set — the other three sources are projections of
 * records this feature does not own and never show them (`FEATURE.md`
 * "Writable events" invariant: this component, not the page, is where that
 * gate is enforced, since it is the single place a row renders). Purely
 * presentational: it takes the entries and the organization to link into,
 * emits the two write intents, and injects no store or service
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-calendar-entry-list
 *   [items]="dayItems()"
 *   [organizationId]="organizationId()"
 *   [canWrite]="canWriteEvents()"
 *   (editRequested)="openEditDialog($event)"
 *   (deleteRequested)="requestDelete($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-entry-list',
  imports: [RouterLink, NgIcon, HlmBadge, HlmButton, ...HlmItemImports],
  providers: [provideIcons({ lucidePencil, lucideTrash2 })],
  templateUrl: './calendar-entry-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEntryList {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The entries to render, in the order given — the caller sorts.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly CalendarFeedItemOutput[]>}
   */
  public readonly items: InputSignal<readonly CalendarFeedItemOutput[]> =
    input.required<readonly CalendarFeedItemOutput[]>();

  /**
   * Property organizationId
   * @readonly
   * @description The organization an intervention entry's link routes into.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member holds `organization.events.write` — gates the Edit/Delete affordances on a `calendar_event` row.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property editRequested
   * @readonly
   * @description A `calendar_event` row's Edit action was activated.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<CalendarFeedItemOutput>}
   */
  public readonly editRequested: OutputEmitterRef<CalendarFeedItemOutput> =
    output<CalendarFeedItemOutput>();

  /**
   * Property deleteRequested
   * @readonly
   * @description A `calendar_event` row's Delete action was activated.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<CalendarFeedItemOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<CalendarFeedItemOutput> =
    output<CalendarFeedItemOutput>();
  //#endregion

  //#region Properties
  private readonly locale: string = inject(LOCALE_ID);
  //#endregion

  //#region Methods
  /**
   * Method sourceLabelOf
   * @description Names a feed source for the row's badge.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {string} A short localized source name.
   */
  protected sourceLabelOf(item: CalendarFeedItemOutput): string {
    switch (item.sourceKey) {
      case 'calendar_event':
        return $localize`:@@calendar.source.event:Event`;
      case 'inspection':
        return $localize`:@@calendar.source.inspection:Inspection`;
      case 'intervention':
        return $localize`:@@calendar.source.intervention:Intervention`;
      case 'maintenance':
        return $localize`:@@calendar.source.maintenance:Maintenance`;
    }
  }

  /**
   * Method toneOf
   * @description The badge tone of a feed entry, from its source.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {CalendarDisplayEvent['tone']} The `hlm-badge` variant.
   */
  protected toneOf(item: CalendarFeedItemOutput): CalendarDisplayEvent['tone'] {
    const key: CalendarSourceKey = item.sourceKey;

    return SOURCE_TONE[key] ?? 'outline';
  }

  /**
   * Method timeLabelOf
   * @description The entry's time-of-day, or the localized all-day label.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {string} A short time label.
   */
  protected timeLabelOf(item: CalendarFeedItemOutput): string {
    if (item.allDay) return $localize`:@@calendar.allDay:All day`;

    return new Intl.DateTimeFormat(this.locale, { timeStyle: 'short' }).format(
      new Date(item.startsAt),
    );
  }

  /**
   * Method interventionLinkOf
   * @description The intervention workspace route for an intervention entry, null otherwise.
   * @access protected
   * @since 1.0.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {readonly string[] | null} The router commands, or null.
   */
  protected interventionLinkOf(item: CalendarFeedItemOutput): readonly string[] | null {
    return item.sourceKey === 'intervention'
      ? ['/organizations', this.organizationId(), 'interventions', item.targetId]
      : null;
  }

  /**
   * Method isEditableOf
   * @description Whether a row's Edit/Delete affordances should show — a `calendar_event` entry, and only while {@link canWrite} holds.
   * @access protected
   * @since 1.1.0
   * @param {CalendarFeedItemOutput} item - The entry in question.
   * @returns {boolean} Whether the row is a writable standalone event.
   */
  protected isEditableOf(item: CalendarFeedItemOutput): boolean {
    return item.sourceKey === 'calendar_event' && this.canWrite();
  }

  /**
   * Method editAriaLabelOf
   * @description The edit button's accessible name, naming the event so repeated rows stay distinguishable to assistive tech.
   * @access protected
   * @since 1.1.0
   * @param {CalendarFeedItemOutput} item - The row's entry.
   * @returns {string} The localized label.
   */
  protected editAriaLabelOf(item: CalendarFeedItemOutput): string {
    const eventTitle: string = item.title;

    return $localize`:@@calendar.entry.editAria:Edit ${eventTitle}:eventTitle:`;
  }

  /**
   * Method deleteAriaLabelOf
   * @description The delete button's accessible name, naming the event so repeated rows stay distinguishable to assistive tech.
   * @access protected
   * @since 1.1.0
   * @param {CalendarFeedItemOutput} item - The row's entry.
   * @returns {string} The localized label.
   */
  protected deleteAriaLabelOf(item: CalendarFeedItemOutput): string {
    const eventTitle: string = item.title;

    return $localize`:@@calendar.entry.deleteAria:Delete ${eventTitle}:eventTitle:`;
  }
  //#endregion
}
