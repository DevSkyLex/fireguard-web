import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideCircleAlert } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import {
  resolveInterventionTag,
  type InterventionOutput,
} from '@features/organization/features/interventions/models';
import {
  Calendar,
  toIsoDay,
  type CalendarDisplayEvent,
  type CalendarFirstDayOfWeek,
} from '@shared/calendar';
import { CollectionSkeletonCards } from '@shared/collection-surface';
import { StateIllustration } from '@shared/state-illustration';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmMarkerImports } from '@shared/ui/marker';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { InterventionCalendarEntryList } from '../intervention-calendar-entry-list';
import { INTERVENTION_CALENDAR_EVENT_TONE } from './constants';

/**
 * Constant GRID_CHIP_CAP
 *
 * @description
 * How many chips the shared month grid shows per day before collapsing the rest — mirrors
 * `Calendar`'s own `MAX_CHIPS_PER_DAY`, not exported, so a genuine third consumer would warrant
 * sharing it.
 */
const GRID_CHIP_CAP = 2;

/**
 * Type InterventionCalendarAgendaGroup
 *
 * @description
 * One day's worth of the agenda the component renders below `md` — the same
 * window the month grid shows above it, grouped by local day since the
 * shrunken grid does not render there (`FEATURE.md`).
 *
 * @since 1.0.0
 *
 * @type
 */
type InterventionCalendarAgendaGroup = {
  /**
   * Property day
   * @readonly
   *
   * @description
   * Identifies the calendar day that groups these entries.
   *
   * @access public
   *
   * @type {string}
   */
  readonly day: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Provides the text displayed to identify this intervention calendar agenda group.
   *
   * @access public
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property isToday
   * @readonly
   *
   * @description
   * Indicates whether this intervention calendar agenda group is today.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isToday: boolean;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Contains the interventions scheduled for this day.
   *
   * @access public
   *
   * @type {readonly InterventionOutput[]}
   */
  readonly items: readonly InterventionOutput[];

  /**
   * Property overflow
   * @readonly
   *
   * @description
   * Counts additional agenda entries that do not fit in the visible group.
   *
   * @access public
   *
   * @type {number}
   */
  readonly overflow: number;
};

