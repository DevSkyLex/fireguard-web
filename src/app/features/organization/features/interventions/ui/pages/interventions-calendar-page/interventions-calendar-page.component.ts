import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideCircleAlert } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import {
  resolveInterventionTag,
  type InterventionCalendarFilters,
  type InterventionListFilters,
  type InterventionListOptions,
  type InterventionOutput,
} from '@features/organization/features/interventions/models';
import {
  buildInterventionListOptions,
  parseInterventionListFilters,
} from '@features/organization/features/interventions/utils';
import { Calendar, toIsoDay, type CalendarDisplayEvent } from '@shared/calendar';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmButtonGroupImports } from '@shared/ui/button-group';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSkeleton } from '@shared/ui/skeleton';
import {
  InterventionCalendarStore,
  type InterventionCalendarStoreType,
} from '../../../state/intervention-calendar';
import { InterventionCalendarEntryList } from '../../components/intervention-calendar-entry-list';
import { INTERVENTION_CALENDAR_EVENT_TONE } from './constants';

/** How many chips the shared month grid shows per day before collapsing the rest — mirrors `Calendar`'s own `MAX_CHIPS_PER_DAY`, not exported, so a genuine third consumer would warrant sharing it. */
const GRID_CHIP_CAP = 2;

/** A fixed dummy sort — {@link buildInterventionListOptions} always needs one, but its `order` output is never read here; the calendar's date placement, not a server sort, decides what a reader sees. */
const DUMMY_SORT = { field: 'dueAt', direction: 'asc' } as const;

/**
 * Type InterventionCalendarPageAgendaGroup
 *
 * @description
 * One day's worth of the agenda the page renders below `md` — the same
 * window the month grid shows above it, grouped by local day since the
 * shrunken grid does not render there (`FEATURE.md`).
 *
 * @since 1.0.0
 */
type InterventionCalendarPageAgendaGroup = {
  readonly day: string;
  readonly label: string;
  readonly items: readonly InterventionOutput[];
  readonly overflow: number;
};

