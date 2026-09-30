import { NgTemplateOutlet } from '@angular/common';
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
import {
  lucideCalendar,
  lucideCalendarClock,
  lucideClipboardCheck,
  lucideMapPin,
  lucidePencil,
  lucideTrash2,
  lucideWrench,
} from '@ng-icons/lucide';
import { SOURCE_ICON, SOURCE_TONE } from '@features/organization/features/calendar/constants';
import type {
  CalendarFeedItemOutput,
  CalendarSourceKey,
} from '@features/organization/features/calendar/models';
import { calendarSourceLabelOf } from '@features/organization/features/calendar/utils';
import { toIsoDay, type CalendarDisplayEvent } from '@shared/calendar';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTooltipImports } from '@shared/ui/tooltip';

/**
 * Class CalendarEntryList
 * @class CalendarEntryList
 *
 * @description
 * The row rendering shared by the calendar's day panel (desktop sidebar) and
 * its agenda (mobile, grouped by day): title, time-of-day (a range through
 * {@link endsAt}, in the organization's own timezone), an optional
 * description and facility line, a source badge carrying a leading glyph
 * (tone alone no longer distinguishes a source, `DESIGN.md`), and — for an
 * intervention or inspection entry — a link to its record. A
 * `calendar_event`-source row additionally offers Edit/Delete icon buttons
 * when {@link canWrite} is set — the other sources are projections of
 * records this feature does not own and never show them (`FEATURE.md`
 * "Writable events" invariant: this component, not the page, is where that
 * gate is enforced, since it is the single place a row renders). Purely
 * presentational: it takes the entries and the organization to link into,
 * emits the two write intents, and injects no store or service
 * (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
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
 */
