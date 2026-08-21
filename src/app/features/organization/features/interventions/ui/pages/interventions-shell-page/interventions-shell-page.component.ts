import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarClock,
  lucideCalendarDays,
  lucideCircleDot,
  lucideFlag,
  lucideMapPin,
  lucidePlus,
  lucideTag,
  lucideUser,
  lucideWrench,
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import {
  resolveInterventionTag,
  type InterventionDueRangeFilter,
  type InterventionFilterFieldKey,
  type InterventionFilterFieldOption,
  type InterventionListFilters,
  type InterventionPlannedStartRangeFilter,
  type InterventionPriority,
  type InterventionStatus,
  type InterventionType,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import {
  INTERVENTION_FILTER_FIELDS,
  INTERVENTION_PRIORITY_FILTER_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from '@features/organization/features/interventions/options';
import {
  parseInterventionListFilters,
  serializeInterventionListFilters,
} from '@features/organization/features/interventions/utils';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterOperator,
  type CollectionFilterOperatorChangedEvent,
} from '@shared/collection-filters';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { HlmButton } from '@shared/ui/button';
import { HlmButtonGroupImports } from '@shared/ui/button-group';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmTooltip } from '@shared/ui/tooltip';
import { InterventionPlanningOptionsStore } from '../../../state/intervention-planning-options';
import type { InterventionPlanningOptionsStoreType } from '../../../state/intervention-planning-options';
import { InterventionTag } from '../../components/intervention-tag';

/** How long typing settles before the search reaches the wire — mirrors the pre-shell `InterventionsPage`. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The narrowing "Clear filters" restores — none. */
const NO_FILTERS: InterventionListFilters = {
  status: null,
  type: null,
  priority: null,
  site: null,
  responsible: null,
  label: null,
  mine: false,
  dueWindow: null,
  dueRange: null,
  plannedStartRange: null,
};

/**
 * Type InterventionDueRangeOperator
 * @description The three operators the "Deadline" chip's own `dueRange` field declares. See the pre-shell `InterventionsPage`'s identically named type this one replaces.
 * @since 1.0.0
 */
type InterventionDueRangeOperator = 'greaterThan' | 'lessThan' | 'between';

/**
 * Type InterventionPlannedStartRangeOperator
 * @description The three operators the "Planned start" chip's own `plannedStartRange` field declares.
 * @since 1.0.0
 */
type InterventionPlannedStartRangeOperator = 'greaterThan' | 'lessThan' | 'between';

/**
 * Type InterventionEnumFilterKey
 * @description The six {@link InterventionFilterFieldKey} entries whose value discriminates its own operator by shape (a scalar under `equals`, a readonly array under `isAnyOf`).
 * @since 1.0.0
 */
type InterventionEnumFilterKey = 'status' | 'type' | 'priority' | 'site' | 'responsible' | 'label';

/**
 * Every {@link InterventionFilterFieldKey} — the default a leaf's own route
 * `data.honouredFilterKeys` falls back to when a leaf declares none, which no
 * leaf under this shell actually does (`interventions.routes.ts` declares one
 * for each of the three).
 */
const ALL_FILTER_FIELD_KEYS: readonly InterventionFilterFieldKey[] = INTERVENTION_FILTER_FIELDS.map(
  (field: InterventionFilterFieldOption): InterventionFilterFieldKey => field.key,
);

