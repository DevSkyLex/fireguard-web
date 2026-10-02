import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, type ParamMap } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendar,
  lucideCalendar1,
  lucideCalendarClock,
  lucideCalendarDays,
  lucideCalendarRange,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucideClipboardCheck,
  lucidePlus,
  lucideRss,
  lucideTriangleAlert,
  lucideWrench,
} from '@ng-icons/lucide';
import { DateTime } from 'luxon';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { PageTabsService, registerPageTabs } from '@core/page-tabs';
import type { CallState, StoreError } from '@core/request-state';
import { isCallPending } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { SOURCE_ICON, SOURCE_TONE } from '@features/organization/features/calendar/constants';
import type {
  CalendarEventOutput,
  CalendarFeedItemOutput,
  CalendarSourceKey,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@features/organization/features/calendar/models';
import {
  CalendarFeedStore,
  CalendarFacilityOptionsStore,
  type CalendarFeedStoreType,
} from '@features/organization/features/calendar/state';
import {
  calendarSourceLabelOf,
  toApiDateTime,
} from '@features/organization/features/calendar/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { DashboardPanelRegistry } from '@layouts/dashboard-layout';
import {
  Calendar,
  toIsoDay,
  type CalendarDisplayEvent,
  type CalendarEventDrop,
  type CalendarFirstDayOfWeek,
} from '@shared/calendar';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmButtonGroup } from '@shared/ui/button-group';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmMarkerImports } from '@shared/ui/marker';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { CalendarEntryList } from '../../components/calendar-entry-list';
import { CalendarEventDeleteDialog } from '../../dialogs/calendar-event-delete-dialog';
import {
  CalendarEventDialog,
  type CalendarEventFormValues,
} from '../../dialogs/calendar-event-dialog';
import { CalendarFeedSubscribeDialog } from '../../dialogs/calendar-feed-subscribe-dialog';

/**
 * Constant QUICK_CREATE_DEFAULT_TIME
 *
 * @description
 * The local wall-clock time a quick-created event defaults to on its picked day.
 */
const QUICK_CREATE_DEFAULT_TIME: string = '09:00';

/**
 * Type CalendarGranularity
 *
 * @description
 * Which period the page shows: the month grid, one week as an agenda list,
 * or one day's list. The feed window follows the granularity — always a
 * bounded date-range fetch, never a paginated collection.
 *
 * @since 2.2.0
 *
 * @type
 */
type CalendarGranularity = 'month' | 'week' | 'day';

/**
 * Type CalendarPageAgendaGroup
 *
 * @description
 * One day's entries for the narrow month agenda or the week view. Week
 * groups also carry a compact heading for the seven-column layout.
 *
 * @since 1.1.0
 *
 * @type
 */
type CalendarPageAgendaGroup = {
  /**
   * Property day
   * @readonly
   *
   * @description
   * Identifies the calendar day that groups these entries.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly day: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this calendar page agenda group.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property shortLabel
   * @readonly
   *
   * @description
   * Provides the compact day label displayed in the agenda.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly shortLabel?: string;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Contains the calendar entries scheduled for this day.
   *
   * @access public
   * @since unreleased
   *
   * @type {readonly CalendarFeedItemOutput[]}
   */
  readonly items: readonly CalendarFeedItemOutput[];
};

