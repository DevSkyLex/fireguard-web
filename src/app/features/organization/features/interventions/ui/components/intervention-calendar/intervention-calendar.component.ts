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

/** How many chips the shared month grid shows per day before collapsing the rest — mirrors `Calendar`'s own `MAX_CHIPS_PER_DAY`, not exported, so a genuine third consumer would warrant sharing it. */
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
 */
type InterventionCalendarAgendaGroup = {
  readonly day: string;
  readonly label: string;
  readonly isToday: boolean;
  readonly items: readonly InterventionOutput[];
  readonly overflow: number;
};

/**
 * Component InterventionCalendar
 * @class InterventionCalendar
 *
 * @description
 * The Calendar view over the interventions `InterventionsPage` also renders
 * as a table and a board — the third and last view PRODUCT.md's "List /
 * Board / Calendar over one shared dataset" promise names.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): it injects no store and calls no
 * service. {@link interventions} is the bounded date window
 * `InterventionCalendarStore` already loaded — the page owns that store
 * (component-scoped on `InterventionsPage`, since only a page may inject
 * one) and re-fetches whenever {@link monthChanged} reports a new anchor.
 * {@link reloadRequested} is the only other write path out, for the error
 * state's "Try again".
 *
 * **Placement anchor.** Each intervention is placed on the day of its
 * schedule anchor — `plannedStartAt`, falling back to `dueAt` — the exact
 * anchor `InterventionService.listCalendarWindow` already fetches by. An
 * intervention with neither bound set renders nowhere on the grid.
 *
 * **The month grid is `@shared/calendar`'s `Calendar`, reused read-only and
 * unmodified** — a genuinely domain-agnostic shared concept
 * (`ARCHITECTURE.md` §2.7). Its own chips are non-interactive (`hlmBadge`);
 * selecting a day is what reveals every entry, each a real link, in
 * {@link InterventionCalendarEntryList} below the grid (desktop) or in the
 * agenda (mobile).
 *
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
   * @description Selected-day template projected into the dashboard's contextual slot by the owning page.
   * @access public
   * @since 1.0.0
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  public readonly dayPanelTemplate: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('dayPanel');

  //#region Inputs
  /** The bounded-window dataset the page's `InterventionCalendarStore` loaded. */
  public readonly interventions: InputSignal<readonly InterventionOutput[]> = input<
    readonly InterventionOutput[]
  >([]);

  /** Whether the window is currently loading. */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /** The last window read's error, when any. */
  public readonly loadError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /** `?mine=1` narrows the window client-side to the signed-in member (responsible OR participant). */
  public readonly mine: InputSignal<boolean> = input<boolean>(false);

  /** The signed-in member's IRI, resolving {@link mine} — `null` while unresolved, which disables the scope rather than showing an empty calendar. */
  public readonly currentMemberIri: InputSignal<string | null> = input<string | null>(null);

  /** The workspace whose calendar is shown, for the "See all in list" link and the entry list's own row links. */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** The day the rendered week starts on — the organization's regional preference, mapped by the page. */
  public readonly firstDayOfWeek: InputSignal<CalendarFirstDayOfWeek> =
    input<CalendarFirstDayOfWeek>('monday');
  //#endregion

  //#region Outputs
  /** The displayed anchor changed — emitted once on creation and again on every navigation, so the page knows which window to fetch. */
  public readonly monthChanged: OutputEmitterRef<Date> = output<Date>();

  /** The error state's "Try again" asked for the current window to be re-fetched. */
  public readonly reloadRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  private readonly locale: string = inject(LOCALE_ID);

  /** Anchor of the displayed month, driven by the toolbar and the grid. */
  protected readonly month: WritableSignal<Date> = signal<Date>(new Date());

  /** Today's local day, resolved once so the agenda's "Today" marker cannot shift mid-session. */
  private readonly todayIso: string = toIsoDay(new Date());

  /** One placeholder per grid loading cell — a 7-by-5 month shape, the widest a month view ever draws. */
  protected readonly skeletonGridCells: readonly number[] = Array.from({ length: 35 }, (_, i) => i);

  /** One placeholder per agenda loading group. */
  protected readonly skeletonAgendaGroups: readonly number[] = [0, 1, 2];

  /** The selected day (`yyyy-MM-dd`), today on arrival. */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    toIsoDay(new Date()),
  );

  /** Where a row's link points. */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /** The loaded window, scoped to "Mine" client-side when asked — see class doc. */
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
   * Every visible intervention that carries a schedule anchor, keyed by its
   * calendar day. `plannedStartAt` and `dueAt` are date-only values (UTC
   * midnight), so the day is read directly off the anchor's own written
   * `YYYY-MM-DD` characters rather than through `new Date(anchor)` and a
   * local-timezone read — that would shift the day for a browser west of
   * UTC even though the value was never meant to carry a time at all.
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

  /** Every visible intervention mapped onto the shared calendar's generic chips. */
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
   * @description The toolbar's "Month Year" label — the grid's own title, hidden, mirrors it.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly periodLabel: Signal<string> = computed<string>(() =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.month()),
  );

  /** The selected day's entries, earliest anchor first. */
  protected readonly dayItems: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] => {
      const day: string | null = this.selectedDay();
      if (day === null) return [];

      return this.interventionsByDay().get(day) ?? [];
    },
  );

  /** The selected day as a full localized heading. */
  protected readonly selectedDayLabel: Signal<string> = computed<string>(() => {
    const day: string | null = this.selectedDay();
    if (day === null) return '';

    return new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
      new Date(`${day}T00:00:00`),
    );
  });

  /** How many of the selected day's entries the grid's own chip cap leaves out. */
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
  /** Asks the page to re-fetch the current window after a failure. */
  protected reload(): void {
    this.reloadRequested.emit();
  }

  /** Re-anchors the toolbar on the current month and selects today. */
  protected goToday(): void {
    const today: Date = new Date();
    this.month.set(new Date(today.getFullYear(), today.getMonth(), 1));
    this.selectedDay.set(toIsoDay(today));
  }

  /** Moves the toolbar's anchor one month backwards or forwards. */
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

  /** The intervention's schedule anchor — `plannedStartAt`, falling back to `dueAt` — the same anchor the endpoint fetches by. */
  private anchorOf(intervention: InterventionOutput): string | null {
    return intervention.plannedStartAt ?? intervention.dueAt ?? null;
  }
  //#endregion
}