/**
 * Component InterventionsShellPage
 * @class InterventionsShellPage
 *
 * @description
 * The shared chrome for the interventions List/Board/Calendar trio: the
 * search box, the "My interventions"-adjacent filter toggle and bar (all
 * eight chips), the List/Board/Calendar switcher, and the "New intervention"
 * page action — one physical copy instead of the three each leaf used to
 * carry. Mounted as the `component:` of the pathless route that groups the
 * three leaves under `interventions.routes.ts`; a `<router-outlet />` renders
 * whichever leaf the URL currently names.
 *
 * It **writes** the URL's filter narrowing; it never reads a leaf's own
 * state, injects a leaf's store, or shares one through a service — each leaf
 * keeps independently **reading** the same URL through its own route-bound
 * inputs and `parseInterventionListFilters`, exactly as it did before this
 * shell existed. No parent-to-child channel exists between this component and
 * the leaves beyond that shared URL.
 *
 * A chip whose field the active leaf does not honour (Board ignores `status`;
 * Calendar ignores `priority`, `label` and both date ranges) still renders
 * when active, but disabled and greyed, with an `hlmTooltip` naming the
 * reason — never silently absent (the "+ Filter" menu still offers it) and
 * never silently applied (the leaf never actually sends it). Which keys a
 * leaf honours is declared on that leaf's own route `data.honouredFilterKeys`
 * (`interventions.routes.ts`), read here through the router's own
 * `NavigationEnd` stream rather than a component input, since the three
 * leaves are siblings of this shell, not its children in the input-binding
 * sense.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-shell-page',
  imports: [
    NgIcon,
    RouterLink,
    RouterOutlet,
    HlmButton,
    HlmTooltip,
    InterventionTag,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionSearchBox,
    CollectionToolbar,
    ...HlmButtonGroupImports,
    ...HlmDatePickerImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideCalendarClock,
      lucideCalendarDays,
      lucideCircleDot,
      lucideFlag,
      lucideMapPin,
      lucidePlus,
      lucideTag,
      lucideUser,
      lucideWrench,
    }),
  ],
  templateUrl: './interventions-shell-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionsShellPage {
  //#region Inputs
  /** The workspace whose interventions are shown, bound from the route. */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** The search term the URL carries. See `InterventionsPage.q` in the pre-shell history for the full rationale. */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The status filter the URL carries. */
  public readonly status: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The type filter the URL carries. */
  public readonly type: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The priority filter the URL carries. */
  public readonly priority: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The site filter the URL carries, as a raw facility id. */
  public readonly site: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The responsible filter the URL carries, as a raw member id. */
  public readonly responsible: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The label filter the URL carries, as a raw label id. */
  public readonly label: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** `?mine=1` narrows to the signed-in member — read here only so {@link filters} stays complete; the toggle chip itself stays on the List page's own remaining toolbar row (`FEATURE.md`). */
  public readonly mine: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The named due-date window the URL carries — the segmented views' and the Today page's own legacy preset. */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Deadline" chip lower bound, `YYYY-MM-DD`. */
  public readonly dueAfter: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Deadline" chip upper bound, `YYYY-MM-DD`. */
  public readonly dueBefore: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Planned start" chip lower bound, `YYYY-MM-DD`. */
  public readonly plannedStartAfter: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The filter bar's "Planned start" chip upper bound, `YYYY-MM-DD`. */
  public readonly plannedStartBefore: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  //#endregion

  //#region Properties
  /** Site, member and label choices for the filter bar's three IRI-valued chips. */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /** Round-trips `?q=` and every filter param this shell writes. */
  private readonly router: Router = inject(Router);

  /** Anchors the relative query-param navigations and reads the active leaf's own route `data`. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** Unsubscribes the search debounce if the shell is left mid-keystroke. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property pageActions
   * @readonly
   * @description The "New intervention" button, registered on the shell header — shared across all three leaves instead of the List page's own copy.
   * @access private
   * @since 1.0.0
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property activeView
   * @readonly
   * @description Which leaf is currently activated, read from the router's own `NavigationEnd` stream since the three leaves are this shell's sibling routes, not inputs it is bound to. Decides which of the switcher's three entries renders as the static `aria-current="page"` button rather than a link.
   * @access protected
   * @since 1.0.0
   * @type {Signal<'list' | 'board' | 'calendar'>}
   */
  protected readonly activeView: Signal<'list' | 'board' | 'calendar'> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): 'list' | 'board' | 'calendar' => this.readActiveView()),
    ),
    { initialValue: this.readActiveView() },
  );

  /**
   * Property honouredFilterKeys
   * @readonly
   * @description The active leaf's own declared `data.honouredFilterKeys` (`interventions.routes.ts`), read the same way {@link activeView} is. Falls back to every key when a leaf declares none — no leaf under this shell actually omits it.
   * @access protected
   * @since 1.0.0
   * @type {Signal<ReadonlySet<InterventionFilterFieldKey>>}
   */
  protected readonly honouredFilterKeys: Signal<ReadonlySet<InterventionFilterFieldKey>> = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((): ReadonlySet<InterventionFilterFieldKey> => this.readHonouredFilterKeys()),
    ),
    { initialValue: this.readHonouredFilterKeys() },
  );

  /** The narrowing the URL carries, parsed the same way every leaf parses its own copy. */
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

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The search as the debounce effect reads it: trimmed, never `undefined`. */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /** The filter bar's field catalog, forwarded to `app-collection-filter-bar` as-is. */
  protected readonly filterFields: readonly InterventionFilterFieldOption[] =
    INTERVENTION_FILTER_FIELDS;

  /** Status choices offered in the filter bar. */
  protected readonly statusOptions: SelectOption<InterventionStatus>[] =
    INTERVENTION_STATUS_FILTER_OPTIONS;

  /** Type choices offered in the filter bar. */
  protected readonly typeOptions: SelectOption<InterventionType>[] =
    INTERVENTION_TYPE_FILTER_OPTIONS;

  /** Priority choices offered in the filter bar. */
  protected readonly priorityOptions: SelectOption<InterventionPriority>[] =
    INTERVENTION_PRIORITY_FILTER_OPTIONS;

  /**
   * Property activeFilterKeys
   * @readonly
   * @description Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input and the filter-toggle's badge count.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly InterventionFilterFieldKey[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly InterventionFilterFieldKey[]> = computed<
    readonly InterventionFilterFieldKey[]
  >(() => {
    const filters: InterventionListFilters = this.filters();

    return INTERVENTION_FILTER_FIELDS.filter(
      (field: InterventionFilterFieldOption): boolean => filters[field.key] !== null,
    ).map((field: InterventionFilterFieldOption): InterventionFilterFieldKey => field.key);
  });

  /** Whether `app-collection-filter-bar` is currently mounted below the toolbar. See the pre-shell `InterventionsPage.filtersVisible`. */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** Which field's value selector currently renders forced open — `null` when none is. See the pre-shell `InterventionsPage.openFilterKey`. */
  protected readonly openFilterKey: WritableSignal<InterventionFilterFieldKey | null> =
    signal<InterventionFilterFieldKey | null>(null);

  /** The operator the "+ Filter" menu's picker last chose for one of the six `equals`/`isAnyOf` fields, remembered only while that field carries no value yet. */
  private readonly enumFilterOperatorOverrides: WritableSignal<
    Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>
  > = signal<Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>>({});

  /** The "Status" chip's value control, projected into the filter bar. */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /** The "Type" chip's value control, projected into the filter bar. */
  private readonly typeChipTemplate = viewChild<TemplateRef<unknown>>('typeChip');

  /** The "Priority" chip's value control, projected into the filter bar. */
  private readonly priorityChipTemplate = viewChild<TemplateRef<unknown>>('priorityChip');

  /** The "Site" chip's value control, projected into the filter bar. */
  private readonly siteChipTemplate = viewChild<TemplateRef<unknown>>('siteChip');

  /** The "Responsible" chip's value control, projected into the filter bar. */
  private readonly responsibleChipTemplate = viewChild<TemplateRef<unknown>>('responsibleChip');

  /** The "Label" chip's value control, projected into the filter bar. */
  private readonly labelChipTemplate = viewChild<TemplateRef<unknown>>('labelChip');

  /** The "Deadline" chip's value control, projected into the filter bar. */
  private readonly dueRangeChipTemplate = viewChild<TemplateRef<unknown>>('dueRangeChip');

  /** The "Planned start" chip's value control, projected into the filter bar. */
  private readonly plannedStartRangeChipTemplate =
    viewChild<TemplateRef<unknown>>('plannedStartRangeChip');

  /** Every filter field's value-control `TemplateRef`, keyed by {@link InterventionFilterFieldKey}, for `app-collection-filter-bar`'s `templates` input. */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({
    status: this.statusChipTemplate(),
    type: this.typeChipTemplate(),
    priority: this.priorityChipTemplate(),
    site: this.siteChipTemplate(),
    responsible: this.responsibleChipTemplate(),
    label: this.labelChipTemplate(),
    dueRange: this.dueRangeChipTemplate(),
    plannedStartRange: this.plannedStartRangeChipTemplate(),
  }));

  /** The "Deadline" chip's own currently-selected operator. See the pre-shell `InterventionsPage.dueRangeOperator`. */
  protected readonly dueRangeOperator: WritableSignal<InterventionDueRangeOperator> = linkedSignal<
    InterventionDueRangeFilter | null,
    InterventionDueRangeOperator
  >({
    source: () => this.filters().dueRange,
    computation: (
      dueRange: InterventionDueRangeFilter | null,
      previous,
    ): InterventionDueRangeOperator => dueRange?.operator ?? previous?.value ?? 'greaterThan',
  });

  /** The applied `dueRange`'s lower bound, when its operator carries one. */
  protected readonly dueRangeAfter: Signal<Date | null> = computed<Date | null>(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange && (dueRange.operator === 'greaterThan' || dueRange.operator === 'between')
      ? dueRange.after
      : null;
  });

  /** The applied `dueRange`'s upper bound, when its operator carries one. */
  protected readonly dueRangeBefore: Signal<Date | null> = computed<Date | null>(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange && (dueRange.operator === 'lessThan' || dueRange.operator === 'between')
      ? dueRange.before
      : null;
  });

  /** The applied `dueRange`'s bound pair, only while its operator is `between`. */
  protected readonly dueRangeBetween: Signal<[Date, Date] | undefined> = computed<
    [Date, Date] | undefined
  >(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange && dueRange.operator === 'between'
      ? [dueRange.after, dueRange.before]
      : undefined;
  });

  /** The "Planned start" chip's own currently-selected operator. See {@link dueRangeOperator}. */
  protected readonly plannedStartRangeOperator: WritableSignal<InterventionPlannedStartRangeOperator> =
    linkedSignal<InterventionPlannedStartRangeFilter | null, InterventionPlannedStartRangeOperator>(
      {
        source: () => this.filters().plannedStartRange,
        computation: (
          plannedStartRange: InterventionPlannedStartRangeFilter | null,
          previous,
        ): InterventionPlannedStartRangeOperator =>
          plannedStartRange?.operator ?? previous?.value ?? 'greaterThan',
      },
    );

  /** The applied `plannedStartRange`'s lower bound, when its operator carries one. See {@link dueRangeAfter}. */
  protected readonly plannedStartRangeAfter: Signal<Date | null> = computed<Date | null>(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange &&
      (plannedStartRange.operator === 'greaterThan' || plannedStartRange.operator === 'between')
      ? plannedStartRange.after
      : null;
  });

  /** The applied `plannedStartRange`'s upper bound, when its operator carries one. See {@link dueRangeBefore}. */
  protected readonly plannedStartRangeBefore: Signal<Date | null> = computed<Date | null>(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange &&
      (plannedStartRange.operator === 'lessThan' || plannedStartRange.operator === 'between')
      ? plannedStartRange.before
      : null;
  });

  /** The applied `plannedStartRange`'s bound pair, only while its operator is `between`. See {@link dueRangeBetween}. */
  protected readonly plannedStartRangeBetween: Signal<[Date, Date] | undefined> = computed<
    [Date, Date] | undefined
  >(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange && plannedStartRange.operator === 'between'
      ? [plannedStartRange.after, plannedStartRange.before]
      : undefined;
  });

  /** The currently active operator per field key, for `app-collection-filter-bar`'s `activeOperators` input. */
  protected readonly filterOperators: Signal<Readonly<Record<string, CollectionFilterOperator>>> =
    computed<Readonly<Record<string, CollectionFilterOperator>>>(() => ({
      dueRange: this.dueRangeOperator(),
      plannedStartRange: this.plannedStartRangeOperator(),
      status: this.enumFieldOperator('status'),
      type: this.enumFieldOperator('type'),
      priority: this.enumFieldOperator('priority'),
      site: this.enumFieldOperator('site'),
      responsible: this.enumFieldOperator('responsible'),
      label: this.enumFieldOperator('label'),
    }));

  /** Every query param a switch to List or Calendar keeps — both honour `status`. */
  protected readonly queryParamsWithStatus: Signal<Readonly<Record<string, string | null>>> =
    computed((): Readonly<Record<string, string | null>> => ({
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
    }));

  /** Every query param a switch to Board keeps, `status` excluded — the board's columns are the status narrowing. */
  protected readonly queryParamsWithoutStatus: Signal<Readonly<Record<string, string | null>>> =
    computed((): Readonly<Record<string, string | null>> => {
      const { status: _status, ...rest } = this.queryParamsWithStatus();

      return rest;
    });

  /** Names a status on a closed select trigger. */
  protected readonly statusLabelOf: (value: InterventionStatus) => string = (
    value: InterventionStatus,
  ): string => resolveInterventionTag('status', value).label;

  /** Names a type on a closed select trigger. */
  protected readonly typeLabelOf: (value: InterventionType) => string = (
    value: InterventionType,
  ): string => resolveInterventionTag('type', value).label;

  /** Names a priority on a closed select trigger. */
  protected readonly priorityLabelOf: (value: InterventionPriority) => string = (
    value: InterventionPriority,
  ): string => resolveInterventionTag('priority', value).label;

  /** Site names keyed by facility IRI. */
  private readonly siteDisplayMap: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.planningOptions
          .sites()
          .map((site: SelectOption): [string, string] => [site.value, site.label]),
      ),
  );

  /** Names a site IRI on a closed select trigger. */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteDisplayMap().get(value) ?? '';

  /** Members keyed by IRI. */
  private readonly memberDisplayMap: Signal<ReadonlyMap<string, MemberSelectOption>> = computed(
    (): ReadonlyMap<string, MemberSelectOption> =>
      new Map(
        this.planningOptions
          .members()
          .map((member: MemberSelectOption): [string, MemberSelectOption] => [
            member.value,
            member,
          ]),
      ),
  );

  /** Names a member IRI on a closed select trigger. */
  protected readonly responsibleLabelOf: (value: string) => string = (value: string): string =>
    this.memberDisplayMap().get(value)?.label ?? '';

  /** The organization's intervention labels, as the filter select's options. */
  protected readonly labelOptions: Signal<readonly SelectOption[]> = computed<
    readonly SelectOption[]
  >(() =>
    this.planningOptions.labels().map((label): SelectOption => ({
      value: `/api/intervention-labels/${label.id}`,
      label: label.name,
    })),
  );

  /** Labels keyed by IRI. */
  private readonly labelDisplayMap: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.labelOptions().map((option: SelectOption): [string, string] => [
          option.value,
          option.label,
        ]),
      ),
  );

  /** Names a label IRI on a closed select trigger. */
  protected readonly labelLabelOf: (value: string) => string = (value: string): string =>
    this.labelDisplayMap().get(value) ?? '';

  /**
   * Method multiLabel
   * @description Wraps one of the six `…LabelOf` single-item labellers for `hlm-select-multiple`'s `itemToString`. See the pre-shell `InterventionsPage.multiLabel`.
   * @access private
   * @since 1.0.0
   * @template T
   * @param {(value: T) => string} labelOf - The field's own single-item labeller.
   * @param {T | readonly T[]} value - Either one item's value or the select's whole current selection.
   * @returns {string} The label for one item, or the comma-joined labels for a selection.
   */
  private multiLabel<T>(labelOf: (value: T) => string, value: T | readonly T[]): string {
    return Array.isArray(value) ? value.map(labelOf).join(', ') : labelOf(value as T);
  }

  /** The "Status" chip's multi select `itemToString`. See {@link multiLabel}. */
  protected readonly statusMultiLabelOf: (
    value: InterventionStatus | readonly InterventionStatus[],
  ) => string = (value): string => this.multiLabel(this.statusLabelOf, value);

  /** The "Type" chip's multi select `itemToString`. See {@link multiLabel}. */
  protected readonly typeMultiLabelOf: (
    value: InterventionType | readonly InterventionType[],
  ) => string = (value): string => this.multiLabel(this.typeLabelOf, value);

  /** The "Priority" chip's multi select `itemToString`. See {@link multiLabel}. */
  protected readonly priorityMultiLabelOf: (
    value: InterventionPriority | readonly InterventionPriority[],
  ) => string = (value): string => this.multiLabel(this.priorityLabelOf, value);

  /** The "Site" chip's multi select `itemToString`. See {@link multiLabel}. */
  protected readonly siteMultiLabelOf: (value: string | readonly string[]) => string = (
    value,
  ): string => this.multiLabel(this.siteLabelOf, value);

  /** The "Responsible" chip's multi select `itemToString`. See {@link multiLabel}. */
  protected readonly responsibleMultiLabelOf: (value: string | readonly string[]) => string = (
    value,
  ): string => this.multiLabel(this.responsibleLabelOf, value);

  /** The "Label" chip's multi select `itemToString`. See {@link multiLabel}. */
  protected readonly labelMultiLabelOf: (value: string | readonly string[]) => string = (
    value,
  ): string => this.multiLabel(this.labelLabelOf, value);

  /** Names a filter chip's value segment, so each is distinguishable by screen reader. */
  protected readonly changeFilterLabel: (fieldLabel: string) => string = (
    fieldLabel: string,
  ): string => $localize`:@@intervention.list.changeFilter:Change filter: ${fieldLabel}:field:`;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @description Wires the search round-trip and registers the "New intervention" page action.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);

    effect((): void => {
      const term: string = this.searchTerm();
      untracked((): void => {
        if (term !== this.draftSearch()) this.draftSearch.set(term);
      });
    });

    toObservable(this.draftSearch)
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term: string): void => {
        if (term !== this.searchTerm()) this.navigateQuery({ q: term === '' ? null : term });
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.planningOptions.loadCreationOptions(organizationId);
      });
    });
  }
  //#endregion

  //#region Methods
  /** Reads which leaf is currently activated from the router's own snapshot. See {@link activeView}. */
  private readActiveView(): 'list' | 'board' | 'calendar' {
    const path: string | undefined = this.route.snapshot.firstChild?.routeConfig?.path;

    if (path === 'board') return 'board';
    if (path === 'calendar') return 'calendar';
    return 'list';
  }

  /** Reads the active leaf's own declared `data.honouredFilterKeys`. See {@link honouredFilterKeys}. */
  private readHonouredFilterKeys(): ReadonlySet<InterventionFilterFieldKey> {
    const declared: readonly InterventionFilterFieldKey[] | undefined = this.route.snapshot
      .firstChild?.data['honouredFilterKeys'] as readonly InterventionFilterFieldKey[] | undefined;

    return new Set(declared ?? ALL_FILTER_FIELD_KEYS);
  }

  /**
   * Method isFieldIgnored
   * @description Whether the active leaf does not honour a filter field — the chip still renders when active, but disabled and greyed rather than silently applied.
   * @access protected
   * @since 1.0.0
   * @param {InterventionFilterFieldKey} key - The field to check.
   * @returns {boolean} True when the active leaf ignores it.
   */
  protected isFieldIgnored(key: InterventionFilterFieldKey): boolean {
    return !this.honouredFilterKeys().has(key);
  }

  /**
   * Method ignoredReason
   * @description The tooltip explaining why an ignored chip is inert here — read only while {@link isFieldIgnored} is true for that key.
   * @access protected
   * @since 1.0.0
   * @param {InterventionFilterFieldKey} key - The ignored field.
   * @returns {string} The localized reason.
   */
  protected ignoredReason(key: InterventionFilterFieldKey): string {
    if (key === 'status') {
      return $localize`:@@intervention.shell.filterIgnoredStatus:Ignored here — the board's columns already narrow by status.`;
    }

    if (key === 'dueRange' || key === 'plannedStartRange') {
      return $localize`:@@intervention.shell.filterIgnoredDateRange:Ignored here — the visible month is already the date filter.`;
    }

    return $localize`:@@intervention.shell.filterIgnoredField:Ignored here — this view narrows only by status, type, site and responsible.`;
  }

  /** Merges query params into the URL without touching the path. */
  private navigateQuery(queryParams: Record<string, string | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Records a keystroke into the draft term the debounce watches. */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /** Replaces one narrowing. */
  protected applyFilter(patch: Partial<InterventionListFilters>): void {
    this.navigateQuery(serializeInterventionListFilters({ ...this.filters(), ...patch }));
  }

  /** The catalog entry for one field. See the pre-shell `InterventionsPage.filterFieldOption`. */
  protected filterFieldOption(key: InterventionFilterFieldKey): InterventionFilterFieldOption {
    return (
      INTERVENTION_FILTER_FIELDS.find(
        (field: InterventionFilterFieldOption): boolean => field.key === key,
      ) ?? { key, fieldLabel: '', icon: 'lucideCircleDot', operators: ['equals'] }
    );
  }

  /** Reacts to the filter bar's `fieldPicked` output. */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as InterventionFilterFieldKey);
  }

  /** Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing. */
  protected onFieldRemoved(key: string): void {
    this.applyFilter(this.filterClearPatchOf(key as InterventionFilterFieldKey));
  }

  /** Reacts to the filter bar's `operatorChanged` output. */
  protected onFilterOperatorChanged(event: CollectionFilterOperatorChangedEvent): void {
    if (event.key === 'dueRange') this.onDueRangeOperatorPicked(event.operator);
    if (event.key === 'plannedStartRange') this.onPlannedStartRangeOperatorPicked(event.operator);
    if (this.isEnumFilterKey(event.key)) this.onEnumFilterOperatorPicked(event.key, event.operator);
  }

  /** Narrows a filter bar field key to {@link InterventionEnumFilterKey}. */
  private isEnumFilterKey(key: string): key is InterventionEnumFilterKey {
    return (
      key === 'status' ||
      key === 'type' ||
      key === 'priority' ||
      key === 'site' ||
      key === 'responsible' ||
      key === 'label'
    );
  }

  /** The operator one of the six `equals`/`isAnyOf` fields currently reads. See the pre-shell `InterventionsPage.enumFieldOperator`. */
  protected enumFieldOperator(key: InterventionEnumFilterKey): 'equals' | 'isAnyOf' {
    const value: InterventionListFilters[InterventionEnumFilterKey] = this.filters()[key];

    if (Array.isArray(value)) return 'isAnyOf';
    if (value !== null) return 'equals';
    return this.enumFilterOperatorOverrides()[key] ?? 'equals';
  }

  /** Switches one of the six `equals`/`isAnyOf` fields' value control to the picked operator's own shape. */
  private onEnumFilterOperatorPicked(
    key: InterventionEnumFilterKey,
    operator: CollectionFilterOperator,
  ): void {
    if (operator !== 'equals' && operator !== 'isAnyOf') return;

    this.enumFilterOperatorOverrides.update(
      (
        overrides: Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>,
      ): Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>> => ({
        ...overrides,
        [key]: operator,
      }),
    );
    if (this.filters()[key] !== null) this.applyFilter(this.filterClearPatchOf(key));
  }

  /** Normalizes one of the six `equals`/`isAnyOf` fields' current value to a readonly array. */
  private toEnumValues<T>(value: T | readonly T[] | null): T[] {
    if (value === null) return [];
    return Array.isArray(value) ? [...(value as readonly T[])] : [value as T];
  }

  /** The `equals`-mode counterpart of {@link toEnumValues}. */
  private toScalarValue<T>(value: T | readonly T[] | null): T | null {
    return Array.isArray(value) ? null : (value as T | null);
  }

  /** The "Status" chip's currently checked values, for its multi select. */
  protected statusValues(): InterventionStatus[] {
    return this.toEnumValues(this.filters().status);
  }

  /** The "Status" chip's own scalar value, for its single select. */
  protected statusScalar(): InterventionStatus | null {
    return this.toScalarValue(this.filters().status);
  }

  /** The "Type" chip's currently checked values, for its multi select. */
  protected typeValues(): InterventionType[] {
    return this.toEnumValues(this.filters().type);
  }

  /** The "Type" chip's own scalar value, for its single select. */
  protected typeScalar(): InterventionType | null {
    return this.toScalarValue(this.filters().type);
  }

  /** The "Priority" chip's currently checked values, for its multi select. */
  protected priorityValues(): InterventionPriority[] {
    return this.toEnumValues(this.filters().priority);
  }

  /** The "Priority" chip's own scalar value, for its single select. */
  protected priorityScalar(): InterventionPriority | null {
    return this.toScalarValue(this.filters().priority);
  }

  /** The "Site" chip's currently checked values, for its multi select. */
  protected siteValues(): string[] {
    return this.toEnumValues(this.filters().site);
  }

  /** The "Site" chip's own scalar value, for its single select. */
  protected siteScalar(): string | null {
    return this.toScalarValue(this.filters().site);
  }

  /** The "Responsible" chip's currently checked values, for its multi select. */
  protected responsibleValues(): string[] {
    return this.toEnumValues(this.filters().responsible);
  }

  /** The "Responsible" chip's own scalar value, for its single select. */
  protected responsibleScalar(): string | null {
    return this.toScalarValue(this.filters().responsible);
  }

  /** The "Label" chip's currently checked values, for its multi select. */
  protected labelValues(): string[] {
    return this.toEnumValues(this.filters().label);
  }

  /** The "Label" chip's own scalar value, for its single select. */
  protected labelScalar(): string | null {
    return this.toScalarValue(this.filters().label);
  }

  /** Applies one of the six `equals`/`isAnyOf` fields' multi select `valueChange`. */
  private applyEnumSelection<T>(
    key: InterventionEnumFilterKey,
    values: readonly T[] | null | undefined,
  ): void {
    const patch = {
      [key]: values && values.length > 0 ? values : null,
    } as Partial<InterventionListFilters>;

    this.applyFilter(patch);
  }

  /** Applies the "Status" chip's multi select selection. See {@link applyEnumSelection}. */
  protected applyStatusFilter(values: readonly InterventionStatus[] | null | undefined): void {
    this.applyEnumSelection('status', values);
  }

  /** Applies the "Type" chip's multi select selection. See {@link applyEnumSelection}. */
  protected applyTypeFilter(values: readonly InterventionType[] | null | undefined): void {
    this.applyEnumSelection('type', values);
  }

  /** Applies the "Priority" chip's multi select selection. See {@link applyEnumSelection}. */
  protected applyPriorityFilter(values: readonly InterventionPriority[] | null | undefined): void {
    this.applyEnumSelection('priority', values);
  }

  /** Applies the "Site" chip's multi select selection. See {@link applyEnumSelection}. */
  protected applySiteFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('site', values);
  }

  /** Applies the "Responsible" chip's multi select selection. See {@link applyEnumSelection}. */
  protected applyResponsibleFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('responsible', values);
  }

  /** Applies the "Label" chip's multi select selection. See {@link applyEnumSelection}. */
  protected applyLabelFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('label', values);
  }

  /** Switches the "Deadline" chip's value control to the picked operator's own shape and drops any already-applied narrowing. */
  private onDueRangeOperatorPicked(operator: CollectionFilterOperator): void {
    if (operator !== 'greaterThan' && operator !== 'lessThan' && operator !== 'between') return;

    this.dueRangeOperator.set(operator);
    if (this.filters().dueRange !== null) this.applyFilter({ dueRange: null });
  }

  /** Applies the "Deadline" chip's `greaterThan` narrowing. */
  protected pickDueAfter(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ dueRange: { operator: 'greaterThan', after: date } });
  }

  /** Applies the "Deadline" chip's `lessThan` narrowing. */
  protected pickDueBefore(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ dueRange: { operator: 'lessThan', before: date } });
  }

  /** Applies the "Deadline" chip's `between` narrowing. */
  protected pickDueBetween(range: [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ dueRange: { operator: 'between', after, before } });
  }

  /** Switches the "Planned start" chip's value control and drops any already-applied narrowing. See {@link onDueRangeOperatorPicked}. */
  private onPlannedStartRangeOperatorPicked(operator: CollectionFilterOperator): void {
    if (operator !== 'greaterThan' && operator !== 'lessThan' && operator !== 'between') return;

    this.plannedStartRangeOperator.set(operator);
    if (this.filters().plannedStartRange !== null) this.applyFilter({ plannedStartRange: null });
  }

  /** Applies the "Planned start" chip's `greaterThan` narrowing. */
  protected pickPlannedStartAfter(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ plannedStartRange: { operator: 'greaterThan', after: date } });
  }

  /** Applies the "Planned start" chip's `lessThan` narrowing. */
  protected pickPlannedStartBefore(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ plannedStartRange: { operator: 'lessThan', before: date } });
  }

  /** Applies the "Planned start" chip's `between` narrowing. */
  protected pickPlannedStartBetween(range: [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ plannedStartRange: { operator: 'between', after, before } });
  }

  /** Reacts to `app-collection-filter-toggle`'s `visibleChange`. */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /** Whether a field's value control should currently render open. */
  protected fieldPopoverState(key: InterventionFilterFieldKey): 'open' | 'closed' {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /** Keeps {@link openFilterKey} in sync with a field's own value control. */
  protected onFieldPopoverStateChanged(
    key: InterventionFilterFieldKey,
    state: 'open' | 'closed',
  ): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /** Drops every narrowing at once, mine and the legacy due window included — mirrors the pre-shell `InterventionsPage.clearFilters`'s own `NO_FILTERS`. */
  protected clearFilters(): void {
    this.navigateQuery(serializeInterventionListFilters(NO_FILTERS));
  }

  /** The `applyFilter` patch that clears one field back to `null`. */
  private filterClearPatchOf(key: InterventionFilterFieldKey): Partial<InterventionListFilters> {
    switch (key) {
      case 'status':
        return { status: null };
      case 'type':
        return { type: null };
      case 'priority':
        return { priority: null };
      case 'site':
        return { site: null };
      case 'responsible':
        return { responsible: null };
      case 'label':
        return { label: null };
      case 'dueRange':
        return { dueRange: null };
      case 'plannedStartRange':
        return { plannedStartRange: null };
    }
  }

  /** Opens the creation sheet through the List leaf's established `?create=1` contract, navigating there first when another leaf is active. */
  protected openCreate(): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'interventions'], {
      queryParams: { ...this.queryParamsWithStatus(), create: '1' },
    });
  }
  //#endregion
}
