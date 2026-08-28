import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  LOCALE_ID,
  PLATFORM_ID,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideCircleAlert,
  lucidePlus,
  lucideCalendarDays,
  lucideRss,
} from '@ng-icons/lucide';
import type { CallState, StoreError } from '@core/request-state';
import { isCallPending } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { SOURCE_TONE } from '@features/organization/features/calendar/constants';
import type {
  CalendarEventOutput,
  CalendarFeedItemOutput,
  CalendarSourceKey,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '@features/organization/features/calendar/models';
import {
  CalendarFeedStore,
  type CalendarFeedStoreType,
} from '@features/organization/features/calendar/state';
import { toApiDateTime } from '@features/organization/features/calendar/utils';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  Calendar,
  toIsoDay,
  type CalendarDisplayEvent,
  type CalendarEventDrop,
  type CalendarFirstDayOfWeek,
} from '@shared/calendar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { CalendarEntryList } from '../../components/calendar-entry-list';
import { CalendarEventDeleteDialog } from '../../dialogs/calendar-event-delete-dialog';
import { CalendarEventDialog } from '../../dialogs/calendar-event-dialog';
import type { CalendarEventFormValues } from '../../dialogs/calendar-event-dialog';
import { CalendarFeedSubscribeDialog } from '../../dialogs/calendar-feed-subscribe-dialog';

/** How many facilities the event dialog's facility select offers, mirroring `equipment-detail-page`'s own facility picker. */
const FACILITY_OPTIONS_PAGE_SIZE: number = 200;

/** The local wall-clock time a quick-created event defaults to on its picked day. */
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
 */
type CalendarGranularity = 'month' | 'week' | 'day';

/**
 * Type CalendarPageAgendaGroup
 *
 * @description
 * One day's worth of the agenda the page renders below `md` — the same
 * window the month grid shows above it, grouped by local day since the
 * shrunken grid does not render there (`FEATURE.md`).
 *
 * @since 1.1.0
 */
type CalendarPageAgendaGroup = {
  readonly day: string;
  readonly label: string;
  readonly items: readonly CalendarFeedItemOutput[];
};