/**
 * Component InterventionsCalendarPage
 * @class InterventionsCalendarPage
 *
 * @description
 * The Calendar view over the same organization interventions dataset the
 * List and Board render — the third and last view PRODUCT.md's "List /
 * Board / Calendar over one shared dataset" promise names, and the one that
 * had shipped dormant (`InterventionCalendarStore`,
 * `InterventionService.listCalendarWindow`) since the store never had a
 * page to drive it. A sibling leaf under the interventions feature's
 * pathless parent, registered before `:interventionId` — same reason the
 * board is — but this view does **not** share `InterventionStore`: the
 * List/Board pair reads one server page (`page`/`itemsPerPage`), while the
 * calendar reads a bounded date window instead, an incompatible shape for
 * the same entity cache, so it owns its own component-scoped
 * `InterventionCalendarStore`.
 *
 * **Placement anchor.** Each intervention is placed on the day of its
 * schedule anchor — `plannedStartAt`, falling back to `dueAt` — the exact
 * anchor `InterventionService.listCalendarWindow` already fetches by. An
 * intervention with neither bound set renders nowhere on the grid.
 *
 * **The month grid is `@shared/calendar`'s `Calendar`, reused read-only and
 * unmodified** — a genuinely domain-agnostic shared concept
 * (`ARCHITECTURE.md` §2.7), already used this exact way by
 * `organization/features/calendar`. Its own chips are non-interactive
 * (`hlmBadge`); selecting a day is what reveals every entry, each a real
 * link, in {@link InterventionCalendarEntryList} below the grid (desktop) or
 * in the agenda (mobile) — the same responsive split
 * `organization/features/calendar`'s own `CalendarPage` established, mirrored
 * here rather than reused across the feature boundary: the row shape needs
 * the intervention status tag registry, which `shared/calendar` must never
 * import.
 *
 * **Filters.** Every narrowing the URL carries round-trips into this page —
 * unlike the Board, `status` travels too: the calendar has no columns for it
 * to conflict with, so narrowing the month to one or a few statuses is a
 * legitimate way to read it. `priority`, `label` and the due/planned-start
 * range chips are silently dropped when building the store's own
 * {@link InterventionCalendarFilters} — the store's narrowing is a `Pick` of
 * `status`/`type`/`site`/`responsible` only, and the visible window already
 * is the date filter, so no date-range narrowing is meaningful here anyway.
 * `mine` is **not** sent to the server: the store resolves the signed-in
 * member's IRI once and this page filters the loaded window to it
 * client-side (`visibleInterventions`), exactly the split
 * `InterventionCalendarState`'s own doc describes. This first cut offers no
 * in-page filter control of its own — only the search box, mirroring the
 * Board's own stated trade-off — the URL is the only way to narrow it.
 *
 * **Overflow.** The grid's own per-day chip cap ({@link GRID_CHIP_CAP})
 * never hides an entry from the reader: selecting the day always lists every
 * one of its entries. When a day holds more than the grid shows, its
 * entry list additionally offers a "See all in list" link, narrowing the
 * List view to that single day via the existing `dueAfter`/`dueBefore`
 * contract (`ARCHITECTURE.md`'s list filter bar) — stated trade-off: an
 * intervention placed here by `plannedStartAt` alone (no `dueAt` landing on
 * that day) will not appear in the linked list, since the list has no
 * "planned start equals this day" shortcut of its own.
 *
 * Browser-only loading: the window read is a dated, authenticated read that
 * would immediately refetch after hydration (`ARCHITECTURE.md` §12.5-3).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-calendar-page',
  imports: [
    RouterLink,
    Calendar,
    InterventionCalendarEntryList,
    NgIcon,
    CollectionToolbar,
    CollectionSearchBox,
    ErrorState,
    HlmButton,
    HlmSkeleton,
    ...HlmButtonGroupImports,
    ...HlmCardImports,
  ],
  providers: [
    InterventionCalendarStore,
    provideIcons({ lucideChevronLeft, lucideChevronRight, lucideCircleAlert }),
  ],
  templateUrl: './interventions-calendar-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionsCalendarPage {
  //#region Inputs
  /** The workspace whose calendar is shown, from the route. */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** The search term the URL carries. */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The status filter the URL carries — unlike the Board, honored here. */
  public readonly status: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The type filter the URL carries. */
  public readonly type: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The priority filter the URL carries — round-tripped, not sent to the store (see class doc). */
  public readonly priority: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The site filter the URL carries, as a raw facility id. */
  public readonly site: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The responsible filter the URL carries, as a raw member id. */
  public readonly responsible: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The label filter the URL carries, as a raw label id — round-tripped, not sent to the store. */
  public readonly label: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** `?mine=1` narrows to the signed-in member, applied client-side (see class doc). */
  public readonly mine: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The named due-date window the URL carries — round-tripped, not sent to the store. */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The "Deadline" narrowing's lower bound — round-tripped, not sent to the store. */
  public readonly dueAfter: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The "Deadline" narrowing's upper bound — round-tripped, not sent to the store. */
  public readonly dueBefore: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The "Planned start" narrowing's lower bound — round-tripped, not sent to the store. */
  public readonly plannedStartAfter: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The "Planned start" narrowing's upper bound — round-tripped, not sent to the store. */
  public readonly plannedStartBefore: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  //#endregion

  //#region Properties
  /** The bounded-window dataset for this view. */
  protected readonly store: InterventionCalendarStoreType =
    inject<InterventionCalendarStoreType>(InterventionCalendarStore);

  private readonly platformId: object = inject(PLATFORM_ID);

  private readonly locale: string = inject(LOCALE_ID);

  /** Anchor of the displayed month, driven by the toolbar and the grid. */
  protected readonly month: WritableSignal<Date> = signal<Date>(new Date());

  /** The selected day (`yyyy-MM-dd`), today on arrival. */
  protected readonly selectedDay: WritableSignal<string | null> = signal<string | null>(
    toIsoDay(new Date()),
  );

  /** What the search box holds, before it reaches the URL. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The narrowing the URL carries, parsed the same way the List and Board pages parse it. */
  protected readonly filters: Signal<InterventionListFilters> = computed<InterventionListFilters>(
    () =>
      parseInterventionListFilters(
        {
          status: this.status(),
          type: this.type(),
          priority: this.priority(),
          site: this.site(),
          responsible: this.responsible(),
          label: this.label(),
          mine: this.mine(),
          due: this.due(),
          dueAfter: this.dueAfter(),
          dueBefore: this.dueBefore(),
          plannedStartAfter: this.plannedStartAfter(),
          plannedStartBefore: this.plannedStartBefore(),
        },
        this.organizationId(),
      ),
  );

  /** Where a row's link points. */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /** Every query param the List view should keep when the operator switches to it — `status` travels, unlike the Board's own exclusion. */
  protected readonly listQueryParams: Signal<Readonly<Record<string, string | null>>> = computed(
    (): Readonly<Record<string, string | null>> => ({
      q: this.q() ?? null,
      status: this.status() ?? null,
      type: this.type() ?? null,
      priority: this.priority() ?? null,
      site: this.site() ?? null,
      responsible: this.responsible() ?? null,
      label: this.label() ?? null,
      mine: this.mine() ?? null,
      due: this.due() ?? null,
      dueAfter: this.dueAfter() ?? null,
      dueBefore: this.dueBefore() ?? null,
      plannedStartAfter: this.plannedStartAfter() ?? null,
      plannedStartBefore: this.plannedStartBefore() ?? null,
    }),
  );

  /** Every query param the Board view should keep when the operator switches to it — `status` excluded, the same rule the List page applies. */
  protected readonly boardQueryParams: Signal<Readonly<Record<string, string | null>>> = computed(
    (): Readonly<Record<string, string | null>> => ({
      q: this.q() ?? null,
      type: this.type() ?? null,
      priority: this.priority() ?? null,
      site: this.site() ?? null,
      responsible: this.responsible() ?? null,
      label: this.label() ?? null,
      mine: this.mine() ?? null,
      due: this.due() ?? null,
      dueAfter: this.dueAfter() ?? null,
      dueBefore: this.dueBefore() ?? null,
      plannedStartAfter: this.plannedStartAfter() ?? null,
      plannedStartBefore: this.plannedStartBefore() ?? null,
    }),
  );

  /** The loaded window, scoped to "Mine" client-side when the URL asks for it — see class doc. */
  protected readonly visibleInterventions: Signal<readonly InterventionOutput[]> = computed(
    (): readonly InterventionOutput[] => {
      const interventions: readonly InterventionOutput[] = this.store.interventions();
      if (!this.filters().mine) return interventions;

      const memberIri: string | null = this.store.currentMemberIri();
      if (memberIri === null) return interventions;

      return interventions.filter(
        (intervention: InterventionOutput): boolean =>
          intervention.responsible === memberIri || intervention.participants.includes(memberIri),
      );
    },
  );

  /** Every visible intervention that carries a schedule anchor, keyed by its local day. */
  private readonly interventionsByDay: Signal<ReadonlyMap<string, readonly InterventionOutput[]>> =
    computed((): ReadonlyMap<string, readonly InterventionOutput[]> => {
      const grouped = new Map<string, InterventionOutput[]>();
      for (const intervention of this.visibleInterventions()) {
        const anchor: string | null = this.anchorOf(intervention);
        if (anchor === null) continue;

        const day: string = toIsoDay(new Date(anchor));
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
   * The loaded window's entries grouped by local day, earliest day and
   * earliest anchor first — the agenda's day sections below `md`, where the
   * shrunken month grid does not render.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly InterventionCalendarPageAgendaGroup[]>}
   */
  protected readonly agendaGroups: Signal<readonly InterventionCalendarPageAgendaGroup[]> =
    computed((): readonly InterventionCalendarPageAgendaGroup[] =>
      [...this.interventionsByDay().entries()]
        .toSorted(([dayA], [dayB]) => dayA.localeCompare(dayB))
        .map(([day, items]): InterventionCalendarPageAgendaGroup => ({
          day,
          label: new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' }).format(
            new Date(`${day}T00:00:00`),
          ),
          items,
          overflow: Math.max(0, items.length - GRID_CHIP_CAP),
        })),
    );

  /** Whether the calendar is loading its first window. */
  protected readonly loading: Signal<boolean> = this.store.loading;

  /** The last window read's error, when any. */
  protected readonly loadError: Signal<StoreError | null> = this.store.loadError;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Loads the displayed window on arrival and whenever the month, the
   * organization or the URL's narrowing changes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      const anchor: Date = this.month();
      const filters: InterventionListFilters = this.filters();

      untracked((): void => {
        if (!isPlatformBrowser(this.platformId)) return;

        this.store.load({
          organizationId,
          window: this.windowOf(anchor),
          filters: this.toCalendarFilters(filters),
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /** Re-reads the displayed window after a failure. */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      window: this.windowOf(this.month()),
      filters: this.toCalendarFilters(this.filters()),
    });
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

  /** The search box's value changed — held locally; this first cut has no server-side name search on the calendar (see class doc). */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /** The query params of the List view filtered to a single day, via the existing `dueAfter`/`dueBefore` contract. */
  protected dayListQueryParams(day: string): Readonly<Record<string, string>> {
    return { dueAfter: day, dueBefore: day };
  }

  /**
   * Method windowOf
   *
   * @description
   * The bounded date window the store fetches — the displayed month, one
   * month either side, so the grid's leading/trailing filler days from the
   * neighboring months are covered too. Over-fetching a few days at the
   * edges is harmless (`InterventionCalendarStore`'s own doc).
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Date} anchor - Any date inside the displayed month.
   *
   * @returns {{ after: Date; before: Date }} The window to fetch.
   */
  private windowOf(anchor: Date): { readonly after: Date; readonly before: Date } {
    return {
      after: new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1),
      before: new Date(anchor.getFullYear(), anchor.getMonth() + 2, 0, 23, 59, 59),
    };
  }

  /**
   * Method toCalendarFilters
   *
   * @description
   * Narrows the URL's full filter set down to the four fields
   * `InterventionCalendarFilters` accepts, reusing
   * {@link buildInterventionListOptions} rather than duplicating its
   * `equals`/`isAnyOf` folding logic — the sort and search it also computes
   * are discarded, since the store neither sorts nor searches.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionListFilters} filters - The URL's active narrowing.
   *
   * @returns {InterventionCalendarFilters} The narrowing the store accepts.
   */
  private toCalendarFilters(filters: InterventionListFilters): InterventionCalendarFilters {
    const options: InterventionListOptions = buildInterventionListOptions(
      filters,
      DUMMY_SORT,
      '',
      new Date(),
    );

    return {
      status: options.status,
      type: options.type,
      site: options.site,
      responsible: options.responsible,
    };
  }

  /** The intervention's schedule anchor — `plannedStartAt`, falling back to `dueAt` — the same anchor the endpoint fetches by. */
  private anchorOf(intervention: InterventionOutput): string | null {
    return intervention.plannedStartAt ?? intervention.dueAt;
  }
  //#endregion
}