@Component({
  selector: 'app-calendar-entry-list',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    HlmBadge,
    HlmButton,
    ...HlmItemImports,
    ...HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      lucideCalendar,
      lucideCalendarClock,
      lucideClipboardCheck,
      lucideMapPin,
      lucidePencil,
      lucideTrash2,
      lucideWrench,
    }),
  ],
  templateUrl: './calendar-entry-list.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarEntryList {
  //#region Inputs
  /**
   * Property compact
   * @readonly
   *
   * @description
   * Stacks entry details and source badge in narrow week columns.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly compact: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property items
   * @readonly
   *
   * @description
   * The entries to render, in the order given — the caller sorts.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly CalendarFeedItemOutput[]>}
   */
  public readonly items: InputSignal<readonly CalendarFeedItemOutput[]> =
    input.required<readonly CalendarFeedItemOutput[]>();

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The organization an intervention entry's link routes into.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the member holds `organization.events.write` — gates the Edit/Delete affordances on a
   * `calendar_event` row.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property day
   * @readonly
   *
   * @description
   * The `yyyy-MM-dd` day this list renders entries for — each call site
   * scopes {@link items} to one day already. Lets {@link timeLabelOf} tell a
   * multi-day item's start day from a continuation day, so the row reads
   * "Until {date}" instead of repeating a start time that already passed.
   * `null` keeps every item on its start-time label, for a caller that has
   * no single day to report (there is none today, kept for a future
   * cross-day list).
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly day: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's timezone, read by {@link timeLabelOf} so a time-of-day never reads in
   * the wrong offset. The default keeps the component renderable with no context wired.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);

  /**
   * Property facilityLabelOf
   * @readonly
   *
   * @description
   * Resolves a bare facility id to its name, from the page's own facility catalog. Defaults to
   * always resolving `null`, which drops the facility line.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {InputSignal<(facilityId: string) => string | null>}
   */
  public readonly facilityLabelOf: InputSignal<(facilityId: string) => string | null> = input<
    (facilityId: string) => string | null
  >(() => null);
  //#endregion

  //#region Outputs
  /**
   * Property editRequested
   * @readonly
   *
   * @description
   * A `calendar_event` row's Edit action was activated.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<CalendarFeedItemOutput>}
   */
  public readonly editRequested: OutputEmitterRef<CalendarFeedItemOutput> =
    output<CalendarFeedItemOutput>();

  /**
   * Property deleteRequested
   * @readonly
   *
   * @description
   * A `calendar_event` row's Delete action was activated.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {OutputEmitterRef<CalendarFeedItemOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<CalendarFeedItemOutput> =
    output<CalendarFeedItemOutput>();
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
   * Method sourceLabelOf
   * @method sourceLabelOf
   *
   * @description
   * Names a feed source for the row's badge, through the resolver shared with the page's "Partial
   * results" banner.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {string} A short localized source name.
   */
  protected sourceLabelOf(item: CalendarFeedItemOutput): string {
    return calendarSourceLabelOf(item.sourceKey);
  }

  /**
   * Method toneOf
   * @method toneOf
   *
   * @description
   * The badge tone of a feed entry, from its source.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {CalendarDisplayEvent['tone']} The `hlm-badge` variant.
   */
  protected toneOf(item: CalendarFeedItemOutput): CalendarDisplayEvent['tone'] {
    const key: CalendarSourceKey = item.sourceKey;

    return SOURCE_TONE[key] ?? 'outline';
  }

  /**
   * Method sourceIconOf
   * @method sourceIconOf
   *
   * @description
   * The `aria-hidden` glyph leading a feed entry's badge — every source's tone is now neutral, so
   * this is what actually distinguishes one from another.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {string} The `ng-icon` name.
   */
  protected sourceIconOf(item: CalendarFeedItemOutput): string {
    return SOURCE_ICON[item.sourceKey];
  }

  /**
   * Method timeLabelOf
   * @method timeLabelOf
   *
   * @description
   * The entry's time-of-day, the localized all-day label, or — on a
   * continuation day of a multi-day item, per {@link day} — "Until {date}"
   * rather than a start time that already passed on an earlier day. A timed
   * range renders through `Intl.DateTimeFormat.formatRange`, in the
   * organization's own timezone so a time-of-day never reads in the wrong
   * offset.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {string} A short time or range label.
   */
  protected timeLabelOf(item: CalendarFeedItemOutput): string {
    if (item.allDay) return $localize`:@@calendar.allDay:All day`;

    const timeZone: string = this.regionalFormatting().timezone;
    const start: Date = new Date(item.startsAt);
    const day: string | null = this.day();

    if (day !== null && day !== toIsoDay(start)) {
      const end: Date = item.endsAt ? new Date(item.endsAt) : start;
      const until: string = this.resolveDateTimeFormat(
        { weekday: 'short', day: 'numeric' },
        timeZone,
      ).format(end);

      return $localize`:@@calendar.entry.until:Until ${until}:date:`;
    }

    if (item.endsAt) {
      const end: Date = new Date(item.endsAt);
      if (!Number.isNaN(end.getTime())) {
        return this.resolveDateTimeFormat({ timeStyle: 'short' }, timeZone).formatRange(start, end);
      }
    }

    return this.resolveDateTimeFormat({ timeStyle: 'short' }, timeZone).format(start);
  }

  /**
   * Method resolveDateTimeFormat
   * @method resolveDateTimeFormat
   *
   * @description
   * Builds an `Intl.DateTimeFormat` for `timeZone`, falling back to the runtime's own timezone when
   * `timeZone` is not one `Intl` accepts — an organization-configured value the browser rejects
   * must not break the whole entry list, matching `OrgDatePipe`'s own fallback.
   *
   * @access private
   * @since 1.3.0
   *
   * @param {Intl.DateTimeFormatOptions} options - The formatting options, without `timeZone`.
   * @param {string} timeZone - An IANA timezone name, `'UTC'`, or a fixed offset.
   *
   * @returns {Intl.DateTimeFormat} The resolved formatter.
   */
  private resolveDateTimeFormat(
    options: Intl.DateTimeFormatOptions,
    timeZone: string,
  ): Intl.DateTimeFormat {
    try {
      return new Intl.DateTimeFormat(this.locale, { ...options, timeZone });
    } catch {
      return new Intl.DateTimeFormat(this.locale, options);
    }
  }

  /**
   * Method descriptionOf
   * @method descriptionOf
   *
   * @description
   * The entry's free-text description, when set — an inspection's notes or a standalone event's own
   * description.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {string | null} The description, or `null`.
   */
  protected descriptionOf(item: CalendarFeedItemOutput): string | null {
    return item.description ?? null;
  }

  /**
   * Method facilityOf
   * @method facilityOf
   *
   * @description
   * The entry's facility name, resolved through {@link facilityLabelOf}, when the entry carries a
   * facility and it resolves.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {string | null} The facility name, or `null`.
   */
  protected facilityOf(item: CalendarFeedItemOutput): string | null {
    return item.facilityId ? this.facilityLabelOf()(item.facilityId) : null;
  }

  /**
   * Method linkOf
   * @method linkOf
   *
   * @description
   * The record route an entry's row links to — an intervention's workspace
   * or an inspection's detail page — resolved by URL segments only, so this
   * shared component never imports either owning feature. `null` for a
   * source with no stable per-record route yet (`FEATURE.md`).
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {readonly string[] | null} The router commands, or `null`.
   */
  protected linkOf(item: CalendarFeedItemOutput): readonly string[] | null {
    switch (item.sourceKey) {
      case 'intervention':
        return ['/organizations', this.organizationId(), 'interventions', item.targetId];
      case 'inspection':
        return ['/organizations', this.organizationId(), 'inspections', item.targetId];
      default:
        return null;
    }
  }

  /**
   * Method isEditableOf
   * @method isEditableOf
   *
   * @description
   * Whether a row's Edit/Delete affordances should show — a `calendar_event` entry, and only while
   * {@link canWrite} holds.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {CalendarFeedItemOutput} item - The entry in question.
   *
   * @returns {boolean} Whether the row is a writable standalone event.
   */
  protected isEditableOf(item: CalendarFeedItemOutput): boolean {
    return item.sourceKey === 'calendar_event' && this.canWrite();
  }

  /**
   * Method editAriaLabelOf
   * @method editAriaLabelOf
   *
   * @description
   * The edit button's accessible name, naming the event so repeated rows stay distinguishable to
   * assistive tech.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {CalendarFeedItemOutput} item - The row's entry.
   *
   * @returns {string} The localized label.
   */
  protected editAriaLabelOf(item: CalendarFeedItemOutput): string {
    const eventTitle: string = item.title;

    return $localize`:@@calendar.entry.editAria:Edit ${eventTitle}:eventTitle:`;
  }

  /**
   * Method deleteAriaLabelOf
   * @method deleteAriaLabelOf
   *
   * @description
   * The delete button's accessible name, naming the event so repeated rows stay distinguishable to
   * assistive tech.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {CalendarFeedItemOutput} item - The row's entry.
   *
   * @returns {string} The localized label.
   */
  protected deleteAriaLabelOf(item: CalendarFeedItemOutput): string {
    const eventTitle: string = item.title;

    return $localize`:@@calendar.entry.deleteAria:Delete ${eventTitle}:eventTitle:`;
  }
  //#endregion
}