/**
 * Class CalendarPage
 * @class CalendarPage
 *
 * @description
 * The organization's calendar: every dated commitment — standalone events,
 * inspections, interventions, preventive maintenance — read from the
 * backend's unified feed, at three granularities: the month grid, one week
 * as a seven-day agenda list, or a single day's list. A full-height console:
 * a page-level toolbar band (Today, prev/next period and the current period
 * label) drives the page's own
 * `month`/`granularity`/`selectedDay` state — the shared `app-calendar`
 * widget renders with its own built-in toolbar hidden (`showToolbar="false"`)
 * so the two never duplicate — and the active view fills the remaining
 * height, scrolling internally when it overflows. The Month/Week/Day
 * selector is a paginated Spartan `line` tab list projected beneath the
 * shell page title through `PageTabsService`. The toolbar-plus-content section sits inside one
 * `[tab]="granularity()"`-bound `hlm-tabs`, which owns the roving tabindex,
 * arrow-key navigation and `aria-controls`/`aria-selected` wiring the three
 * panels below reference through `hlmTabsContent`; `class="contents"` on the
 * `hlm-tabs` host keeps it invisible to the page's own flex layout. At `md`
 * and below, the
 * month view's shrunken grid gives way to an agenda: the same window's
 * entries grouped by day, since a month grid is unusable at phone width. The
 * grid's day panel, the agenda's day groups, and the week/day views all
 * render through `CalendarEntryList`, the single row renderer for a feed
 * entry — an intervention entry links to its workspace. Writable standalone
 * events can also be quick-created from a day (the grid cell's "+" or a
 * week/day section's) and drag-rescheduled between grid days — with the
 * row's Edit dialog as the keyboard path to the same date change, so drag is
 * never the only way. Browser-only loading: the feed is a dated,
 * authenticated read that would immediately refetch after hydration
 * (ARCHITECTURE.md §12.5-3). The toolbar's "Subscribe (iCal)" button opens
 * the feed-token dialog (`CalendarFeedSubscribeDialog`), which owns its own
 * transport calls — this page only holds its visibility. Header actions use a native Spartan
 * creation split button with Subscribe in its menu; read-only viewers retain
 * the direct Subscribe action.
 *
 * @version 2.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    NgIcon,
    NgTemplateOutlet,
    ...HlmAlertImports,
    ...HlmEmptyImports,
    ...HlmMarkerImports,
    ...HlmTooltipImports,
    Calendar,
    CalendarEntryList,
    CalendarEventDeleteDialog,
    CalendarEventDialog,
    CalendarFeedSubscribeDialog,
    HlmBadge,
    HlmButton,
    HlmButtonGroup,
    ...HlmDropdownMenuImports,
    HlmSkeleton,
    ...HlmTabsImports,
    StateIllustration,
  ],
  providers: [
    CalendarFeedStore,
    CalendarFacilityOptionsStore,
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideCircleAlert,
      lucidePlus,
      lucideCalendar,
      lucideCalendar1,
      lucideCalendarClock,
      lucideCalendarDays,
      lucideCalendarRange,
      lucideChevronDown,
      lucideClipboardCheck,
      lucideRss,
      lucideTriangleAlert,
      lucideWrench,
    }),
  ],
  templateUrl: './calendar-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Chooses the month agenda without changing the selected period or view.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The organization whose calendar is shown, from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property listForbidden
   * @readonly
   *
   * @description
   * Whether the last list read was refused for lack of permission, which a retry cannot fix.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(
    () => this.store.queryError()?.code === 403,
  );

  //#endregion

  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * The unified feed of the displayed window.
   *
   * @access protected
   * @since unreleased
   *
   * @type {CalendarFeedStoreType}
   */
  protected readonly store: CalendarFeedStoreType =
    inject<CalendarFeedStoreType>(CalendarFeedStore);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Identifies the current Angular platform for server and browser checks.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

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

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating the "New event" action and every row's Edit/Delete.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property facilityStore
   * @readonly
   *
   * @description
   * Read-only source of the facility options offered by the event dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InstanceType<typeof CalendarFacilityOptionsStore>}
   */
  protected readonly facilityStore: InstanceType<typeof CalendarFacilityOptionsStore> = inject(
    CalendarFacilityOptionsStore,
  );

  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * The active organization context, source of the regional first-day-of-week preference.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property regionalFormattingPort
   * @readonly
   *
   * @description
   * The active organization's regional formatting context port.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, forwarded to the subscribe dialog's
   * `createdAt`/`lastUsedAt` rendering.
   *
   * @access protected
   * @since 2.3.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property feedSubscribeDialogVisible
   * @readonly
   *
   * @description
   * Whether the "Subscribe (iCal)" dialog is open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly feedSubscribeDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canWriteEvents
   * @readonly
   *
   * @description
   * Whether the member holds `organization.events.write` — gates "New event" and every row's
   * Edit/Delete.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWriteEvents: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EVENTS_WRITE),
  );

  /**
   * Property firstDayOfWeek
   * @readonly
   *
   * @description
   * The organization's regional first-day-of-week preference, Monday when unset.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<CalendarFirstDayOfWeek>}
   */
  protected readonly firstDayOfWeek: Signal<CalendarFirstDayOfWeek> =
    computed<CalendarFirstDayOfWeek>(
      () =>
        this.organizationContext.selectedOrganization()?.settings?.regional?.firstDayOfWeek ??
        'monday',
    );

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * The lazy picker page and independently resolved selection for an open event form.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *     ReadonlyArray<{ readonly value: string; readonly label: string }>
   *   >}
   */
  protected readonly facilityOptions: Signal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = this.facilityStore.options;

  /**
   * Property todayIso
   * @readonly
   *
   * @description
   * Today's organization day, recomputed when the regional timezone changes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly todayIso: Signal<string> = computed(() =>
    DateTime.now().setZone(this.regionalFormatting().timezone).toFormat('yyyy-MM-dd'),
  );

  /**
   * Property eventDialogVisible
   * @readonly
   *
   * @description
   * Whether the create/edit dialog is open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly eventDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property editingEvent
   * @readonly
   *
   * @description
   * The `event`-source entry being edited, or `null` when the dialog is creating a new one.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<CalendarFeedItemOutput | null>}
   */
  protected readonly editingEvent: WritableSignal<CalendarFeedItemOutput | null> =
    signal<CalendarFeedItemOutput | null>(null);

  /**
   * Property pendingDeleteEvent
   * @readonly
   *
   * @description
   * The `event`-source entry awaiting delete confirmation, or `null` when the dialog is closed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<CalendarFeedItemOutput | null>}
   */
  protected readonly pendingDeleteEvent: WritableSignal<CalendarFeedItemOutput | null> =
    signal<CalendarFeedItemOutput | null>(null);

  /**
   * Property isEventWritePending
   * @readonly
   *
   * @description
   * Whether the create/edit dialog's own write is in flight — the create write while creating, the
   * update write while editing.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEventWritePending: Signal<boolean> = computed<boolean>(() =>
    isCallPending(
      this.editingEvent() ? this.store.updateEventCallState() : this.store.createEventCallState(),
    ),
  );

  /**
   * Property eventWriteError
   * @readonly
   *
   * @description
   * The create/edit dialog's own last rejection, when any.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<StoreError | null>}
   */
  protected readonly eventWriteError: Signal<StoreError | null> = computed<StoreError | null>(
    () =>
      (this.editingEvent() ? this.store.updateEventCallState() : this.store.createEventCallState())
        .error ?? null,
  );

  /**
   * Property isDeletePending
   * @readonly
   *
   * @description
   * Whether the delete confirmation's write is in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly isDeletePending: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.deleteEventCallState()),
  );

  /**
   * Property deleteErrorMessage
   * @readonly
   *
   * @description
   * The delete confirmation's last rejection, when any.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  protected readonly deleteErrorMessage: Signal<string | null> = computed<string | null>(
    () => this.store.deleteEventCallState().error?.message ?? null,
  );

  /**
   * Property month
   * @readonly
   *
   * @description
   * Anchor of the displayed period — any date inside the month, the day anchoring the week, or the
   * shown day. Driven two-way by the grid (month view) and by the toolbar.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<Date>}
   */
  protected readonly month: WritableSignal<Date> = signal<Date>(
    new Date(`${this.todayIso()}T00:00:00`),
  );

  /**
   * Property selectedDay
   * @readonly
   *
   * @description
   * The selected day (`yyyy-MM-dd`), today on arrival.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    this.todayIso(),
  );

  /**
   * Property granularity
   * @readonly
   *
   * @description
   * Which period the page shows — month grid, week agenda, or day list. See
   * {@link CalendarGranularity}.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {WritableSignal<CalendarGranularity>}
   */
  protected readonly granularity: WritableSignal<CalendarGranularity> =
    signal<CalendarGranularity>('month');

  /**
   * Property createDefaultStart
   * @readonly
   *
   * @description
   * The `yyyy-MM-ddTHH:mm` start pre-filling the create dialog when it was opened from a day's
   * quick-create affordance, `null` otherwise.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly createDefaultStart: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Property moveAnnouncement
   * @readonly
   *
   * @description
   * The `aria-live="polite"` announcement text — reflects the last drag-reschedule's outcome.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly moveAnnouncement: WritableSignal<string> = signal<string>('');

  /**
   * Property events
   * @readonly
   *
   * @description
   * Feed items mapped onto shared calendar chips; only writable standalone events are draggable.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarDisplayEvent[]>}
   */
  protected readonly events: Signal<readonly CalendarDisplayEvent[]> = computed(() =>
    this.store.items().map((item: CalendarFeedItemOutput): CalendarDisplayEvent => {
      const key: CalendarSourceKey = item.sourceKey;

      return {
        id: `${item.sourceKey}:${item.id}`,
        date: DateTime.fromISO(item.startsAt, {
          zone: this.regionalFormatting().timezone,
        }).toFormat("yyyy-MM-dd'T'HH:mm:ss"),
        endDate: item.endsAt
          ? DateTime.fromISO(item.endsAt, { zone: this.regionalFormatting().timezone }).toFormat(
              "yyyy-MM-dd'T'HH:mm:ss",
            )
          : null,
        allDay: item.allDay,
        label: item.title,
        tone: SOURCE_TONE[key] ?? 'outline',
        icon: SOURCE_ICON[key],
        sourceLabel: calendarSourceLabelOf(key),
        draggable: item.sourceKey === 'calendar_event' && this.canWriteEvents(),
      };
    }),
  );

  /**
   * Property periodLabel
   * @readonly
   *
   * @description
   * The toolbar's period label — "Month Year", the week's localized date range, or the day's full
   * date, per {@link granularity}. The grid's own title, hidden, mirrors the month form.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<string>}
   */
  protected readonly periodLabel: Signal<string> = computed<string>(() => {
    const anchor: Date = this.month();

    switch (this.granularity()) {
      case 'month':
        return new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(
          anchor,
        );
      case 'week': {
        const start: Date = this.startOfWeekOf(anchor);
        const end: Date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);

        return new Intl.DateTimeFormat(this.locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).formatRange(start, end);
      }
      case 'day':
        return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(anchor);
    }
  });

  /**
   * Property previousAriaLabel
   * @readonly
   *
   * @description
   * The prev button's accessible name, matching the active {@link granularity}.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<string>}
   */
  protected readonly previousAriaLabel: Signal<string> = computed<string>(() => {
    switch (this.granularity()) {
      case 'month':
        return $localize`:@@calendar.previousMonth:Previous month`;
      case 'week':
        return $localize`:@@calendar.previousWeek:Previous week`;
      case 'day':
        return $localize`:@@calendar.previousDay:Previous day`;
    }
  });

  /**
   * Property nextAriaLabel
   * @readonly
   *
   * @description
   * The next button's accessible name, matching the active {@link granularity}.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<string>}
   */
  protected readonly nextAriaLabel: Signal<string> = computed<string>(() => {
    switch (this.granularity()) {
      case 'month':
        return $localize`:@@calendar.nextMonth:Next month`;
      case 'week':
        return $localize`:@@calendar.nextWeek:Next week`;
      case 'day':
        return $localize`:@@calendar.nextDay:Next day`;
    }
  });

  /**
   * Property weekGroups
   * @readonly
   *
   * @description
   * The anchored week's seven days — empty days included, so the week always
   * reads as a full week — each with localized full and compact headings and
   * its entries, earliest first. The week starts on {@link firstDayOfWeek}.
   *
   * @access protected
   * @since 2.2.0
   *
   * @type {Signal<readonly CalendarPageAgendaGroup[]>}
   */
  protected readonly weekGroups: Signal<readonly CalendarPageAgendaGroup[]> = computed(() => {
    const start: Date = this.startOfWeekOf(this.month());
    const items: readonly CalendarFeedItemOutput[] = this.store.items();

    return Array.from({ length: 7 }, (unused, index: number): CalendarPageAgendaGroup => {
      const date: Date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const day: string = toIsoDay(date);

      return {
        day,
        label: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(date),
        shortLabel: new Intl.DateTimeFormat(this.locale, {
          weekday: 'short',
          day: 'numeric',
        }).format(date),
        items: items
          .filter((item: CalendarFeedItemOutput) => this.itemCoversDay(item, day))
          .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
      };
    });
  });

  /**
   * Property dayViewIso
   * @readonly
   *
   * @description
   * The day view's `yyyy-MM-dd` day — the anchor itself.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly dayViewIso: Signal<string> = computed<string>(() => toIsoDay(this.month()));

  /**
   * Property dayViewItems
   * @readonly
   *
   * @description
   * Entries for the day view, earliest first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarFeedItemOutput[]>}
   */
  protected readonly dayViewItems: Signal<readonly CalendarFeedItemOutput[]> = computed(() => {
    const day: string = this.dayViewIso();

    return this.store
      .items()
      .filter((item: CalendarFeedItemOutput) => this.itemCoversDay(item, day))
      .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  /**
   * Property dayItems
   * @readonly
   *
   * @description
   * Entries for the selected day in the contextual panel, earliest first.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CalendarFeedItemOutput[]>}
   */
  protected readonly dayItems: Signal<readonly CalendarFeedItemOutput[]> = computed(() => {
    const day: string | null = this.selectedDay();
    if (day === null) return [];

    return this.store
      .items()
      .filter((item) => this.itemCoversDay(item, day))
      .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  /**
   * Property selectedDayLabel
   * @readonly
   *
   * @description
   * The selected day as a full localized heading.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly selectedDayLabel: Signal<string> = computed<string>(() => {
    const day: string | null = this.selectedDay();
    if (day === null) return '';

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
      new Date(`${day}T00:00:00`),
    );
  });

  /**
   * Property agendaGroups
   * @readonly
   *
   * @description
   * The loaded window's entries grouped by local day, earliest day and
   * earliest entry first — the agenda's day sections below `md`, where the
   * shrunken month grid does not render.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly CalendarPageAgendaGroup[]>}
   */
  protected readonly agendaGroups: Signal<readonly CalendarPageAgendaGroup[]> = computed(() => {
    const grouped = new Map<string, CalendarFeedItemOutput[]>();
    for (const item of this.store.items()) {
      const day = DateTime.fromISO(item.startsAt, {
        zone: this.regionalFormatting().timezone,
      }).toFormat('yyyy-MM-dd');
      const bucket = grouped.get(day) ?? [];
      bucket.push(item);
      grouped.set(day, bucket);
    }

    const anchor = this.month();
    const first = this.startOfWeekOf(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    const finalWeek = this.startOfWeekOf(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    const last = new Date(finalWeek.getFullYear(), finalWeek.getMonth(), finalWeek.getDate() + 6);
    let date = new Date(first);
    while (date <= last) {
      const day = toIsoDay(date);
      for (const item of this.store.items()) {
        if (
          DateTime.fromISO(item.startsAt, { zone: this.regionalFormatting().timezone }).toFormat(
            'yyyy-MM-dd',
          ) === day ||
          !this.itemCoversDay(item, day)
        )
          continue;
        const bucket = grouped.get(day) ?? [];
        bucket.push(item);
        grouped.set(day, bucket);
      }
      date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    }

    return [...grouped.entries()]
      .toSorted(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .map(([day, daily]): CalendarPageAgendaGroup => ({
        day,
        label: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
          new Date(`${day}T00:00:00`),
        ),
        items: daily.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
      }));
  });

  /**
   * Property loadFailed
   * @readonly
   *
   * @description
   * Whether the last feed read failed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly loadFailed: Signal<boolean> = computed<boolean>(
    () => this.store.queryError() !== null,
  );

  /**
   * Property pageActionsService
   * @readonly
   *
   * @description
   * Registers {@link pageActions} on the shell header.
   *
   * @access private
   * @since unreleased
   *
   * @type {PageActionsService}
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * "Subscribe (iCal)" and "New event", registered on the shell's title band rather than left in
   * the toolbar — the toolbar keeps only what scopes the view (Today, prev/next, granularity).
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property pageTabsService
   * @readonly
   *
   * @description
   * Shell registry receiving the Month, Week and Day navigation.
   *
   * @access private
   * @since 2.4.0
   *
   * @type {PageTabsService}
   */
  private readonly pageTabsService: PageTabsService = inject(PageTabsService);

  /**
   * Property pageTabs
   * @readonly
   *
   * @description
   * Native Spartan line tabs projected beneath the dashboard page title.
   *
   * @access private
   * @since 2.4.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageTabs: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageTabs');

  /**
   * Property dayPanel
   * @readonly
   *
   * @description
   * Month view's selected-day template, rendered in the dashboard's right slot.
   *
   * @access private
   * @since 2.4.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly dayPanel: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('dayPanel');

  /**
   * Property panelRegistry
   * @readonly
   *
   * @description
   * Shell-scoped registry retaining this page template's declaration context.
   *
   * @access private
   * @since 2.4.0
   *
   * @type {DashboardPanelRegistry}
   */
  private readonly panelRegistry: DashboardPanelRegistry = inject(DashboardPanelRegistry);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Reads the shareable calendar date and view from the owning route.
   *
   * @access private
   * @since unreleased
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Preserves unrelated query parameters when the displayed calendar period changes.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property queryParams
   * @readonly
   *
   * @description
   * Route updates, including browser back navigation, drive the same feed window.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ParamMap>}
   */
  private readonly queryParams: Signal<ParamMap> = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /**
   * Property dialogOrganizationId
   *
   * @description
   * Prevents a draft from being submitted under a newly selected organization.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private dialogOrganizationId: string | null = null;

  /**
   * Property lastRequestedWindow
   *
   * @description
   * Avoids duplicate reads when route synchronization keeps the same calendar window.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private lastRequestedWindow: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the displayed window on arrival and on every navigation, loads the
   * facility options only when its form opens, and closes each dialog once its
   * own write settles successfully — the store's own re-read of the loaded
   * window (see `CalendarFeedStore`) is what makes the new/changed/removed
   * entry show up, this page only owns the dialogs' visibility.
   * Also registers {@link pageActions}.
   *
   * @access public
   * @since 2.2.0
   */
  public constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    registerPageActions(this.pageActions, this.pageActionsService, destroyRef);
    registerPageTabs(this.pageTabs, this.pageTabsService, destroyRef);

    effect((): void => {
      const params = this.queryParams();
      const zone = this.regionalFormatting().timezone;
      const rawDate = params.get('date');
      const parsed =
        rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? DateTime.fromISO(rawDate, { zone }) : null;
      const day = parsed?.isValid
        ? parsed.toFormat('yyyy-MM-dd')
        : DateTime.now().setZone(zone).toFormat('yyyy-MM-dd');
      const view = params.get('view');
      untracked((): void => {
        if (toIsoDay(this.month()) !== day) this.month.set(new Date(`${day}T00:00:00`));
        this.selectedDay.set(day);
        this.granularity.set(view === 'week' || view === 'day' ? view : 'month');
      });
    });

    effect((): void => {
      const organizationId = this.organizationId();
      untracked((): void => {
        if (this.dialogOrganizationId && this.dialogOrganizationId !== organizationId) {
          this.eventDialogVisible.set(false);
          this.editingEvent.set(null);
          this.createDefaultStart.set(null);
          this.pendingDeleteEvent.set(null);
          this.feedSubscribeDialogVisible.set(false);
          this.dialogOrganizationId = null;
        }
      });
    });

    effect((onCleanup): void => {
      const template = this.dayPanel();
      if (this.granularity() !== 'month' || !template) return;
      this.panelRegistry.register(
        template,
        $localize`:@@calendar.selectedDayPanelLabel:Selected day events`,
      );
      onCleanup(() => this.panelRegistry.clear(template));
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const anchor: Date = this.month();
      const granularity: CalendarGranularity = this.granularity();
      this.firstDayOfWeek();
      const timezone = this.regionalFormatting().timezone;

      untracked((): void => {
        if (!isPlatformBrowser(this.platformId)) return;

        const command = this.windowOf(organizationId, anchor, granularity);
        const key = `${organizationId}:${timezone}:${command.from}:${command.to}`;
        if (key === this.lastRequestedWindow) return;
        this.lastRequestedWindow = key;
        this.store.load(command);
      });
    });

    effect((): void => {
      const callState: CallState<CalendarEventOutput> = this.store.moveEventCallState();

      untracked((): void => {
        if (callState.status !== 'error') return;

        this.moveAnnouncement.set(
          $localize`:@@calendar.moveErrorAnnounce:The event could not be moved and was put back.`,
        );
      });
    });

    effect((): void => {
      const organizationId = this.organizationId();
      const visible = this.eventDialogVisible();
      const editing = this.editingEvent();
      untracked((): void => {
        if (!isPlatformBrowser(this.platformId)) return;
        if (visible) this.facilityStore.open(organizationId, editing?.facilityId ?? null);
        else this.facilityStore.close();
      });
    });

    effect((): void => {
      const callState: CallState<CalendarEventOutput> = this.store.createEventCallState();

      untracked((): void => this.settleEventDialogWrite(callState));
    });

    effect((): void => {
      const callState: CallState<CalendarEventOutput> = this.store.updateEventCallState();

      untracked((): void => this.settleEventDialogWrite(callState));
    });

    effect((): void => {
      const callState: CallState<null> = this.store.deleteEventCallState();

      untracked((): void => {
        if (callState.status !== 'success' || this.dialogOrganizationId !== this.organizationId())
          return;

        this.pendingDeleteEvent.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method syncCalendarUrl
   * @method syncCalendarUrl
   *
   * @description
   * Writes the civil anchor and view while preserving unrelated route parameters.
   *
   * @access private
   * @since unreleased
   *
   * @returns {void}
   */
  private syncCalendarUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: toIsoDay(this.month()), view: this.granularity() },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method onCalendarMonthChanged
   * @method onCalendarMonthChanged
   *
   * @description
   * Synchronizes month-grid navigation with the shareable route anchor.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Date} month - Civil date reported by the generic grid.
   *
   * @returns {void}
   */
  protected onCalendarMonthChanged(month: Date): void {
    this.month.set(month);
    this.syncCalendarUrl();
  }

  /**
   * Method onCalendarDaySelected
   * @method onCalendarDaySelected
   *
   * @description
   * Persists a selected civil day without issuing a second read for the same month.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string | null} day - Selected ISO day.
   *
   * @returns {void}
   */
  protected onCalendarDaySelected(day: string | null): void {
    this.selectedDay.set(day);
    if (!day) return;
    this.month.set(new Date(`${day}T00:00:00`));
    this.syncCalendarUrl();
  }
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Re-reads the displayed window after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    this.store.load(this.windowOf(this.organizationId(), this.month(), this.granularity()));
  }

  /**
   * Method switchGranularity
   * @method switchGranularity
   *
   * @description
   * The toolbar's Month/Week/Day tab handler — the anchor stays, so the new granularity shows the
   * period containing it.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {CalendarGranularity} granularity - The activated granularity.
   *
   * @returns {void}
   */
  protected switchGranularity(granularity: CalendarGranularity): void {
    this.granularity.set(granularity);
    this.syncCalendarUrl();
  }

  /**
   * Method onGranularityTabActivated
   * @method onGranularityTabActivated
   *
   * @description
   * Narrows `hlm-tabs`' plain-string `tabActivated` payload to {@link CalendarGranularity} before
   * delegating to {@link switchGranularity}.
   *
   * @access protected
   * @since 2.4.0
   *
   * @param {string} tab - The `hlm-tabs` id that just activated.
   *
   * @returns {void}
   */
  protected onGranularityTabActivated(tab: string): void {
    if (tab === 'month' || tab === 'week' || tab === 'day') this.switchGranularity(tab);
  }

  /**
   * Method goToday
   * @method goToday
   *
   * @description
   * Re-anchors the toolbar on today's period and selects today.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected goToday(): void {
    this.month.set(new Date(`${this.todayIso()}T00:00:00`));
    this.selectedDay.set(this.todayIso());
    this.syncCalendarUrl();
  }

  /**
   * Method stepPeriod
   * @method stepPeriod
   *
   * @description
   * Moves the toolbar's anchor one period — month, week, or day per {@link granularity} — backwards
   * or forwards.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {number} offset - `-1` or `1`.
   *
   * @returns {void}
   */
  protected stepPeriod(offset: number): void {
    const current: Date = this.month();

    switch (this.granularity()) {
      case 'month':
        this.month.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
        break;
      case 'week':
        this.month.set(
          new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset * 7),
        );
        break;
      case 'day':
        this.month.set(
          new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset),
        );
    }
    this.syncCalendarUrl();
  }

  /**
   * Method startOfWeekOf
   * @method startOfWeekOf
   *
   * @description
   * Local midnight on the first day of the anchor's week, honouring {@link firstDayOfWeek}.
   *
   * @access private
   * @since 2.2.0
   *
   * @param {Date} anchor - Any date inside the week.
   *
   * @returns {Date} The week's first day.
   */
  private startOfWeekOf(anchor: Date): Date {
    const offset: number =
      this.firstDayOfWeek() === 'monday' ? (anchor.getDay() + 6) % 7 : anchor.getDay();

    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
  }

  /**
   * Method itemCoversDay
   * @method itemCoversDay
   *
   * @description
   * Includes every local day of a feed item, excluding a timed end exactly at midnight.
   *
   * @access private
   * @since 2.4.0
   *
   * @param {CalendarFeedItemOutput} item - The feed item to inspect.
   * @param {string} day - The local ISO day being displayed.
   *
   * @returns {boolean} Whether the item occurs on that day.
   */
  private itemCoversDay(item: CalendarFeedItemOutput, day: string): boolean {
    const zone = this.regionalFormatting().timezone;
    const start = DateTime.fromISO(item.startsAt, { zone });
    if (!start.isValid) return false;
    const startDay = start.toFormat('yyyy-MM-dd');
    if (day < startDay) return false;

    if (!item.endsAt) return day === startDay;
    let end = DateTime.fromISO(item.endsAt, { zone });
    if (!end.isValid || end <= start) return day === startDay;
    if (
      !item.allDay &&
      end.hour === 0 &&
      end.minute === 0 &&
      end.second === 0 &&
      end.millisecond === 0
    ) {
      end = end.minus({ milliseconds: 1 });
    }

    return day <= end.toFormat('yyyy-MM-dd');
  }

  /**
   * Method windowOf
   * @method windowOf
   *
   * @description
   * The feed command covering the displayed period — the anchor's month plus
   * one week each side (the grid's filler days must not lose their chips),
   * the anchored week, or the single day — as the full ISO datetimes with
   * explicit offset the endpoint demands; a bare `yyyy-MM-dd` is a 400.
   *
   * @access private
   * @since 2.2.0
   *
   * @param {string} organizationId - The organization to read.
   * @param {Date} anchor - Any date inside the displayed period.
   * @param {CalendarGranularity} granularity - The displayed period kind.
   *
   * @returns {{ organizationId: string; from: string; to: string }} The load command.
   */
  private windowOf(
    organizationId: string,
    anchor: Date,
    granularity: CalendarGranularity,
  ): { readonly organizationId: string; readonly from: string; readonly to: string } {
    const date = DateTime.fromObject(
      { year: anchor.getFullYear(), month: anchor.getMonth() + 1, day: anchor.getDate() },
      { zone: this.regionalFormatting().timezone },
    );
    switch (granularity) {
      case 'month':
        return {
          organizationId,
          from: toApiDateTime(date.startOf('month').minus({ days: 7 })),
          to: toApiDateTime(date.endOf('month').plus({ days: 7 }).set({ millisecond: 0 })),
        };
      case 'week': {
        const offset = this.firstDayOfWeek() === 'monday' ? date.weekday - 1 : date.weekday % 7;
        const start = date.startOf('day').minus({ days: offset });

        return {
          organizationId,
          from: toApiDateTime(start),
          to: toApiDateTime(start.plus({ days: 6 }).endOf('day').set({ millisecond: 0 })),
        };
      }
      case 'day':
        return {
          organizationId,
          from: toApiDateTime(date.startOf('day')),
          to: toApiDateTime(date.endOf('day').set({ millisecond: 0 })),
        };
    }
  }

  /**
   * Method openCreateDialog
   * @method openCreateDialog
   *
   * @description
   * Opens the event dialog in create mode.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected openCreateDialog(): void {
    if (!this.canWriteEvents() || this.isEventWritePending()) return;
    this.store.resetWriteCallStates();
    this.dialogOrganizationId = this.organizationId();
    this.createDefaultStart.set(null);
    this.editingEvent.set(null);
    this.eventDialogVisible.set(true);
  }

  /**
   * Method onCreateRequested
   * @method onCreateRequested
   *
   * @description
   * Quick create from a day — the grid cell's "+" button or a week/day
   * section's own — opens the create dialog with its start pre-filled on
   * that day at a default morning time.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {string} day - The picked `yyyy-MM-dd` day.
   *
   * @returns {void}
   */
  protected onCreateRequested(day: string): void {
    if (!this.canWriteEvents() || this.isEventWritePending()) return;
    this.store.resetWriteCallStates();
    this.dialogOrganizationId = this.organizationId();

    this.createDefaultStart.set(`${day}T${QUICK_CREATE_DEFAULT_TIME}`);
    this.editingEvent.set(null);
    this.eventDialogVisible.set(true);
  }

  /**
   * Method sourceLabelOf
   * @method sourceLabelOf
   *
   * @description
   * Names a feed source for the "Partial results" banner, through the same resolver
   * `CalendarEntryList` renders its row badges with.
   *
   * @access protected
   * @since 2.5.0
   *
   * @param {CalendarSourceKey} sourceKey - The partial source to name.
   *
   * @returns {string} A short localized source name.
   */
  protected sourceLabelOf(sourceKey: CalendarSourceKey): string {
    return calendarSourceLabelOf(sourceKey);
  }

  /**
   * Property entryFacilityLabelOf
   * @readonly
   *
   * @description
   * Resolves a bare facility id — as `CalendarFeedItemOutput.facilityId` and {@link facilityOptions}
   * both already are — to its name, passed to `CalendarEntryList` as its `facilityLabelOf` input.
   *
   * @access protected
   * @since 2.5.0
   *
   * @type {(facilityId: string) => string | null}
   *
   * @param {string} facilityId - The bare facility id.
   *
   * @returns {string | null} The facility's name, or `null` when it does not resolve.
   */
  protected readonly entryFacilityLabelOf: (facilityId: string) => string | null = (
    facilityId: string,
  ): string | null =>
    this.facilityOptions().find((option) => option.value === facilityId)?.label ?? null;

  /**
   * Method isToday
   * @method isToday
   *
   * @description
   * Whether a `yyyy-MM-dd` day is today, for the week view's "Today" badge.
   *
   * @access protected
   * @since 2.5.0
   *
   * @param {string} day - The day to check.
   *
   * @returns {boolean} Whether the day is today.
   */
  protected isToday(day: string): boolean {
    return day === this.todayIso();
  }

  /**
   * Method createOnDayAriaLabelOf
   * @method createOnDayAriaLabelOf
   *
   * @description
   * A week/day section's quick-create button's accessible name, dated so repeated sections stay
   * distinguishable.
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {string} label - The section's localized full date.
   *
   * @returns {string} The localized dated label.
   */
  protected createOnDayAriaLabelOf(label: string): string {
    return $localize`:@@calendar.createOnDayAria:New event on ${label}:date:`;
  }

  /**
   * Method onEventDropped
   * @method onEventDropped
   *
   * @description
   * A `calendar_event` chip was dropped onto another grid day: keeps the
   * event's local wall-clock time, moves it to the target day, shifts a set
   * end by the same delta, announces the move for assistive tech, and hands
   * the optimistic write to `CalendarFeedStore.moveEvent`. A drop on the
   * event's own day is a no-op. Drag is never the only path — the row's Edit
   * dialog changes the same dates by keyboard (`FEATURE.md`).
   *
   * @access protected
   * @since 2.2.0
   *
   * @param {CalendarEventDrop} drop - The grid's reported gesture.
   *
   * @returns {void}
   */
  protected onEventDropped(drop: CalendarEventDrop): void {
    if (!this.canWriteEvents()) return;

    const item: CalendarFeedItemOutput | undefined = this.store
      .items()
      .find(
        (candidate: CalendarFeedItemOutput) =>
          candidate.sourceKey === 'calendar_event' &&
          `${candidate.sourceKey}:${candidate.id}` === drop.id,
      );
    if (item === undefined) return;

    const zone = this.regionalFormatting().timezone;
    const start = DateTime.fromISO(item.startsAt, { zone });
    const target = DateTime.fromISO(drop.day, { zone });
    if (!start.isValid || !target.isValid) return;
    const moved = target.set({ hour: start.hour, minute: start.minute, second: start.second });
    if (moved.hour !== start.hour || moved.minute !== start.minute) return;
    if (moved.toMillis() === start.toMillis()) return;

    const deltaDays = target.startOf('day').diff(start.startOf('day'), 'days').days;
    const endsAt: string | undefined = item.endsAt
      ? toApiDateTime(
          DateTime.fromISO(item.endsAt, { zone }).plus(
            item.allDay
              ? { days: deltaDays }
              : { milliseconds: moved.toMillis() - start.toMillis() },
          ),
        )
      : undefined;

    this.store.moveEvent({
      organizationId: this.organizationId(),
      eventId: item.id,
      startsAt: toApiDateTime(moved),
      ...(endsAt !== undefined ? { endsAt } : {}),
    });

    const eventTitle: string = item.title;
    const dayLabel: string = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
      new Date(target.year, target.month - 1, target.day),
    );
    this.moveAnnouncement.set(
      $localize`:@@calendar.moveAnnounce:${eventTitle}:eventTitle: moved to ${dayLabel}:date:`,
    );
  }

  /**
   * Method openEditDialog
   * @method openEditDialog
   *
   * @description
   * Opens the event dialog seeded with the given `calendar_event` entry.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} item - The entry to edit.
   *
   * @returns {void}
   */
  protected openEditDialog(item: CalendarFeedItemOutput): void {
    if (!this.canWriteEvents() || item.sourceKey !== 'calendar_event' || this.isEventWritePending())
      return;
    this.store.resetWriteCallStates();
    this.dialogOrganizationId = this.organizationId();
    this.editingEvent.set(item);
    this.eventDialogVisible.set(true);
  }

  /**
   * Method onEventDialogVisibleChanged
   * @method onEventDialogVisibleChanged
   *
   * @description
   * Closes the event dialog on any dismissal, clearing the record it was editing.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {boolean} visible - The dialog's new visibility.
   *
   * @returns {void}
   */
  protected onEventDialogVisibleChanged(visible: boolean): void {
    if (this.isEventWritePending()) return;
    this.eventDialogVisible.set(visible);
    if (!visible) {
      this.editingEvent.set(null);
      this.createDefaultStart.set(null);
    }
  }

  /**
   * Method onEventFormSubmitted
   * @method onEventFormSubmitted
   *
   * @description
   * Sends the create write for a new event, or the merge-patch update write
   * built from only the fields that changed against the record being
   * edited — see {@link buildUpdatePatch}.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarEventFormValues} values - The dialog's validated draft.
   *
   * @returns {void}
   */
  protected onEventFormSubmitted(values: CalendarEventFormValues): void {
    const organizationId: string = this.organizationId();
    if (
      !this.canWriteEvents() ||
      this.isEventWritePending() ||
      !this.eventDialogVisible() ||
      this.dialogOrganizationId !== organizationId
    )
      return;
    const editing: CalendarFeedItemOutput | null = this.editingEvent();

    if (editing) {
      this.store.updateEvent({
        organizationId,
        eventId: editing.id,
        input: this.buildUpdatePatch(editing, values),
      });

      return;
    }

    const createInput: CreateCalendarEventInput = {
      title: values.title,
      description: values.description,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      allDay: values.allDay,
      facilityId: values.facilityId,
    };

    this.store.createEvent({ organizationId, input: createInput });
  }

  /**
   * Method requestDelete
   * @method requestDelete
   *
   * @description
   * Opens the Delete confirmation for a `calendar_event` entry.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} item - The entry whose deletion was requested.
   *
   * @returns {void}
   */
  protected requestDelete(item: CalendarFeedItemOutput): void {
    if (!this.canWriteEvents() || item.sourceKey !== 'calendar_event' || this.isDeletePending())
      return;
    this.store.resetWriteCallStates();
    this.dialogOrganizationId = this.organizationId();
    this.pendingDeleteEvent.set(item);
  }

  /**
   * Method onDeleteDialogVisibleChanged
   * @method onDeleteDialogVisibleChanged
   *
   * @description
   * Clears the pending target on any dismissal.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {boolean} visible - The dialog's new visibility.
   *
   * @returns {void}
   */
  protected onDeleteDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.pendingDeleteEvent.set(null);
  }

  /**
   * Method confirmDelete
   * @method confirmDelete
   *
   * @description
   * Sends the delete write for the pending target. The dialog closes once the store settles, via
   * the constructor effect.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected confirmDelete(): void {
    const item: CalendarFeedItemOutput | null = this.pendingDeleteEvent();
    if (
      !item ||
      !this.canWriteEvents() ||
      this.isDeletePending() ||
      this.dialogOrganizationId !== this.organizationId()
    )
      return;

    this.store.deleteEvent({ organizationId: this.organizationId(), eventId: item.id });
  }

  /**
   * Method settleEventDialogWrite
   * @method settleEventDialogWrite
   *
   * @description
   * Closes the event dialog once its own write — create or edit — succeeds; a rejection is left for
   * the dialog's own inline error to render.
   *
   * @access private
   * @since 1.2.0
   *
   * @param {CallState<CalendarEventOutput>} callState - The write's call state.
   *
   * @returns {void}
   */
  private settleEventDialogWrite(callState: CallState<CalendarEventOutput>): void {
    if (callState.status !== 'success' || this.dialogOrganizationId !== this.organizationId())
      return;

    this.eventDialogVisible.set(false);
    this.editingEvent.set(null);
  }

  /**
   * Method buildUpdatePatch
   * @method buildUpdatePatch
   *
   * @description
   * Diffs the dialog's validated values against the record being edited,
   * including only the fields that actually changed — `Calendar\MODULE.md`'s
   * merge-patch contract treats an omitted field as unchanged and only an
   * explicit `null` clears `description`/`endsAt`/`facilityId`, so sending
   * every field on every edit would silently re-assert values the reader
   * never touched.
   *
   * @access private
   * @since 1.2.0
   *
   * @param {CalendarFeedItemOutput} original - The record being edited.
   * @param {CalendarEventFormValues} values - The dialog's validated draft.
   *
   * @returns {UpdateCalendarEventInput} The dirty fields only.
   */
  private buildUpdatePatch(
    original: CalendarFeedItemOutput,
    values: CalendarEventFormValues,
  ): UpdateCalendarEventInput {
    const patch: {
      -readonly [K in keyof UpdateCalendarEventInput]?: UpdateCalendarEventInput[K];
    } = {};

    if (values.title !== original.title) patch.title = values.title;

    const originalDescription: string | null = original.description ?? null;
    if (values.description !== originalDescription) patch.description = values.description;

    if (!isSameInstant(values.startsAt, original.startsAt)) patch.startsAt = values.startsAt;

    const originalEndsAt: string | null = original.endsAt ?? null;
    if (!isSameInstant(values.endsAt, originalEndsAt)) patch.endsAt = values.endsAt;

    if (values.allDay !== original.allDay) patch.allDay = values.allDay;

    const originalFacilityId: string | null = original.facilityId ?? null;
    if (values.facilityId !== originalFacilityId) patch.facilityId = values.facilityId;

    return patch;
  }
  //#endregion
}

/**
 * Function isSameInstant
 *
 * @description
 * Compares nullable ISO instants by parsed timestamp so equivalent offsets match.
 *
 * @access private
 * @since 1.2.0
 *
 * @param {string | null} a - The first ISO instant, or `null`.
 * @param {string | null} b - The second ISO instant, or `null`.
 *
 * @returns {boolean} Whether both represent the same instant — string equality would false-positive
 *   on differing timezone offsets.
 */
function isSameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;

  return new Date(a).getTime() === new Date(b).getTime();
}