/**
 * Class InterventionCalendar
 * @class InterventionCalendar
 *
 * @description
 * The Calendar view over the interventions `InterventionsPage` also renders
 * as a table and a board — the third and last view PRODUCT.md's "List /
 * Board / Calendar over one shared dataset" promise names.
 * Presentational (`ARCHITECTURE.md` §10.3): it injects no store and calls no
 * service. {@link interventions} is the bounded date window
 * `InterventionCalendarStore` already loaded — the page owns that store
 * (component-scoped on `InterventionsPage`, since only a page may inject
 * one) and re-fetches whenever {@link monthChanged} reports a new anchor.
 * {@link reloadRequested} is the only other write path out, for the error
 * state's "Try again".
 * **Placement anchor.** Each intervention is placed on the day of its
 * schedule anchor — `plannedStartAt`, falling back to `dueAt` — the exact
 * anchor `InterventionService.listCalendarWindow` already fetches by. An
 * intervention with neither bound set renders nowhere on the grid.
 * **The month grid is `@shared/calendar`'s `Calendar`, reused read-only and
 * unmodified** — a genuinely domain-agnostic shared concept
 * (`ARCHITECTURE.md` §2.7). Its own chips are non-interactive (`hlmBadge`);
 * selecting a day is what reveals every entry, each a real link, in
 * {@link InterventionCalendarEntryList} below the grid (desktop) or in the
 * agenda (mobile).
 * **Overflow.** The grid's own per-day chip cap ({@link GRID_CHIP_CAP})
 * never hides an entry from the reader: selecting the day always lists
 * every one of its entries. When a day holds more than the grid shows, its
 * entry list additionally offers a "See all in list" link, narrowing the
 * List view to that single day via the existing `dueAfter`/`dueBefore`
 * contract (`ARCHITECTURE.md`'s list filter bar).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-calendar',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    StateIllustration,
    RouterLink,
    Calendar,
    InterventionCalendarEntryList,
    CollectionSkeletonCards,
    HlmBadge,
    HlmButton,
    ...HlmMarkerImports,
    HlmSkeleton,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucideCircleAlert })],
  templateUrl: './intervention-calendar.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionCalendar {
  /**
   * Property dayPanelTemplate
   * @readonly
   *
   * @description
   * References the template rendered for the selected calendar day.
   * Selected-day template projected into the dashboard's contextual slot by the owning page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly dayPanelTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('dayPanel');

  //#region Inputs
  /**
   * Property interventions
   * @readonly
   *
   * @description
   * Supplies the loaded interventions displayed by the calendar.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<readonly InterventionOutput[]>}
   */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> = input<
    readonly InterventionOutput[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Indicates whether the calendar intervention window is loading.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loadError
   * @readonly
   *
   * @description
   * Holds the error returned while loading the calendar window.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly loadError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property mine
   * @readonly
   *
   * @description
   * Filters the calendar to interventions assigned to the current member.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly mine: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property currentMemberIri
   * @readonly
   *
   * @description
   * Supplies the current member IRI used by the personal-calendar filter.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberIri: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifies the organization used to build intervention detail routes.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property firstDayOfWeek
   * @readonly
   *
   * @description
   * Selects which weekday begins the calendar grid.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<CalendarFirstDayOfWeek>}
   */
  public readonly firstDayOfWeek: InputSignal<CalendarFirstDayOfWeek> =
    input<CalendarFirstDayOfWeek>('monday');
  //#endregion

  //#region Outputs
  /**
   * Property monthChanged
   * @readonly
   *
   * @description
   * Emits the displayed month when calendar navigation changes it.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<Date>}
   */
  public readonly monthChanged: OutputEmitterRef<Date> = output<Date>();

  /**
   * Property reloadRequested
   * @readonly
   *
   * @description
   * Requests a refresh of the currently displayed calendar window.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly reloadRequested: OutputEmitterRef<void> = output<void>();
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

  /**
   * Property month
   * @readonly
   *
   * @description
   * Tracks the month currently displayed in the calendar grid.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<Date>}
   */
  protected readonly month: WritableSignal<Date> = signal<Date>(new Date());

  /**
   * Property todayIso
   * @readonly
   *
   * @description
   * Stores today’s organization-local date in ISO day form.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly todayIso: string = toIsoDay(new Date());

  /**
   * Property skeletonGridCells
   * @readonly
   *
   * @description
   * Provides fixed cell indexes for the calendar loading skeleton.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonGridCells: readonly number[] = Array.from({ length: 35 }, (_, i) => i);

  /**
   * Property skeletonAgendaGroups
   * @readonly
   *
   * @description
   * Provides placeholder group indexes for the agenda loading skeleton.
   *
   * @access protected
   * @since unreleased
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonAgendaGroups: readonly number[] = [0, 1, 2];

  /**
   * Property selectedDay
   * @readonly
   *
   * @description
   * Tracks the selected calendar day as an ISO date string.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    toIsoDay(new Date()),
  );

  /**
   * Property detailRouteBase
   * @readonly
   *
   * @description
   * Builds the route prefix used to open an intervention from the calendar.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /**
   * Property visibleInterventions
   * @readonly
   *
   * @description
   * Applies the personal-calendar filter when the mine input is enabled.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly InterventionOutput[]>}
   */
  protected readonly visibleInterventions: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] => {
      const interventions: readonly InterventionOutput[] = this.interventions();
      if (!this.mine()) return interventions;

      const memberIri: string | null = this.currentMemberIri();
      if (memberIri === null) return interventions;

      return interventions.filter(
        (intervention: InterventionOutput): boolean =>
          intervention.responsible === memberIri || intervention.participants.includes(memberIri),
      );
    },
  );

  /**
   * Property interventionsByDay
   * @readonly
   *
   * @description
   * calendar day. `plannedStartAt` and `dueAt` are date-only values (UTC
   * midnight), so the day is read directly off the anchor's own written
   * `YYYY-MM-DD` characters rather than through `new Date(anchor)` and a
   * local-timezone read — that would shift the day for a browser west of
   * UTC even though the value was never meant to carry a time at all.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ReadonlyMap<string, readonly InterventionOutput[]>>}
   */
  private readonly interventionsByDay: Signal<ReadonlyMap<string, readonly InterventionOutput[]>> =
    computed((): ReadonlyMap<string, readonly InterventionOutput[]> => {
      const grouped = new Map<string, InterventionOutput[]>();
      for (const intervention of this.visibleInterventions()) {
        const anchor: string | null = this.anchorOf(intervention);
        if (anchor === null) continue;

        const day: string = anchor.slice(0, 10);
        const bucket: InterventionOutput[] = grouped.get(day) ?? [];
        bucket.push(intervention);
        grouped.set(day, bucket);
      }

      for (const [day, bucket] of grouped) {
        grouped.set(
          day,
          bucket.toSorted((a, b) => (this.anchorOf(a) ?? '').localeCompare(this.anchorOf(b) ?? '')),
        );
      }

      return grouped;
    });

  /**
   * Property events
   * @readonly
   *
   * @description
   * Converts visible interventions into dated, status-colored calendar events.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly CalendarDisplayEvent[]>}
   */
  protected readonly events: Signal<readonly CalendarDisplayEvent[]> = computed(
    (): readonly CalendarDisplayEvent[] =>
      this.visibleInterventions()
        .filter((intervention: InterventionOutput): boolean => this.anchorOf(intervention) !== null)
        .map((intervention: InterventionOutput): CalendarDisplayEvent => {
          const anchor: string = this.anchorOf(intervention) as string;

          return {
            id: intervention.id,
            date: anchor,
            label: `FG-${intervention.number} ${intervention.name}`,
            tone: INTERVENTION_CALENDAR_EVENT_TONE[
              resolveInterventionTag('status', intervention.status).severity
            ],
          };
        }),
  );

  /**
   * Property periodLabel
   * @readonly
   *
   * @description
   * The toolbar's "Month Year" label — the grid's own title, hidden, mirrors it.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly periodLabel: Signal<string> = computed<string>(() =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.month()),
  );

  /**
   * Property dayItems
   * @readonly
   *
   * @description
   * Returns interventions scheduled for the selected day.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly InterventionOutput[]>}
   */
  protected readonly dayItems: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] => {
      const day: string | null = this.selectedDay();
      if (day === null) return [];

      return this.interventionsByDay().get(day) ?? [];
    },
  );

  /**
   * Property selectedDayLabel
   * @readonly
   *
   * @description
   * Formats the selected day for the agenda heading.
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
   * Property selectedDayOverflow
   * @readonly
   *
   * @description
   * Counts selected-day items hidden after the grid chip limit.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly selectedDayOverflow: Signal<number> = computed<number>(() =>
    Math.max(0, this.dayItems().length - GRID_CHIP_CAP),
  );

  /**
   * Property agendaGroups
   * @readonly
   *
   * @description
   * The **displayed month's** entries grouped by local day, earliest day and
   * earliest anchor first — the agenda's day sections below `md`, where the
   * shrunken month grid does not render. The loaded window spans the
   * displayed month plus its neighbours so the grid can fill leading and
   * trailing cells; the agenda excludes those neighbouring days, or "Nothing
   * scheduled in {@link periodLabel}" would never show while they hold
   * entries.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionCalendarAgendaGroup[]>}
   */
  protected readonly agendaGroups: Signal<readonly InterventionCalendarAgendaGroup[]> = computed(
    (): readonly InterventionCalendarAgendaGroup[] => {
      const displayedMonth: string = toIsoDay(this.month()).slice(0, 7);

      return [...this.interventionsByDay().entries()]
        .filter(([day]) => day.startsWith(displayedMonth))
        .toSorted(([dayA], [dayB]) => dayA.localeCompare(dayB))
        .map(([day, items]): InterventionCalendarAgendaGroup => ({
          day,
          label: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
            new Date(`${day}T00:00:00`),
          ),
          isToday: day === this.todayIso,
          items,
          overflow: Math.max(0, items.length - GRID_CHIP_CAP),
        }));
    },
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reports the displayed anchor to the page once on creation — which is
   * also this view's first activation, since it only mounts behind
   * `hlmTabsContentLazy` — and again on every navigation, so the page's own
   * `InterventionCalendarStore.load` effect knows which window to fetch.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const month: Date = this.month();
      untracked((): void => this.monthChanged.emit(month));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method reload
   * @method reload
   *
   * @description
   * Requests fresh data for the currently displayed calendar window.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected reload(): void {
    this.reloadRequested.emit();
  }

  /**
   * Method goToday
   * @method goToday
   *
   * @description
   * Moves the calendar to the current month and selects today.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected goToday(): void {
    const today: Date = new Date();
    this.month.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.selectedDay.set(toIsoDay(today));
  }

  /**
   * Method stepMonth
   * @method stepMonth
   *
   * @description
   * Moves the displayed month by the supplied number of months.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} offset - Signed number of months to move.
   *
   * @returns {void}
   */
  protected stepMonth(offset: number): void {
    const current: Date = this.month();
    this.month.set(new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  /**
   * Method dayListQueryParams
   * @method dayListQueryParams
   *
   * @description
   * The query params the "See all in list" link opens with. Days are
   * bucketed on each intervention's own anchor — `plannedStartAt`, falling
   * back to `dueAt` — so this narrows the List view with the same anchor
   * every item on that day actually used: `plannedStartAfter`/`plannedStartBefore`
   * when the whole day is start-anchored, `dueAfter`/`dueBefore` otherwise.
   *
   * @access protected
   * @since 6.4.0
   *
   * @param {string} day - The `yyyy-MM-dd` day the link narrows to.
   *
   * @returns {Readonly<Record<string, string>>} The List view's query params for that day.
   */
  protected dayListQueryParams(day: string): Readonly<Record<string, string>> {
    return this.isDayStartAnchored(day)
      ? { plannedStartAfter: day, plannedStartBefore: day }
      : { dueAfter: day, dueBefore: day };
  }

  /**
   * Method isDayStartAnchored
   * @method isDayStartAnchored
   *
   * @description
   * Whether every intervention bucketed on `day` was placed there by its
   * `plannedStartAt`, so the "See all" link's label and query params can
   * agree on which anchor they actually narrow by.
   *
   * @access protected
   * @since 6.4.0
   *
   * @param {string} day - The `yyyy-MM-dd` day to check.
   *
   * @returns {boolean} True when the whole day is start-anchored.
   */
  protected isDayStartAnchored(day: string): boolean {
    const items: readonly InterventionOutput[] = this.interventionsByDay().get(day) ?? [];

    return (
      items.length > 0 &&
      items.every(
        (intervention: InterventionOutput): boolean => intervention.plannedStartAt != null,
      )
    );
  }

  /**
   * Method anchorOf
   * @method anchorOf
   *
   * @description
   * Selects the date used to place an intervention on the calendar.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Intervention whose calendar date is resolved.
   *
   * @returns {string | null} Planned start, due date, or null when neither is set.
   */
  private anchorOf(intervention: InterventionOutput): string | null {
    return intervention.plannedStartAt ?? intervention.dueAt ?? null;
  }
  //#endregion
}