/**
 * Component CalendarPage
 * @class CalendarPage
 *
 * @description
 * The organization's calendar: every dated commitment — standalone events,
 * inspections, interventions, preventive maintenance — read from the
 * backend's unified feed, at three granularities: the month grid, one week
 * as a seven-day agenda list, or a single day's list. A full-height console:
 * a page-level toolbar band (Today, prev/next period, the current period
 * label, the Month/Week/Day selector) drives the page's own
 * `month`/`granularity`/`selectedDay` state — the shared `app-calendar`
 * widget renders with its own built-in toolbar hidden (`showToolbar="false"`)
 * so the two never duplicate — and the active view fills the remaining
 * height, scrolling internally when it overflows. The Month/Week/Day
 * selector is `hlm-tabs` (`@shared/ui/tabs`), not a hand-rolled
 * `role="tablist"`: the whole toolbar-plus-content section sits inside one
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
 * transport calls — this page only holds its visibility.
 *
 * @version 2.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    EmptyState,
    Calendar,
    CalendarEntryList,
    CalendarEventDeleteDialog,
    CalendarEventDialog,
    CalendarFeedSubscribeDialog,
    NgIcon,
    ErrorState,
    HlmButton,
    HlmSkeleton,
    ...HlmCardImports,
    ...HlmTabsImports,
  ],
  providers: [
    CalendarFeedStore,
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideCircleAlert,
      lucidePlus,
      lucideCalendarDays,
      lucideRss,
    }),
  ],
  templateUrl: './calendar-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The organization whose calendar is shown, from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The unified feed of the displayed window. */
  protected readonly store: CalendarFeedStoreType =
    inject<CalendarFeedStoreType>(CalendarFeedStore);

  private readonly platformId: object = inject(PLATFORM_ID);

  private readonly locale: string = inject(LOCALE_ID);

  /** Organization permission checks gating the "New event" action and every row's Edit/Delete. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Read-only source of the facility options offered by the event dialog. */
  private readonly facilityService: FacilityService = inject<FacilityService>(FacilityService);

  /** The active organization context, source of the regional first-day-of-week preference. */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, forwarded to the subscribe dialog's `createdAt`/`lastUsedAt` rendering.
   * @access protected
   * @since 2.3.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** Whether the "Subscribe (iCal)" dialog is open. */
  protected readonly feedSubscribeDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property canWriteEvents
   * @readonly
   * @description Whether the member holds `organization.events.write` — gates "New event" and every row's Edit/Delete.
   * @access protected
   * @since 1.2.0
   * @type {Signal<boolean>}
   */
  protected readonly canWriteEvents: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EVENTS_WRITE),
  );

  /**
   * Property firstDayOfWeek
   * @readonly
   * @description The organization's regional first-day-of-week preference, Monday when unset.
   * @access protected
   * @since 1.3.0
   * @type {Signal<CalendarFirstDayOfWeek>}
   */
  protected readonly firstDayOfWeek: Signal<CalendarFirstDayOfWeek> =
    computed<CalendarFirstDayOfWeek>(
      () =>
        this.organizationContext.selectedOrganization()?.settings?.regional?.firstDayOfWeek ??
        'monday',
    );

  /** The organization's facilities, preloaded for the event dialog's optional association. */
  protected readonly facilityOptions: WritableSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = signal([]);

  /** Whether the create/edit dialog is open. */
  protected readonly eventDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The `event`-source entry being edited, or `null` when the dialog is creating a new one. */
  protected readonly editingEvent: WritableSignal<CalendarFeedItemOutput | null> =
    signal<CalendarFeedItemOutput | null>(null);

  /** The `event`-source entry awaiting delete confirmation, or `null` when the dialog is closed. */
  protected readonly pendingDeleteEvent: WritableSignal<CalendarFeedItemOutput | null> =
    signal<CalendarFeedItemOutput | null>(null);

  /**
   * Property isEventWritePending
   * @readonly
   * @description Whether the create/edit dialog's own write is in flight — the create write while creating, the update write while editing.
   * @access protected
   * @since 1.2.0
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
   * @description The create/edit dialog's own last rejection, when any.
   * @access protected
   * @since 1.2.0
   * @type {Signal<StoreError | null>}
   */
  protected readonly eventWriteError: Signal<StoreError | null> = computed<StoreError | null>(
    () =>
      (this.editingEvent() ? this.store.updateEventCallState() : this.store.createEventCallState())
        .error ?? null,
  );

  /** Whether the delete confirmation's write is in flight. */
  protected readonly isDeletePending: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.deleteEventCallState()),
  );

  /** The delete confirmation's last rejection, when any. */
  protected readonly deleteErrorMessage: Signal<string | null> = computed<string | null>(
    () => this.store.deleteEventCallState().error?.message ?? null,
  );

  /** Anchor of the displayed period — any date inside the month, the day anchoring the week, or the shown day. Driven two-way by the grid (month view) and by the toolbar. */
  protected readonly month: WritableSignal<Date> = signal<Date>(new Date());

  /** The selected day (`yyyy-MM-dd`), today on arrival. */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    toIsoDay(new Date()),
  );

  /**
   * Property granularity
   * @readonly
   * @description Which period the page shows — month grid, week agenda, or day list. See {@link CalendarGranularity}.
   * @access protected
   * @since 2.2.0
   * @type {WritableSignal<CalendarGranularity>}
   */
  protected readonly granularity: WritableSignal<CalendarGranularity> =
    signal<CalendarGranularity>('month');

  /** The `yyyy-MM-ddTHH:mm` start pre-filling the create dialog when it was opened from a day's quick-create affordance, `null` otherwise. */
  protected readonly createDefaultStart: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** The `aria-live="polite"` announcement text — reflects the last drag-reschedule's outcome. */
  protected readonly moveAnnouncement: WritableSignal<string> = signal<string>('');

  /** Feed items mapped onto the shared calendar's generic chips — only a writable standalone event is flagged draggable. */
  protected readonly events: Signal<readonly CalendarDisplayEvent[]> = computed(() =>
    this.store.items().map((item: CalendarFeedItemOutput): CalendarDisplayEvent => {
      const key: CalendarSourceKey = item.sourceKey;

      return {
        id: `${item.sourceKey}:${item.id}`,
        date: item.startsAt,
        label: item.title,
        tone: SOURCE_TONE[key] ?? 'outline',
        draggable: item.sourceKey === 'calendar_event' && this.canWriteEvents(),
      };
    }),
  );

  /**
   * Property periodLabel
   * @readonly
   * @description The toolbar's period label — "Month Year", the week's localized date range, or the day's full date, per {@link granularity}. The grid's own title, hidden, mirrors the month form.
   * @access protected
   * @since 2.2.0
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
   * @description The prev button's accessible name, matching the active {@link granularity}.
   * @access protected
   * @since 2.2.0
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
   * @description The next button's accessible name, matching the active {@link granularity}.
   * @access protected
   * @since 2.2.0
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
   * reads as a full week — each with its localized heading and its entries,
   * earliest first. The week starts on {@link firstDayOfWeek}. This is the
   * week view's whole body: a 7-day agenda list reusing `CalendarEntryList`
   * rather than an hour-by-column grid (`FEATURE.md` documents the choice).
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
        items: items
          .filter((item: CalendarFeedItemOutput) => toIsoDay(new Date(item.startsAt)) === day)
          .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
      };
    });
  });

  /** The day view's `yyyy-MM-dd` day — the anchor itself. */
  protected readonly dayViewIso: Signal<string> = computed<string>(() => toIsoDay(this.month()));

  /** The day view's entries, earliest first. */
  protected readonly dayViewItems: Signal<readonly CalendarFeedItemOutput[]> = computed(() => {
    const day: string = this.dayViewIso();

    return this.store
      .items()
      .filter((item: CalendarFeedItemOutput) => toIsoDay(new Date(item.startsAt)) === day)
      .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  /** The selected day's entries, earliest first. */
  protected readonly dayItems: Signal<readonly CalendarFeedItemOutput[]> = computed(() => {
    const day: string | null = this.selectedDay();
    if (day === null) return [];

    return this.store
      .items()
      .filter((item) => toIsoDay(new Date(item.startsAt)) === day)
      .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt));
  });

  /** The selected day as a full localized heading. */
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
      const day: string = toIsoDay(new Date(item.startsAt));
      const bucket: CalendarFeedItemOutput[] = grouped.get(day) ?? [];
      bucket.push(item);
      grouped.set(day, bucket);
    }

    return [...grouped.entries()]
      .toSorted(([dayA], [dayB]) => dayA.localeCompare(dayB))
      .map(([day, items]): CalendarPageAgendaGroup => ({
        day,
        label: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
          new Date(`${day}T00:00:00`),
        ),
        items: items.toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
      }));
  });

  /** Whether the last feed read failed. */
  protected readonly loadFailed: Signal<boolean> = computed<boolean>(
    () => this.store.queryError() !== null,
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads the displayed window on arrival and on every navigation, loads the
   * facility options for the event dialog, and closes each dialog once its
   * own write settles successfully — the store's own re-read of the loaded
   * window (see `CalendarFeedStore`) is what makes the new/changed/removed
   * entry show up, this page only owns the dialogs' visibility.
   *
   * @access public
   * @since 2.2.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const anchor: Date = this.month();
      const granularity: CalendarGranularity = this.granularity();
      this.firstDayOfWeek();

      untracked((): void => {
        if (!isPlatformBrowser(this.platformId)) return;

        this.store.load(this.windowOf(organizationId, anchor, granularity));
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
      const organizationId: string = this.organizationId();

      untracked((): void => {
        if (!isPlatformBrowser(this.platformId)) return;

        this.facilityService
          .list(organizationId, { itemsPerPage: FACILITY_OPTIONS_PAGE_SIZE })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((response) => {
            this.facilityOptions.set(
              response.member.map((facility) => ({ label: facility.name, value: facility.id })),
            );
          });
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
        if (callState.status !== 'success') return;

        this.pendingDeleteEvent.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @description Re-reads the displayed window after a failure.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load(this.windowOf(this.organizationId(), this.month(), this.granularity()));
  }

  /**
   * Method switchGranularity
   * @description The toolbar's Month/Week/Day tab handler — the anchor stays, so the new granularity shows the period containing it.
   * @access protected
   * @since 2.2.0
   * @param {CalendarGranularity} granularity - The activated granularity.
   * @returns {void}
   */
  protected switchGranularity(granularity: CalendarGranularity): void {
    this.granularity.set(granularity);
  }

  /**
   * Method onGranularityTabActivated
   * @description Narrows `hlm-tabs`' plain-string `tabActivated` payload to {@link CalendarGranularity} before delegating to {@link switchGranularity}.
   * @access protected
   * @since 2.4.0
   * @param {string} tab - The `hlm-tabs` id that just activated.
   * @returns {void}
   */
  protected onGranularityTabActivated(tab: string): void {
    if (tab === 'month' || tab === 'week' || tab === 'day') this.switchGranularity(tab);
  }

  /**
   * Method goToday
   * @description Re-anchors the toolbar on today's period and selects today.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected goToday(): void {
    const today: Date = new Date();
    this.month.set(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    this.selectedDay.set(toIsoDay(today));
  }

  /**
   * Method stepPeriod
   * @description Moves the toolbar's anchor one period — month, week, or day per {@link granularity} — backwards or forwards.
   * @access protected
   * @since 2.2.0
   * @param {number} offset - `-1` or `1`.
   * @returns {void}
   */
  protected stepPeriod(offset: number): void {
    const current: Date = this.month();

    switch (this.granularity()) {
      case 'month':
        this.month.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
        return;
      case 'week':
        this.month.set(
          new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset * 7),
        );
        return;
      case 'day':
        this.month.set(
          new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset),
        );
    }
  }

  /**
   * Method startOfWeekOf
   * @description Local midnight on the first day of the anchor's week, honouring {@link firstDayOfWeek}.
   * @access private
   * @since 2.2.0
   * @param {Date} anchor - Any date inside the week.
   * @returns {Date} The week's first day.
   */
  private startOfWeekOf(anchor: Date): Date {
    const offset: number =
      this.firstDayOfWeek() === 'monday' ? (anchor.getDay() + 6) % 7 : anchor.getDay();

    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
  }

  /**
   * Method windowOf
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
    switch (granularity) {
      case 'month':
        return {
          organizationId,
          from: new Date(anchor.getFullYear(), anchor.getMonth(), 1 - 7).toISOString(),
          to: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 7, 23, 59, 59).toISOString(),
        };
      case 'week': {
        const start: Date = this.startOfWeekOf(anchor);

        return {
          organizationId,
          from: start.toISOString(),
          to: new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate() + 6,
            23,
            59,
            59,
          ).toISOString(),
        };
      }
      case 'day':
        return {
          organizationId,
          from: new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).toISOString(),
          to: new Date(
            anchor.getFullYear(),
            anchor.getMonth(),
            anchor.getDate(),
            23,
            59,
            59,
          ).toISOString(),
        };
    }
  }

  /**
   * Method openCreateDialog
   * @description Opens the event dialog in create mode.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected openCreateDialog(): void {
    this.createDefaultStart.set(null);
    this.editingEvent.set(null);
    this.eventDialogVisible.set(true);
  }

  /**
   * Method onCreateRequested
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
    if (!this.canWriteEvents()) return;

    this.createDefaultStart.set(`${day}T${QUICK_CREATE_DEFAULT_TIME}`);
    this.editingEvent.set(null);
    this.eventDialogVisible.set(true);
  }

  /**
   * Method createOnDayAriaLabelOf
   * @description A week/day section's quick-create button's accessible name, dated so repeated sections stay distinguishable.
   * @access protected
   * @since 2.2.0
   * @param {string} label - The section's localized full date.
   * @returns {string} The localized dated label.
   */
  protected createOnDayAriaLabelOf(label: string): string {
    return $localize`:@@calendar.createOnDayAria:New event on ${label}:date:`;
  }

  /**
   * Method onEventDropped
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

    const start: Date = new Date(item.startsAt);
    const target: Date = new Date(`${drop.day}T00:00:00`);
    const moved: Date = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
      start.getHours(),
      start.getMinutes(),
      start.getSeconds(),
    );
    if (moved.getTime() === start.getTime()) return;

    const deltaMs: number = moved.getTime() - start.getTime();
    const endsAt: string | undefined = item.endsAt
      ? toApiDateTime(new Date(new Date(item.endsAt).getTime() + deltaMs))
      : undefined;

    this.store.moveEvent({
      organizationId: this.organizationId(),
      eventId: item.id,
      startsAt: toApiDateTime(moved),
      ...(endsAt !== undefined ? { endsAt } : {}),
    });

    const eventTitle: string = item.title;
    const dayLabel: string = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
      target,
    );
    this.moveAnnouncement.set(
      $localize`:@@calendar.moveAnnounce:${eventTitle}:eventTitle: moved to ${dayLabel}:date:`,
    );
  }

  /**
   * Method openEditDialog
   * @description Opens the event dialog seeded with the given `calendar_event` entry.
   * @access protected
   * @since 1.2.0
   * @param {CalendarFeedItemOutput} item - The entry to edit.
   * @returns {void}
   */
  protected openEditDialog(item: CalendarFeedItemOutput): void {
    this.editingEvent.set(item);
    this.eventDialogVisible.set(true);
  }

  /**
   * Method onEventDialogVisibleChanged
   * @description Closes the event dialog on any dismissal, clearing the record it was editing.
   * @access protected
   * @since 1.2.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onEventDialogVisibleChanged(visible: boolean): void {
    this.eventDialogVisible.set(visible);
    if (!visible) {
      this.editingEvent.set(null);
      this.createDefaultStart.set(null);
    }
  }

  /**
   * Method onEventFormSubmitted
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
   * @description Opens the Delete confirmation for a `calendar_event` entry.
   * @access protected
   * @since 1.2.0
   * @param {CalendarFeedItemOutput} item - The entry whose deletion was requested.
   * @returns {void}
   */
  protected requestDelete(item: CalendarFeedItemOutput): void {
    this.pendingDeleteEvent.set(item);
  }

  /**
   * Method onDeleteDialogVisibleChanged
   * @description Clears the pending target on any dismissal.
   * @access protected
   * @since 1.2.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onDeleteDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.pendingDeleteEvent.set(null);
  }

  /**
   * Method confirmDelete
   * @description Sends the delete write for the pending target. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected confirmDelete(): void {
    const item: CalendarFeedItemOutput | null = this.pendingDeleteEvent();
    if (!item) return;

    this.store.deleteEvent({ organizationId: this.organizationId(), eventId: item.id });
  }

  /**
   * Method settleEventDialogWrite
   * @description Closes the event dialog once its own write — create or edit — succeeds; a rejection is left for the dialog's own inline error to render.
   * @access private
   * @since 1.2.0
   * @param {CallState<CalendarEventOutput>} callState - The write's call state.
   * @returns {void}
   */
  private settleEventDialogWrite(callState: CallState<CalendarEventOutput>): void {
    if (callState.status !== 'success') return;

    this.eventDialogVisible.set(false);
    this.editingEvent.set(null);
  }

  /**
   * Method buildUpdatePatch
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
 * @access private
 * @since 1.2.0
 * @param {string | null} a - The first ISO instant, or `null`.
 * @param {string | null} b - The second ISO instant, or `null`.
 * @returns {boolean} Whether both represent the same instant — string equality would false-positive on differing timezone offsets.
 */
function isSameInstant(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;

  return new Date(a).getTime() === new Date(b).getTime();
}
