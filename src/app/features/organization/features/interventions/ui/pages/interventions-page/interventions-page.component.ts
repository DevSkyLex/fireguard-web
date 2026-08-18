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
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideCalendarClock,
  lucideCalendarDays,
  lucideCheck,
  lucideCircleAlert,
  lucideCircleDot,
  lucideClipboardList,
  lucideDownload,
  lucideFlag,
  lucideMapPin,
  lucidePlus,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideTag,
  lucideTrash2,
  lucideUser,
  lucideUserCog,
  lucideWrench,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallPending, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import {
  resolveInterventionTag,
  type InterventionAssignRequest,
  type InterventionAssignSubmittedEvent,
  type InterventionDueRangeFilter,
  type InterventionDuplicatePrefill,
  type InterventionListFilters,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionPlannedStartRangeFilter,
  type InterventionPriority,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionType,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import {
  BrowserDownloadService,
  InterventionListPreferencesService,
} from '@features/organization/features/interventions/services';
import {
  InterventionStatisticsStore,
  InterventionStore,
  type InterventionStatisticsStoreType,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import {
  buildInterventionDuplicatePrefill,
  isInterventionDeletable,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationMemberAccessStore,
  type OrganizationMemberAccessStoreType,
} from '@features/organization/state';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterOperator,
  type CollectionFilterOperatorChangedEvent,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckboxImports } from '@shared/ui/checkbox';
import { HlmDatePickerImports } from '@shared/ui/date-picker';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggle } from '@shared/ui/toggle';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '../../../state/intervention-planning-options';
import { InterventionKpiStrip } from '../../components/intervention-kpi-strip';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionAssignDialog } from '../../dialogs/intervention-assign-dialog';
import { InterventionBulkDeleteDialog } from '../../dialogs/intervention-bulk-delete-dialog';
import type { InterventionCreateFormValues } from '../../forms/intervention-create-form';
import { InterventionCreateSheet } from '../../sheets/intervention-create-sheet';
import {
  INTERVENTION_TABLE_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import type {
  InterventionFilterFieldKey,
  InterventionFilterFieldOption,
  InterventionListItemViewModel,
} from './models';
import {
  INTERVENTION_FILTER_FIELDS,
  INTERVENTION_PRIORITY_FILTER_OPTIONS,
  INTERVENTION_SORT_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from './options';
import {
  buildInterventionCsv,
  buildInterventionListOptions,
  parseInterventionListFilters,
  serializeInterventionListFilters,
} from './utils';

/** How close a deadline must be to count as "due soon". */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the table — the server default first, its clamp last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/**
 * Hard cap on how many rows a multi-page CSV export drains before it stops
 * asking for more — a runaway `listAll` would otherwise pull an unbounded
 * organization history into one browser tab.
 */
const EXPORT_ROW_CAP: number = 1000;

/** The narrowing a freshly opened list applies: none. */
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
 *
 * @description
 * The three operators the "Deadline" chip's own `dueRange` field declares —
 * the discriminant of {@link InterventionDueRangeFilter}, named locally so
 * {@link InterventionsPage.dueRangeOperator} and its value-control methods
 * stay narrowly typed instead of the wider `CollectionFilterOperator`.
 *
 * @since 8.1.0
 */
type InterventionDueRangeOperator = 'greaterThan' | 'lessThan' | 'between';

/**
 * Type InterventionPlannedStartRangeOperator
 *
 * @description
 * The three operators the "Planned start" chip's own `plannedStartRange`
 * field declares — the discriminant of
 * {@link InterventionPlannedStartRangeFilter}, named locally for the same
 * reason as {@link InterventionDueRangeOperator}, not shared with it (rule
 * of three, `FEATURE.md`).
 *
 * @since 8.2.0
 */
type InterventionPlannedStartRangeOperator = 'greaterThan' | 'lessThan' | 'between';

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization's interventions, laid out like
 * spartan's dashboard table: a filter bar and a Linear-style Display popover
 * above, the grid in its bordered shell, and a footer carrying the row count,
 * the page size and the pager.
 *
 * It owns what the table must not — the query it sends, the `?q=`/`?create=`
 * params it round-trips, the ordering, the column visibility and the page
 * window (`ARCHITECTURE.md` §2.5).
 *
 * Paging, filtering and sorting are server-side end to end: the loaded
 * entities ARE the current page, the footer derives its page count from the
 * server's `totalItems`, and any narrowing change restarts from page one —
 * reset synchronously in the mutators so the load effect fires exactly once
 * per change. The selection clears on every load: it only ever refers to rows
 * of the page on screen, so the bulk-delete dialog can never promise rows the
 * operator no longer sees.
 *
 * `InterventionStore` is **not** provided here — it comes from the pathless
 * parent route, which keeps `orderedIds()` alive across list ↔ detail.
 *
 * Deletion is confirm-gated: a row's Delete entry and the toolbar's "Delete
 * selected" both set a `pending*` target signal instead of calling the store
 * directly, driving the single `hlm-alert-dialog` shared by both paths. A
 * bulk selection is filtered to `isInterventionDeletable` rows before the
 * dialog opens, so the count it shows is always what will actually delete —
 * never a promise the API would refuse with a 409.
 *
 * "Duplicate" reuses the same creation sheet, prefilled — from a row's own
 * menu, or from a cross-route handoff `InterventionStore.pendingDuplicatePrefill`
 * carries when a detail page navigates here with `?create=1`. Never a
 * server-side copy: it ends in the normal `create` call, and never carries
 * `status`, the planned window or the review note.
 *
 * The removable filter chips below the toolbar are a read-only projection of
 * {@link filters}, never a second copy of it: removing a chip calls the same
 * {@link applyFilter} path the popover's own selects use, so the URL stays
 * the single source of truth (`FEATURE.md`). The KPI strip's own overdue and
 * awaiting-review tiles link into that same `?due=`/`?status=` contract —
 * the only way left to reach those two narrowings from the UI, now that the
 * toolbar's segmented-views toggle group is gone.
 *
 * Its title lives in the shell breadcrumb, not in-page — the route's
 * `data.breadcrumb` supplies it. "New intervention" registers on the shell
 * header through `PageActionsService` instead of rendering its own title
 * band.
 *
 * The filter bar (6.5) is Linear-style segmented chips, not a popover:
 * `app-collection-filter-bar` (`@shared/collection-filters`, since the
 * phase-2 `collection-*` migration) renders one `app-filter-chip` per active
 * narrowing, each projecting one of this page's seven `ng-template` value
 * controls — the same `hlm-select` the old popover used, just restyled flush
 * into the chip. The bar's own "+ Filter" menu lists the fields still
 * unset; picking one fires `fieldPicked`, and {@link onFieldPicked} sets
 * {@link openFilterKey} so the picked field's own template forces its select
 * open. Both still resolve through {@link applyFilter} alone — there is no
 * second copy of the narrowing, only of which selector is currently
 * expanded. It reads as a second line of the toolbar rather than a band of
 * its own, so the bar's own root carries `-mt-2`, pulling itself half of the
 * page's `gap-4` back up instead of sitting a full gap below the search row.
 *
 * `hlm-button-group` and `hlm-combobox` were both evaluated for this bar and
 * both ruled out; `FEATURE.md` records why, so neither is reopened without
 * new evidence.
 *
 * The "Display" toolbar button (6.7) replaces what used to be a bare
 * "Columns" menu: a single `hlm-popover` trigger opening a panel that groups
 * every presentation preference this list owns — ordering and column
 * visibility — the way Linear's own Display control does. Both sections read
 * and write the same {@link sortOrder} and {@link hiddenColumns} signals the
 * table and the cookie already used; the popover adds no state of its own,
 * only a single surface for what was previously reachable only through a
 * column header click.
 *
 * @version 6.9.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    NgIcon,
    EmptyState,
    ErrorState,
    HlmBadge,
    HlmButton,
    HlmSpinner,
    HlmToggle,
    InterventionAssignDialog,
    InterventionBulkDeleteDialog,
    InterventionCreateSheet,
    InterventionKpiStrip,
    InterventionTable,
    InterventionTag,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    ...HlmCheckboxImports,
    ...HlmDatePickerImports,
    ...HlmDropdownMenuImports,
    ...HlmPopoverImports,
    ...HlmSelectImports,
    ...HlmSeparatorImports,
  ],
  providers: [
    InterventionPlanningOptionsStore,
    InterventionStatisticsStore,
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideCalendarClock,
      lucideCalendarDays,
      lucideCheck,
      lucideCircleAlert,
      lucideCircleDot,
      lucideClipboardList,
      lucideDownload,
      lucideFlag,
      lucideMapPin,
      lucidePlus,
      lucideSearch,
      lucideSlidersHorizontal,
      lucideTag,
      lucideTrash2,
      lucideUser,
      lucideUserCog,
      lucideWrench,
    }),
  ],
  templateUrl: './interventions-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace whose interventions are listed, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property q
   * @readonly
   *
   * @description
   * The search term the URL carries, so a filtered list survives a reload.
   *
   * Optional because a query param that is absent — or that the page itself
   * just removed — binds as `undefined` rather than falling back to the input
   * default. Read {@link searchTerm} instead.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property create
   * @readonly
   *
   * @description
   * `?create=1` opens the creation sheet on arrival — the contract the parent
   * feature's landing page uses to start an intervention.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property status / type / priority / site / responsible / label / mine / due
   * @readonly
   *
   * @description
   * The narrowing the URL carries — one query param per filter, raw ids for
   * the IRI-valued ones — so a filtered list is shareable, bookmarkable and
   * survives a reload. Unknown values are ignored at parse time rather than
   * sent to the API.
   *
   * @access public
   * @since 5.2.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly status: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The type filter the URL carries. See {@link status}. */
  public readonly type: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The priority filter the URL carries. See {@link status}. */
  public readonly priority: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The site filter the URL carries, as a raw facility id. See {@link status}. */
  public readonly site: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The responsible filter the URL carries, as a raw member id. See {@link status}. */
  public readonly responsible: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The label filter the URL carries, as a raw label id. See {@link status}. */
  public readonly label: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** `?mine=1` narrows to the signed-in member (responsible OR participant). */
  public readonly mine: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The named due-date window the URL carries — the segmented views' and the Today page's own legacy preset. See {@link status}. */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Deadline" chip lower bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly dueAfter: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Deadline" chip upper bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly dueBefore: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** The filter bar's "Planned start" chip lower bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly plannedStartAfter: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /** The filter bar's "Planned start" chip upper bound, `YYYY-MM-DD`. See {@link status}. */
  public readonly plannedStartBefore: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  //#endregion

  //#region Properties
  /** The list dataset, provided by the pathless parent route. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Site and member choices for the filters and the creation form. */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property statisticsStore
   * @readonly
   *
   * @description
   * The KPI strip's organization-wide snapshot. Component-scoped and
   * reloaded only on an organization switch — the snapshot is
   * `INTERVENTIONS_READ`-gated the same as the list, but org-wide, so it
   * must not refetch on every filter, search or page change the list
   * itself reacts to (`FEATURE.md`).
   *
   * @access protected
   * @since 5.3.0
   *
   * @type {InterventionStatisticsStoreType}
   */
  protected readonly statisticsStore: InterventionStatisticsStoreType =
    inject<InterventionStatisticsStoreType>(InterventionStatisticsStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating the write actions (create, delete)
   * this page offers.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to open a created intervention's detail page and to
   * round-trip the `?q=`/`?create=` query params.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current route, anchoring the relative query-param navigations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The cookie-backed memory of how this list was left (sort, columns, page size). */
  private readonly preferences: InterventionListPreferencesService =
    inject<InterventionListPreferencesService>(InterventionListPreferencesService);

  /**
   * Read directly rather than through {@link InterventionStore}: the export
   * is a one-shot, page-local drain of every matching row, and the store's
   * public surface only ever loads and caches one server page at a time
   * (mirroring `ChannelConversationPage`'s direct `ConversationService` call
   * for the one action its owning store has no method for).
   */
  private readonly interventionService: InterventionService = inject(InterventionService);

  /** Saves the generated CSV to the visitor's device, browser-only. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Reports the export's outcome — a truncation warning or a failure. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes the export's in-flight drain if the page is left mid-fetch. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * The "New intervention" button, registered on the shell header instead of
   * rendering in-page — the shell header carries every routed page's title
   * and actions now (`ARCHITECTURE.md` §9.3).
   *
   * @access private
   * @since 6.4.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /** The signed-in member, resolving the "my interventions" chip and the identity gates. */
  private readonly memberAccess: OrganizationMemberAccessStoreType =
    inject<OrganizationMemberAccessStoreType>(OrganizationMemberAccessStore);

  /**
   * Property memberIri
   * @readonly
   *
   * @description
   * The signed-in member's IRI in this organization, null until the profile
   * resolves — the same identity the detail page's submit gate reads.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly memberIri: Signal<string | null> = computed<string | null>(() => {
    const memberId: string | undefined = this.memberAccess.profile()?.id;

    return memberId === undefined
      ? null
      : `/api/organizations/${this.organizationId()}/members/${memberId}`;
  });

  /**
   * Property filters
   * @readonly
   *
   * @description
   * The active narrowing, parsed from the URL's query params — the URL is the
   * single source of truth, so a filtered list is shareable and the back
   * button restores it. Presentation preferences (sort, columns, page size)
   * stay in the cookie; filters never do.
   *
   * @access protected
   * @since 5.2.0
   *
   * @type {Signal<InterventionListFilters>}
   */
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

  /** The active ordering, restored from the preferences cookie. */
  protected readonly sortOrder: WritableSignal<InterventionListSort> = signal<InterventionListSort>(
    this.preferences.readSort(),
  );

  /** Which optional columns the operator has hidden, restored from the preferences cookie. */
  protected readonly hiddenColumns: WritableSignal<ReadonlySet<InterventionTableColumn>> = signal<
    ReadonlySet<InterventionTableColumn>
  >(this.restoreHiddenColumns());

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** Whether a multi-page export drain is currently in flight. */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds, restored from the preferences cookie. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(this.restorePageSize());

  /** Whether the creation sheet is open. */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property duplicatePrefill
   * @readonly
   *
   * @description
   * What the creation sheet is currently prefilled with, from a "Duplicate"
   * request — a row's own menu, or the cross-route handoff a detail page
   * left on the store. `null` for a plain "New intervention". Cleared
   * whenever the sheet closes, so a later plain creation never reuses it.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {WritableSignal<InterventionDuplicatePrefill | null>}
   */
  protected readonly duplicatePrefill: WritableSignal<InterventionDuplicatePrefill | null> =
    signal<InterventionDuplicatePrefill | null>(null);

  /** Currently selected row ids, scoped to the loaded page — cleared on every load. */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /** The intervention a row's menu asked to delete, pending confirmation. */
  protected readonly pendingDelete: WritableSignal<InterventionOutput | null> =
    signal<InterventionOutput | null>(null);

  /** The selected, deletable ids the toolbar asked to bulk-delete, pending confirmation. */
  protected readonly pendingBulkDeleteIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /**
   * What `InterventionAssignDialog` is currently asking to assign, or `null`
   * to keep it closed. Opened either from a single row's menu or from the
   * bulk toolbar — {@link pendingBulkAssignIds} tells `submitAssign` which.
   */
  protected readonly assignRequest: WritableSignal<InterventionAssignRequest | null> =
    signal<InterventionAssignRequest | null>(null);

  /** The selected, assignable ids the toolbar asked to bulk-assign, pending the dialog. */
  protected readonly pendingBulkAssignIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /** Status choices offered in the filter bar. */
  protected readonly statusOptions: SelectOption<InterventionStatus>[] =
    INTERVENTION_STATUS_FILTER_OPTIONS;

  /** Type choices offered in the filter bar. */
  protected readonly typeOptions: SelectOption<InterventionType>[] =
    INTERVENTION_TYPE_FILTER_OPTIONS;

  /** Priority choices offered in the filter bar. */
  protected readonly priorityOptions: SelectOption<InterventionPriority>[] =
    INTERVENTION_PRIORITY_FILTER_OPTIONS;

  /** Every hideable column, for the Display popover's column list. */
  protected readonly allColumns: ReadonlyArray<InterventionTableColumn> =
    INTERVENTION_TABLE_COLUMNS;

  /** Orderings the Display popover's field select offers — the collection's own sort whitelist. */
  protected readonly sortOptions: SelectOption<InterventionSortField>[] = INTERVENTION_SORT_OPTIONS;

  /**
   * Property visibleColumns
   * @readonly
   *
   * @description
   * The optional columns currently shown, in the table's own order — exactly
   * what the CSV export mirrors, so a column hidden on screen never appears
   * in the file.
   *
   * @access protected
   * @since 6.2.0
   *
   * @type {Signal<ReadonlyArray<InterventionTableColumn>>}
   */
  protected readonly visibleColumns: Signal<ReadonlyArray<InterventionTableColumn>> = computed(
    (): ReadonlyArray<InterventionTableColumn> =>
      this.allColumns.filter((id: InterventionTableColumn): boolean => this.isColumnVisible(id)),
  );

  /**
   * Property exportDisabled
   * @readonly
   *
   * @description
   * Whether the "Export" button should be inert: nothing loaded yet, nothing
   * matches the current query, or a multi-page drain is already running.
   *
   * @access protected
   * @since 6.2.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean =>
      this.store.isLoadingInterventions() ||
      this.exportBusy() ||
      this.store.totalInterventions() === 0,
  );

  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The search as everything downstream reads it: trimmed, never `undefined`.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /**
   * Property detailRouteBase
   * @readonly
   *
   * @description
   * Where a row's link points.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /**
   * Property canTransition
   * @readonly
   *
   * @description
   * Whether the member may move an intervention along, which decides if the
   * row menu offers status changes at all.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canTransition: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
    ]),
  );

  /**
   * Property canDelete
   * @readonly
   *
   * @description
   * Whether the member may delete an intervention, which decides if the row
   * menu and the bulk toolbar offer Delete at all. Mirrors the permission
   * `facilities`' own delete action gates on (`FEATURE.md` §"Facilities"):
   * this feature has no dedicated delete permission either, so the write
   * permission covers it.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDelete: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_WRITE),
  );

  /**
   * Property canAssign
   * @readonly
   *
   * @description
   * Whether the member may assign a responsible, which decides if the row
   * menu and the bulk toolbar offer "Assign responsible…" at all. Assignment
   * is a planning action, gated on the same permission as scheduling.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAssign: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canDuplicate
   * @readonly
   *
   * @description
   * Whether the member may duplicate an intervention, which decides if the
   * row menu offers "Duplicate" at all. Unlike delete and assign, no status
   * narrows it further — duplicating an abandoned intervention is
   * legitimate — so this is the only gate.
   *
   * @access protected
   * @since 6.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDuplicate: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Site names keyed by facility IRI. */
  private readonly siteDisplayMap: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.planningOptions
          .sites()
          .map((site: SelectOption): [string, string] => [site.value, site.label]),
      ),
  );

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

  /**
   * Property labelOptions
   * @readonly
   *
   * @description
   * The organization's intervention labels, as the filter select's options —
   * `InterventionLabelOutput` mapped to the IRI-valued {@link SelectOption}
   * the filter's `label` narrowing carries.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly SelectOption[]>}
   */
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

  /**
   * Property items
   * @readonly
   *
   * @description
   * Every loaded intervention as a row view model.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<readonly InterventionListItemViewModel[]>}
   */
  protected readonly items: Signal<readonly InterventionListItemViewModel[]> = computed(() =>
    this.store
      .interventionList()
      .map((intervention: InterventionOutput) => this.toItemViewModel(intervention)),
  );

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * How many pages the whole server-side collection fills — derived from the
   * server's `totalItems`, not from the loaded rows, which ARE one page. At
   * least one, so the footer never reads "Page 1 of 0".
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalInterventions() / this.pageSize())),
  );

  /**
   * Property deletableSelectedIds
   * @readonly
   *
   * @description
   * Ids of the current selection that are actually deletable — status
   * `draft` or `abandoned`. What the bulk-delete action operates on and
   * shows a count for, never the raw selection size.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  protected readonly deletableSelectedIds: Signal<ReadonlyArray<string>> = computed(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return this.items()
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          selected.has(item.intervention.id) && isInterventionDeletable(item.intervention),
      )
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  });

  /**
   * Property bulkDeleteLabel
   * @readonly
   *
   * @description
   * The bulk-delete button's label, counting only the deletable subset of
   * the selection.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly bulkDeleteLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.bulkDeleteButton:Delete (${this.deletableSelectedIds().length}:count:)`,
  );

  /**
   * Property assignableSelectedIds
   * @readonly
   *
   * @description
   * Ids of the current selection that are actually assignable — status
   * `draft` or `planned`, the same narrowing {@link InterventionTable} applies
   * per row. What the bulk-assign action operates on and shows a count for.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
  protected readonly assignableSelectedIds: Signal<ReadonlyArray<string>> = computed(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return this.items()
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          selected.has(item.intervention.id) &&
          (item.intervention.status === 'draft' || item.intervention.status === 'planned'),
      )
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  });

  /**
   * Property bulkAssignLabel
   * @readonly
   *
   * @description
   * The bulk-assign menu entry's label, counting only the assignable subset
   * of the selection.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly bulkAssignLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.bulkAssignButton:Assign responsible… (${this.assignableSelectedIds().length}:count:)`,
  );

  /**
   * Property bulkTransitionTargets
   * @readonly
   *
   * @description
   * Every status the current selection could move to, as the union of each
   * selected row's own `allowedTransitions` — the bulk "Move to" menu's own
   * entries, each further narrowed by {@link transitionableSelectedIds}. A
   * row whose own transition is still in flight is skipped: its cached
   * `allowedTransitions` describe the pre-transition state.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly InterventionStatus[]>}
   */
  protected readonly bulkTransitionTargets: Signal<readonly InterventionStatus[]> = computed(
    (): readonly InterventionStatus[] => {
      const selected: ReadonlySet<string> = this.selectedIds();
      const transitioning: readonly string[] = this.store.transitioningInterventionIds();
      const targets: Set<InterventionStatus> = new Set<InterventionStatus>();

      for (const item of this.items()) {
        if (!selected.has(item.intervention.id)) continue;
        if (transitioning.includes(item.intervention.id)) continue;
        for (const target of item.intervention.allowedTransitions) targets.add(target);
      }

      return [...targets];
    },
  );

  /**
   * Property assignDialogBusy
   * @readonly
   *
   * @description
   * Whether the store's assignment write is in flight, disabling the
   * dialog's submit while it runs.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly assignDialogBusy: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.assignCallState()),
  );

  /**
   * Property deleteDialogState
   * @readonly
   *
   * @description
   * The confirm dialog's open/closed state, derived from whichever `pending*`
   * target signal is set. A single `hlm-alert-dialog` serves both the
   * row-level and the bulk-delete flow.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<BrnDialogState>}
   */
  protected readonly deleteDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingDelete() !== null || this.pendingBulkDeleteIds() !== null ? 'open' : 'closed',
  );

  /**
   * Property deleteDialogTitle
   * @readonly
   *
   * @description
   * The confirm dialog's title, naming the count for a bulk deletion.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deleteDialogTitle: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();

    if (bulkIds && bulkIds.length > 1) {
      return $localize`:@@intervention.list.deleteConfirmTitleMany:Delete ${bulkIds.length}:count: interventions?`;
    }

    return $localize`:@@intervention.list.deleteConfirmTitleOne:Delete intervention?`;
  });

  /**
   * Property deleteDialogDescription
   * @readonly
   *
   * @description
   * The confirm dialog's body: names the intervention for a single row,
   * counts them for a bulk selection.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deleteDialogDescription: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();

    if (bulkIds) {
      return bulkIds.length > 1
        ? $localize`:@@intervention.list.deleteConfirmDescriptionMany:This will permanently delete ${bulkIds.length}:count: interventions. This action cannot be undone.`
        : $localize`:@@intervention.list.deleteConfirmDescriptionOne:This will permanently delete this intervention. This action cannot be undone.`;
    }

    const single: InterventionOutput | null = this.pendingDelete();

    return single
      ? $localize`:@@intervention.list.deleteConfirmDescriptionSingle:This will permanently delete "${single.name}:name:". This action cannot be undone.`
      : '';
  });

  /**
   * Property filterFields
   * @readonly
   * @description The filter bar's field catalog, forwarded to `app-collection-filter-bar` as-is — `InterventionFilterFieldOption` is structurally a `CollectionFilterField`.
   * @access protected
   * @since 7.0.0
   * @type {readonly InterventionFilterFieldOption[]}
   */
  protected readonly filterFields: readonly InterventionFilterFieldOption[] =
    INTERVENTION_FILTER_FIELDS;

  /**
   * Property activeFilterKeys
   * @readonly
   * @description Which of {@link filterFields} currently carry a value, `mine` excluded (it keeps its own toggle chip) — the bar's `activeKeys` input and this page's "Clear filters" empty-state condition both read this.
   * @access protected
   * @since 7.0.0
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

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * Which field's value selector currently renders forced open — `null` when
   * none is. Set by the bar's {@link onFieldPicked} when a not-yet-active
   * field is picked from its "+ Filter" menu, and kept in sync with a chip's
   * own value control through {@link onFieldPopoverStateChanged} so clicking
   * its value segment (or dismissing it) behaves the same way. This is
   * UI-only: it decides which selector is expanded, never a narrowing's
   * value — the URL stays the only place that lives. Also drives the bar's
   * `pendingKey` input, which is what still renders an empty chip for a field
   * mid-pick before it carries a value.
   *
   * @access protected
   * @since 6.5.0
   *
   * @type {WritableSignal<InterventionFilterFieldKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<InterventionFilterFieldKey | null> =
    signal<InterventionFilterFieldKey | null>(null);

  /**
   * Property filtersVisible
   * @readonly
   *
   * @description
   * Whether `app-collection-filter-bar` is currently mounted below the
   * toolbar — presentation-only, never serialized to the URL. Seeded by
   * `initialCollectionFilterBarVisibility` (`@shared/collection-filters`) so
   * a `?status=…` link never lands on a bar that hides what is narrowing the
   * list, then purely driven by `app-collection-filter-toggle`.
   *
   * @access protected
   * @since 7.1.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

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

  /**
   * Property chipTemplates
   * @readonly
   * @description Every filter field's value-control `TemplateRef`, keyed by {@link InterventionFilterFieldKey}, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 7.0.0
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
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

  /**
   * Property dueRangeOperator
   * @readonly
   *
   * @description
   * The "Deadline" chip's own currently-selected operator — a
   * `linkedSignal` over {@link filters}' own `dueRange`, so a shared or
   * reloaded `?dueAfter=…`/`?dueBefore=…` URL shows the right operator
   * immediately, while picking a different operator from the chip's own
   * select (before a new date is chosen) still updates this signal directly
   * without waiting for a URL round-trip. Defaults to `greaterThan` — the
   * field's first declared operator — the moment "Deadline" is picked from
   * the "+ Filter" menu and carries no value yet.
   *
   * @access protected
   * @since 8.1.0
   *
   * @type {WritableSignal<InterventionDueRangeOperator>}
   */
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

  /**
   * Property dueRangeAfter
   * @readonly
   * @description The applied `dueRange`'s lower bound, when its operator carries one — read by the "after"/"between" value controls.
   * @access protected
   * @since 8.1.0
   * @type {Signal<Date | null>}
   */
  protected readonly dueRangeAfter: Signal<Date | null> = computed<Date | null>(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange && (dueRange.operator === 'greaterThan' || dueRange.operator === 'between')
      ? dueRange.after
      : null;
  });

  /**
   * Property dueRangeBefore
   * @readonly
   * @description The applied `dueRange`'s upper bound, when its operator carries one — read by the "before"/"between" value controls.
   * @access protected
   * @since 8.1.0
   * @type {Signal<Date | null>}
   */
  protected readonly dueRangeBefore: Signal<Date | null> = computed<Date | null>(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange && (dueRange.operator === 'lessThan' || dueRange.operator === 'between')
      ? dueRange.before
      : null;
  });

  /**
   * Property dueRangeBetween
   * @readonly
   * @description The applied `dueRange`'s bound pair, only while its operator is `between` — read by `hlm-date-range-picker`, which needs both ends or neither.
   * @access protected
   * @since 8.1.0
   * @type {Signal<[Date, Date] | undefined>}
   */
  protected readonly dueRangeBetween: Signal<[Date, Date] | undefined> = computed<
    [Date, Date] | undefined
  >(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange && dueRange.operator === 'between'
      ? [dueRange.after, dueRange.before]
      : undefined;
  });

  /**
   * Property plannedStartRangeOperator
   * @readonly
   * @description The "Planned start" chip's own currently-selected operator — the same `linkedSignal` pattern as {@link dueRangeOperator}, over `filters()`' own `plannedStartRange`.
   * @access protected
   * @since 8.2.0
   * @type {WritableSignal<InterventionPlannedStartRangeOperator>}
   */
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

  /**
   * Property plannedStartRangeAfter
   * @readonly
   * @description The applied `plannedStartRange`'s lower bound, when its operator carries one. See {@link dueRangeAfter}.
   * @access protected
   * @since 8.2.0
   * @type {Signal<Date | null>}
   */
  protected readonly plannedStartRangeAfter: Signal<Date | null> = computed<Date | null>(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange &&
      (plannedStartRange.operator === 'greaterThan' || plannedStartRange.operator === 'between')
      ? plannedStartRange.after
      : null;
  });

  /**
   * Property plannedStartRangeBefore
   * @readonly
   * @description The applied `plannedStartRange`'s upper bound, when its operator carries one. See {@link dueRangeBefore}.
   * @access protected
   * @since 8.2.0
   * @type {Signal<Date | null>}
   */
  protected readonly plannedStartRangeBefore: Signal<Date | null> = computed<Date | null>(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange &&
      (plannedStartRange.operator === 'lessThan' || plannedStartRange.operator === 'between')
      ? plannedStartRange.before
      : null;
  });

  /**
   * Property plannedStartRangeBetween
   * @readonly
   * @description The applied `plannedStartRange`'s bound pair, only while its operator is `between`. See {@link dueRangeBetween}.
   * @access protected
   * @since 8.2.0
   * @type {Signal<[Date, Date] | undefined>}
   */
  protected readonly plannedStartRangeBetween: Signal<[Date, Date] | undefined> = computed<
    [Date, Date] | undefined
  >(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange && plannedStartRange.operator === 'between'
      ? [plannedStartRange.after, plannedStartRange.before]
      : undefined;
  });

  /**
   * Property filterOperators
   * @readonly
   * @description The currently active operator per field key, for `app-collection-filter-bar`'s `activeOperators` input — only "Deadline" and "Planned start" ever need an entry, the other six fields have exactly one declared operator each.
   * @access protected
   * @since 8.1.0
   * @type {Signal<Readonly<Record<string, CollectionFilterOperator>>>}
   */
  protected readonly filterOperators: Signal<Readonly<Record<string, CollectionFilterOperator>>> =
    computed<Readonly<Record<string, CollectionFilterOperator>>>(() => ({
      dueRange: this.dueRangeOperator(),
      plannedStartRange: this.plannedStartRangeOperator(),
    }));

  /**
   * Property hasSearch
   * @readonly
   *
   * @description
   * Whether a search is active, which decides between the no-results and the
   * first-run empty state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasSearch: Signal<boolean> = computed<boolean>(
    () => this.searchTerm().length > 0,
  );

  /**
   * Property hasError
   * @readonly
   *
   * @description
   * Whether the last load failed.
   *
   * @access protected
   * @since 3.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasError: Signal<boolean> = computed<boolean>(
    () => this.store.listError() !== null,
  );

  /** Names a status on a closed select trigger and in the column menu. */
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

  /** Names a site IRI on a closed select trigger. */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteDisplayMap().get(value) ?? '';

  /** Names a member IRI on a closed select trigger. */
  protected readonly responsibleLabelOf: (value: string) => string = (value: string): string =>
    this.memberDisplayMap().get(value)?.label ?? '';

  /** Names a label IRI on a closed select trigger. */
  protected readonly labelLabelOf: (value: string) => string = (value: string): string =>
    this.labelDisplayMap().get(value) ?? '';

  /** Names a filter chip's value segment, so each is distinguishable by screen reader. */
  protected readonly changeFilterLabel: (fieldLabel: string) => string = (
    fieldLabel: string,
  ): string => $localize`:@@intervention.list.changeFilter:Change filter: ${fieldLabel}:field:`;

  /** Names an ordering field on the Display popover's closed select trigger. */
  protected readonly sortFieldLabelOf: (value: InterventionSortField) => string = (
    value: InterventionSortField,
  ): string =>
    this.sortOptions.find(
      (option: SelectOption<InterventionSortField>): boolean => option.value === value,
    )?.label ?? '';

  /**
   * Property sortDirectionLabel
   * @readonly
   *
   * @description
   * The Display popover's direction toggle button label, naming the active
   * ordering rather than the action a click performs — screen readers get
   * the current state, sighted operators get the arrow glyph.
   *
   * @access protected
   * @since 6.7.0
   *
   * @type {Signal<string>}
   */
  protected readonly sortDirectionLabel: Signal<string> = computed<string>(() =>
    this.sortOrder().direction === 'asc'
      ? $localize`:@@intervention.list.sortAscending:Ascending`
      : $localize`:@@intervention.list.sortDescending:Descending`,
  );

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the search round-trip and the load effect. A settled (debounced)
   * search resets the page synchronously with the query navigation so the
   * load effect fires once, already on the first page of the new result set.
   *
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
        if (term !== this.searchTerm()) {
          this.page.set(1);
          this.navigateQuery({ q: term === '' ? null : term });
        }
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const filters: InterventionListFilters = this.filters();
      const sort: InterventionListSort = this.sortOrder();
      const search: string = this.searchTerm();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const memberIri: string | null = filters.mine ? this.memberIri() : null;

      untracked((): void => {
        this.selectedIds.set(new Set<string>());
        this.store.load({
          organizationId,
          options: {
            ...buildInterventionListOptions(filters, sort, search, new Date(), memberIri),
            page,
            itemsPerPage: pageSize,
          },
        });
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.planningOptions.loadCreationOptions(organizationId);
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.statisticsStore.load(organizationId);
      });
    });

    effect((): void => {
      const requested: boolean = this.create() === '1';

      untracked((): void => {
        if (!requested) return;

        this.createSheetVisible.set(true);
        this.navigateQuery({ create: null });
      });
    });

    effect((): void => {
      const prefill: InterventionDuplicatePrefill | null = this.store.pendingDuplicatePrefill();

      untracked((): void => {
        if (!prefill) return;

        this.duplicatePrefill.set(prefill);
        this.createSheetVisible.set(true);
        this.store.clearPendingDuplicatePrefill();
      });
    });

    effect((): void => {
      const createdId: string | null = this.store.createdInterventionId();

      untracked((): void => {
        if (!createdId) return;

        this.createSheetVisible.set(false);
        this.store.clearCreatedIntervention();
        void this.router.navigate([...this.detailRouteBase(), createdId]);
      });
    });

    effect((): void => {
      const callState: CallState = this.store.deleteCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;
        if (this.pendingDelete() !== null) this.pendingDelete.set(null);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchQueryChanged
   *
   * @description
   * Records a keystroke into the draft term the debounce watches.
   *
   * @access protected
   * @since 3.1.0
   *
   * @param {string} term - The search box's current value.
   *
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Drops the search from the URL.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearSearch(): void {
    this.draftSearch.set('');
    this.page.set(1);
    this.navigateQuery({ q: null });
  }

  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Replaces one narrowing, which reloads the list from the first page.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {Partial<InterventionListFilters>} patch - The field to change.
   *
   * @returns {void}
   */
  protected applyFilter(patch: Partial<InterventionListFilters>): void {
    this.page.set(1);
    this.navigateQuery(serializeInterventionListFilters({ ...this.filters(), ...patch }));
  }

  /**
   * Method filterFieldOption
   *
   * @description
   * The catalog entry for one field, for the template to read a chip's
   * label and icon by key without repeating {@link INTERVENTION_FILTER_FIELDS}
   * lookups inline. Falls back to an empty label rather than throwing: every
   * call site passes a literal key from the same catalog, so the fallback
   * is unreachable in practice.
   *
   * @access protected
   * @since 6.5.0
   *
   * @param {InterventionFilterFieldKey} key - The field to resolve.
   *
   * @returns {InterventionFilterFieldOption} Its catalog entry.
   */
  protected filterFieldOption(key: InterventionFilterFieldKey): InterventionFilterFieldOption {
    return (
      INTERVENTION_FILTER_FIELDS.find(
        (field: InterventionFilterFieldOption): boolean => field.key === key,
      ) ?? { key, fieldLabel: '', icon: 'lucideCircleDot', operators: ['equals'] }
    );
  }

  /**
   * Method onFieldPicked
   *
   * @description
   * Reacts to the filter bar's `fieldPicked` output: forces the picked
   * field's value control open so the operator lands directly on the value
   * picker instead of an empty chip. The bar itself already moved the field
   * to the end of its own display-order memory before emitting.
   *
   * @access protected
   * @since 7.0.0
   *
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   *
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as InterventionFilterFieldKey);
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing.
   * @access protected
   * @since 7.0.0
   * @param {string} key - The field key a chip's remove button cleared.
   * @returns {void}
   */
  protected onFieldRemoved(key: string): void {
    this.applyFilter(this.filterClearPatchOf(key as InterventionFilterFieldKey));
  }

  /**
   * Method onFilterOperatorChanged
   * @description Reacts to the filter bar's `operatorChanged` output. Only "Deadline" (`dueRange`) and "Planned start" (`plannedStartRange`) currently declare more than one operator, so this only ever routes to one of {@link onDueRangeOperatorPicked} / {@link onPlannedStartRangeOperatorPicked}.
   * @access protected
   * @since 8.1.0
   * @param {CollectionFilterOperatorChangedEvent} event - The field key whose operator segment changed and the operator it now reads.
   * @returns {void}
   */
  protected onFilterOperatorChanged(event: CollectionFilterOperatorChangedEvent): void {
    if (event.key === 'dueRange') this.onDueRangeOperatorPicked(event.operator);
    if (event.key === 'plannedStartRange') this.onPlannedStartRangeOperatorPicked(event.operator);
  }

  /**
   * Method onDueRangeOperatorPicked
   *
   * @description
   * Switches the "Deadline" chip's value control to the picked operator's
   * own shape (one date for `greaterThan`/`lessThan`, two for `between`) and
   * drops any already-applied `dueRange` narrowing — its bound(s) were
   * chosen under the previous operator and no longer mean the same thing,
   * so the URL stays honest rather than keeping a stale filter active under
   * a value control that no longer shows it.
   *
   * @access private
   * @since 8.1.0
   *
   * @param {CollectionFilterOperator} operator - The operator the chip's select just picked.
   *
   * @returns {void}
   */
  private onDueRangeOperatorPicked(operator: CollectionFilterOperator): void {
    if (operator !== 'greaterThan' && operator !== 'lessThan' && operator !== 'between') return;

    this.dueRangeOperator.set(operator);
    if (this.filters().dueRange !== null) this.applyFilter({ dueRange: null });
  }

  /**
   * Method pickDueAfter
   * @description Applies the "Deadline" chip's `greaterThan` narrowing.
   * @access protected
   * @since 8.1.0
   * @param {Date | null | undefined} date - The picked lower bound, `null`/`undefined` while the picker is cleared.
   * @returns {void}
   */
  protected pickDueAfter(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ dueRange: { operator: 'greaterThan', after: date } });
  }

  /**
   * Method pickDueBefore
   * @description Applies the "Deadline" chip's `lessThan` narrowing.
   * @access protected
   * @since 8.1.0
   * @param {Date | null | undefined} date - The picked upper bound, `null`/`undefined` while the picker is cleared.
   * @returns {void}
   */
  protected pickDueBefore(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ dueRange: { operator: 'lessThan', before: date } });
  }

  /**
   * Method pickDueBetween
   * @description Applies the "Deadline" chip's `between` narrowing — the range picker emits once both ends are chosen, never one end at a time.
   * @access protected
   * @since 8.1.0
   * @param {[Date, Date] | null | undefined} range - The picked [after, before] pair, `null`/`undefined` while incomplete or cleared.
   * @returns {void}
   */
  protected pickDueBetween(range: [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ dueRange: { operator: 'between', after, before } });
  }

  /**
   * Method onPlannedStartRangeOperatorPicked
   * @description Switches the "Planned start" chip's value control and drops any already-applied `plannedStartRange` narrowing. See {@link onDueRangeOperatorPicked}.
   * @access private
   * @since 8.2.0
   * @param {CollectionFilterOperator} operator - The operator the chip's select just picked.
   * @returns {void}
   */
  private onPlannedStartRangeOperatorPicked(operator: CollectionFilterOperator): void {
    if (operator !== 'greaterThan' && operator !== 'lessThan' && operator !== 'between') return;

    this.plannedStartRangeOperator.set(operator);
    if (this.filters().plannedStartRange !== null) this.applyFilter({ plannedStartRange: null });
  }

  /**
   * Method pickPlannedStartAfter
   * @description Applies the "Planned start" chip's `greaterThan` narrowing.
   * @access protected
   * @since 8.2.0
   * @param {Date | null | undefined} date - The picked lower bound, `null`/`undefined` while the picker is cleared.
   * @returns {void}
   */
  protected pickPlannedStartAfter(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ plannedStartRange: { operator: 'greaterThan', after: date } });
  }

  /**
   * Method pickPlannedStartBefore
   * @description Applies the "Planned start" chip's `lessThan` narrowing.
   * @access protected
   * @since 8.2.0
   * @param {Date | null | undefined} date - The picked upper bound, `null`/`undefined` while the picker is cleared.
   * @returns {void}
   */
  protected pickPlannedStartBefore(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ plannedStartRange: { operator: 'lessThan', before: date } });
  }

  /**
   * Method pickPlannedStartBetween
   * @description Applies the "Planned start" chip's `between` narrowing — the range picker emits once both ends are chosen, never one end at a time.
   * @access protected
   * @since 8.2.0
   * @param {[Date, Date] | null | undefined} range - The picked [after, before] pair, `null`/`undefined` while incomplete or cleared.
   * @returns {void}
   */
  protected pickPlannedStartBetween(range: [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ plannedStartRange: { operator: 'between', after, before } });
  }

  /**
   * Method toggleFiltersVisible
   * @description Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to the value it reports.
   * @access protected
   * @since 7.1.0
   * @param {boolean} visible - The toggle button's intended next state.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method fieldPopoverState
   *
   * @description
   * Whether a field's value control should currently render open — true only
   * for the one field {@link openFilterKey} names.
   *
   * @access protected
   * @since 6.5.0
   *
   * @param {InterventionFilterFieldKey} key - The field to read.
   *
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(key: InterventionFilterFieldKey): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   *
   * @description
   * Keeps {@link openFilterKey} in sync with a field's own value control:
   * opening it (by its trigger, or by {@link onFieldPicked}) records which
   * field is expanded; closing it — picking a value, Escape, or an outside
   * click — clears the record, unless another field has since taken over.
   *
   * @access protected
   * @since 6.5.0
   *
   * @param {InterventionFilterFieldKey} key - The field whose selector changed.
   * @param {BrnOverlayState} state - Its next state.
   *
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(
    key: InterventionFilterFieldKey,
    state: BrnOverlayState,
  ): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method toggleMine
   * @method toggleMine
   *
   * @description
   * Flips the "my interventions" narrowing — responsible OR participant,
   * resolved server-side by the `member` filter.
   *
   * @access protected
   * @since 5.2.0
   *
   * @returns {void}
   */
  protected toggleMine(): void {
    this.page.set(1);
    this.navigateQuery({ mine: this.filters().mine ? null : '1' });
  }

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Drops every narrowing at once.
   *
   * @access protected
   * @since 4.0.0
   *
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.navigateQuery(serializeInterventionListFilters(NO_FILTERS));
  }

  /**
   * Method applySortField
   * @method applySortField
   *
   * @description
   * Orders by a column head. Re-picking the active field reverses it, which is
   * what a second click on a sorted column means everywhere else.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionSortField} field - The column's field.
   *
   * @returns {void}
   */
  protected applySortField(field: InterventionSortField): void {
    this.page.set(1);
    this.sortOrder.update((current: InterventionListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.persistListPreferences();
  }

  /**
   * Method onSortFieldPicked
   *
   * @description
   * The Display popover's field select emits `null`/`undefined` only while
   * clearing, which this select never does — every option maps to a real
   * field. The guard exists purely to satisfy `hlm-select`'s nullable output
   * type.
   *
   * @access protected
   * @since 6.7.0
   *
   * @param {InterventionSortField | null | undefined} field - The picked field.
   *
   * @returns {void}
   */
  protected onSortFieldPicked(field: InterventionSortField | null | undefined): void {
    if (field) this.applySortField(field);
  }

  /**
   * Method toggleSortDirection
   * @method toggleSortDirection
   *
   * @description
   * Flips the active ordering's direction without changing its field — the
   * Display popover's direction button, independent of {@link applySortField}
   * because a field pick there must never also reverse it.
   *
   * @access protected
   * @since 6.7.0
   *
   * @returns {void}
   */
  protected toggleSortDirection(): void {
    this.page.set(1);
    this.sortOrder.update((current: InterventionListSort) => ({
      field: current.field,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    }));
    this.persistListPreferences();
  }

  /**
   * Method toggleColumn
   * @method toggleColumn
   *
   * @description
   * Shows or hides an optional column.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {void}
   */
  protected toggleColumn(id: InterventionTableColumn): void {
    const next: Set<InterventionTableColumn> = new Set(this.hiddenColumns());

    if (!next.delete(id)) next.add(id);

    this.hiddenColumns.set(next);
    this.persistListPreferences();
  }

  /**
   * Method isColumnVisible
   * @method isColumnVisible
   *
   * @description
   * Whether a column currently renders, for the menu's checked state.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {boolean} True when shown.
   */
  protected isColumnVisible(id: InterventionTableColumn): boolean {
    return !this.hiddenColumns().has(id);
  }

  /**
   * Method columnLabelOf
   * @method columnLabelOf
   *
   * @description
   * Names a column in the visibility menu.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {string} Its localized label.
   */
  protected columnLabelOf(id: InterventionTableColumn): string {
    switch (id) {
      case 'status':
        return $localize`:@@intervention.list.columnStatus:Status`;
      case 'priority':
        return $localize`:@@intervention.list.columnPriority:Priority`;
      case 'type':
        return $localize`:@@intervention.list.columnType:Type`;
      case 'site':
        return $localize`:@@intervention.list.columnSite:Site`;
      default:
        return $localize`:@@intervention.list.columnDue:Due`;
    }
  }

  /**
   * Method goToPage
   * @method goToPage
   *
   * @description
   * Moves the page window, clamped to the available range.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {number} target - The one-based page to show.
   *
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method setPageSize
   * @method setPageSize
   *
   * @description
   * Changes how many rows a page holds and returns to the first one, so the
   * window never lands past the end.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {number} size - Rows per page.
   *
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.persistListPreferences();
  }

  /**
   * Method filterClearPatchOf
   *
   * @description
   * The `applyFilter` patch that clears one field back to `null` — what
   * {@link onFieldRemoved} keys off, typed exhaustively rather than an
   * indexed `{ [key]: null }` so a new field added to
   * {@link InterventionFilterFieldKey} fails to compile here until it is
   * handled.
   *
   * @access private
   * @since 6.5.0
   *
   * @param {InterventionFilterFieldKey} key - The field to clear.
   *
   * @returns {Partial<InterventionListFilters>} The clearing patch.
   */
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

  /**
   * Method restoreHiddenColumns
   *
   * @description
   * Narrows the cookie's raw hidden-column ids to the columns this build
   * offers, so a column retired since the cookie was written is ignored.
   *
   * @access private
   * @since 4.6.0
   *
   * @returns {ReadonlySet<InterventionTableColumn>} The restored hidden set.
   */
  private restoreHiddenColumns(): ReadonlySet<InterventionTableColumn> {
    const stored: ReadonlySet<string> = this.preferences.readHiddenColumns();

    return new Set<InterventionTableColumn>(
      INTERVENTION_TABLE_COLUMNS.filter((column) => stored.has(column)),
    );
  }

  /**
   * Method restorePageSize
   *
   * @description
   * The remembered rows-per-page when it is one of the sizes this build
   * offers, or the default otherwise.
   *
   * @access private
   * @since 4.6.0
   *
   * @returns {number} The restored page size.
   */
  private restorePageSize(): number {
    const stored: number | null = this.preferences.readPageSize();

    return stored !== null && PAGE_SIZES.includes(stored) ? stored : PAGE_SIZES[0];
  }

  /**
   * Method persistListPreferences
   *
   * @description
   * Writes the list's current shape — sort, hidden columns, page size — to the
   * preferences cookie in one pass. Filters are deliberately not included.
   *
   * @access private
   * @since 4.6.0
   *
   * @returns {void}
   */
  private persistListPreferences(): void {
    this.preferences.write(this.sortOrder(), this.hiddenColumns(), this.pageSize());
  }

  /**
   * Method openCreate
   * @method openCreate
   *
   * @description
   * Opens the creation sheet blank — drops any prefill a previous
   * "Duplicate" left behind.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openCreate(): void {
    this.duplicatePrefill.set(null);
    this.createSheetVisible.set(true);
  }

  /**
   * Method requestDuplicate
   * @method requestDuplicate
   *
   * @description
   * Opens the creation sheet prefilled from a row's own "Duplicate" entry.
   *
   * @access protected
   * @since 6.1.0
   *
   * @param {InterventionOutput} intervention - The row "Duplicate" was invoked on.
   *
   * @returns {void}
   */
  protected requestDuplicate(intervention: InterventionOutput): void {
    this.duplicatePrefill.set(buildInterventionDuplicatePrefill(intervention));
    this.createSheetVisible.set(true);
  }

  /**
   * Method onCreateSheetVisibleChange
   * @method onCreateSheetVisibleChange
   *
   * @description
   * Relays the sheet's open/closed state and, on close, drops any duplicate
   * prefill — mirroring how the sheet clears its own template-picker
   * selection on close, one level up since the prefill is this page's state.
   *
   * @access protected
   * @since 6.1.0
   *
   * @param {boolean} visible - The sheet's next visibility.
   *
   * @returns {void}
   */
  protected onCreateSheetVisibleChange(visible: boolean): void {
    this.createSheetVisible.set(visible);

    if (!visible) this.duplicatePrefill.set(null);
  }

  /**
   * Method createIntervention
   * @method createIntervention
   *
   * @description
   * Hands the form's values to the store. The sheet closes and the page
   * navigates once the store reports the new record.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionCreateFormValues} values - The validated draft.
   *
   * @returns {void}
   */
  protected createIntervention(values: InterventionCreateFormValues): void {
    this.store.create({
      organizationId: this.organizationId(),
      name: values.name,
      type: values.type,
      priority: values.priority,
      site: values.site || undefined,
      responsible: values.responsible || undefined,
      plannedStartAt: values.plannedStartAt ?? undefined,
      dueAt: values.dueAt ?? undefined,
    });
  }

  /**
   * Method instantiateFromTemplate
   * @method instantiateFromTemplate
   *
   * @description
   * Hands the chosen template to the store. The sheet closes and the page
   * navigates once the store reports the new draft, the same as
   * {@link createIntervention}.
   *
   * @access protected
   * @since 4.3.0
   *
   * @param {string} templateId - The chosen template.
   *
   * @returns {void}
   */
  protected instantiateFromTemplate(templateId: string): void {
    this.store.instantiateFromTemplate({ templateId });
  }

  /**
   * Method applyTransition
   * @method applyTransition
   *
   * @description
   * Moves an intervention to the status its row menu offered. The store owns
   * the optimistic patch, the `If-Match` revision and the rollback.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTransitionRequest} request - The intervention and its target.
   *
   * @returns {void}
   */
  protected applyTransition(request: InterventionTransitionRequest): void {
    this.store.transition({
      id: request.intervention.id,
      status: request.status,
      revision: request.intervention.revision,
    });
  }

  /**
   * Method copyReference
   * @method copyReference
   *
   * @description
   * Puts an intervention's `FG-…` reference on the clipboard.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {void}
   */
  protected copyReference(intervention: InterventionOutput): void {
    void navigator.clipboard?.writeText(`FG-${intervention.number}`);
  }

  /**
   * Method onSelectionChanged
   * @method onSelectionChanged
   *
   * @description
   * Records the table's next row selection.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {ReadonlySet<string>} ids - The full next selection.
   *
   * @returns {void}
   */
  protected onSelectionChanged(ids: ReadonlySet<string>): void {
    this.selectedIds.set(ids);
  }

  /**
   * Method requestDelete
   * @method requestDelete
   *
   * @description
   * Opens the confirm dialog for a single row's Delete entry.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {void}
   */
  protected requestDelete(intervention: InterventionOutput): void {
    this.store.resetDeleteState();
    this.pendingDelete.set(intervention);
  }

  /**
   * Method requestBulkDelete
   * @method requestBulkDelete
   *
   * @description
   * Opens the confirm dialog for the selection's deletable subset. A no-op
   * when nothing selected can actually be deleted.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  protected requestBulkDelete(): void {
    const ids: ReadonlyArray<string> = this.deletableSelectedIds();

    if (ids.length === 0) return;

    this.store.resetDeleteState();
    this.pendingBulkDeleteIds.set(ids);
  }

  /**
   * Method confirmDelete
   * @method confirmDelete
   *
   * @description
   * Sends the pending target(s) to the store. A single row's confirmation
   * stays open, busy-disabled, until `deleteCallState` settles — the
   * constructor effect closes it on success, and a failure surfaces inline
   * rather than closing under the operator. A bulk selection is fired and
   * forgotten instead: each id resolves back to its cached revision and
   * calls `store.delete` once, concurrently via the store's `mergeMap`, each
   * reporting its own success or failure as a toast — attributing one shared
   * call state to several in-flight writes would not reliably tell the
   * dialog when every one of them has settled.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {void}
   */
  protected confirmDelete(): void {
    const single: InterventionOutput | null = this.pendingDelete();
    if (single) {
      this.store.delete({ interventionId: single.id, revision: single.revision });
    }

    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();
    if (bulkIds) {
      const byId: ReadonlyMap<string, InterventionOutput> = new Map(
        this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
          item.intervention.id,
          item.intervention,
        ]),
      );

      for (const id of bulkIds) {
        const intervention: InterventionOutput | undefined = byId.get(id);
        if (intervention) {
          this.store.delete({ interventionId: intervention.id, revision: intervention.revision });
        }
      }

      this.selectedIds.set(new Set<string>());
    }

    this.pendingBulkDeleteIds.set(null);
  }

  /**
   * Method onDeleteDialogStateChanged
   * @method onDeleteDialogStateChanged
   *
   * @description
   * Clears both pending-delete signals on any dismissal — Cancel, the
   * backdrop or Escape — so the dialog and its target signals never drift
   * apart.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {BrnDialogState} state - The overlay's new state.
   *
   * @returns {void}
   */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.pendingDelete.set(null);
    this.pendingBulkDeleteIds.set(null);
  }

  /**
   * Method transitionableSelectedIds
   * @method transitionableSelectedIds
   *
   * @description
   * Ids of the current selection that may actually move to `target`: the
   * row's own transition must not be in flight (its cached
   * `allowedTransitions`/`revision` are stale until the server confirms),
   * its `allowedTransitions` must include the target, and — mirroring
   * `InterventionDetailPage`'s `canSubmit` identity gate — submitting or
   * withdrawing a submission is reserved to the row's own responsible.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionStatus} target - The status the bulk action targets.
   *
   * @returns {ReadonlyArray<string>} The eligible ids.
   */
  protected transitionableSelectedIds(target: InterventionStatus): ReadonlyArray<string> {
    const selected: ReadonlySet<string> = this.selectedIds();
    const transitioning: readonly string[] = this.store.transitioningInterventionIds();
    const currentMemberIri: string | null = this.memberIri();

    return this.items()
      .filter((item: InterventionListItemViewModel): boolean => selected.has(item.intervention.id))
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          !transitioning.includes(item.intervention.id),
      )
      .filter((item: InterventionListItemViewModel): boolean =>
        item.intervention.allowedTransitions.includes(target),
      )
      .filter((item: InterventionListItemViewModel): boolean => {
        const requiresIdentity: boolean =
          target === 'submitted' ||
          (item.intervention.status === 'submitted' && target === 'in_progress');

        return !requiresIdentity || currentMemberIri === item.intervention.responsible;
      })
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  }

  /**
   * Method confirmBulkTransition
   * @method confirmBulkTransition
   *
   * @description
   * Sends the selection's eligible subset for `target` to the store, one
   * `transition` call per intervention with its own cached revision, and
   * clears the selection — mirroring `confirmDelete`'s bulk branch.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionStatus} target - The status to move the eligible rows to.
   *
   * @returns {void}
   */
  protected confirmBulkTransition(target: InterventionStatus): void {
    const ids: ReadonlyArray<string> = this.transitionableSelectedIds(target);
    if (ids.length === 0) return;

    const byId: ReadonlyMap<string, InterventionOutput> = new Map(
      this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
        item.intervention.id,
        item.intervention,
      ]),
    );

    for (const id of ids) {
      const intervention: InterventionOutput | undefined = byId.get(id);
      if (intervention) {
        this.store.transition({
          id: intervention.id,
          status: target,
          revision: intervention.revision,
        });
      }
    }

    this.selectedIds.set(new Set<string>());
  }

  /**
   * Method requestAssign
   * @method requestAssign
   *
   * @description
   * Opens the assign dialog for a single row's "Assign responsible…" entry.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {void}
   */
  protected requestAssign(intervention: InterventionOutput): void {
    this.pendingBulkAssignIds.set(null);
    this.assignRequest.set({
      interventionId: intervention.id,
      interventionName: intervention.name,
      currentResponsible: intervention.responsible,
    });
  }

  /**
   * Method requestBulkAssign
   * @method requestBulkAssign
   *
   * @description
   * Opens the assign dialog for the selection's assignable subset. A no-op
   * when nothing selected can actually be assigned.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected requestBulkAssign(): void {
    const ids: ReadonlyArray<string> = this.assignableSelectedIds();
    if (ids.length === 0) return;

    this.pendingBulkAssignIds.set(ids);
    this.assignRequest.set({
      interventionId: '',
      interventionName:
        ids.length === 1
          ? $localize`:@@intervention.list.bulkAssignNameOne:1 intervention`
          : $localize`:@@intervention.list.bulkAssignNameMany:${ids.length}:count: interventions`,
      currentResponsible: null,
    });
  }

  /**
   * Method submitAssign
   * @method submitAssign
   *
   * @description
   * Sends the picked responsible to the store: once for the single pending
   * row, or once per eligible id when the dialog was opened from the bulk
   * toolbar — each call carries that row's own cached revision, mirroring
   * `confirmDelete`'s bulk branch.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionAssignSubmittedEvent} event - The picked member.
   *
   * @returns {void}
   */
  protected submitAssign(event: InterventionAssignSubmittedEvent): void {
    const byId: ReadonlyMap<string, InterventionOutput> = new Map(
      this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
        item.intervention.id,
        item.intervention,
      ]),
    );

    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkAssignIds();
    if (bulkIds) {
      for (const id of bulkIds) {
        const intervention: InterventionOutput | undefined = byId.get(id);
        if (intervention) {
          this.store.assignResponsible({
            interventionId: intervention.id,
            responsible: event.responsible,
            revision: intervention.revision,
          });
        }
      }
      this.selectedIds.set(new Set<string>());
    } else {
      const intervention: InterventionOutput | undefined = byId.get(event.interventionId);
      if (intervention) {
        this.store.assignResponsible({
          interventionId: intervention.id,
          responsible: event.responsible,
          revision: intervention.revision,
        });
      }
    }

    this.assignRequest.set(null);
    this.pendingBulkAssignIds.set(null);
  }

  /**
   * Method dismissAssign
   * @method dismissAssign
   *
   * @description
   * Closes the assign dialog without submitting — Escape, the backdrop or Cancel.
   *
   * @access protected
   * @since 6.0.0
   *
   * @returns {void}
   */
  protected dismissAssign(): void {
    this.assignRequest.set(null);
    this.pendingBulkAssignIds.set(null);
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Re-runs the current query after a failure.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: {
        ...buildInterventionListOptions(
          this.filters(),
          this.sortOrder(),
          this.searchTerm(),
          new Date(),
          this.filters().mine ? this.memberIri() : null,
        ),
        page: this.page(),
        itemsPerPage: this.pageSize(),
      },
    });
  }

  /**
   * Method exportCsv
   * @method exportCsv
   *
   * @description
   * Downloads the current question as CSV — same filters, same sort, same
   * visible columns. The already-loaded page is exported directly when it
   * is the entire matching collection; otherwise every matching row is
   * drained first through `InterventionService.listAll`, capped at
   * {@link EXPORT_ROW_CAP} rows with a toast when the cap truncates the file.
   *
   * @access protected
   * @since 6.2.0
   *
   * @returns {void}
   */
  protected exportCsv(): void {
    const loaded: readonly InterventionOutput[] = this.store.interventionList();
    const total: number = this.store.totalInterventions();

    if (total === 0) return;

    if (total <= loaded.length) {
      this.downloadInterventionCsv(loaded);
      return;
    }

    this.exportBusy.set(true);

    this.interventionService
      .listAll(this.organizationId(), {
        ...buildInterventionListOptions(
          this.filters(),
          this.sortOrder(),
          this.searchTerm(),
          new Date(),
          this.filters().mine ? this.memberIri() : null,
        ),
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows: readonly InterventionOutput[]): void => {
          this.exportBusy.set(false);

          const capped: boolean = rows.length > EXPORT_ROW_CAP;
          if (capped) {
            this.feedback.warn(
              $localize`:@@intervention.list.exportCapped:Export capped at ${EXPORT_ROW_CAP}:cap: rows.`,
            );
          }

          this.downloadInterventionCsv(capped ? rows.slice(0, EXPORT_ROW_CAP) : rows);
        },
        error: (): void => {
          this.exportBusy.set(false);
          this.feedback.error(
            $localize`:@@intervention.list.exportFailed:Couldn't export interventions.`,
          );
        },
      });
  }

  /** Serializes `rows` into CSV and triggers the browser download. */
  private downloadInterventionCsv(rows: readonly InterventionOutput[]): void {
    const csv: string = buildInterventionCsv(rows, this.visibleColumns(), {
      columnLabelOf: (id: InterventionTableColumn): string => this.columnLabelOf(id),
      statusLabelOf: this.statusLabelOf,
      typeLabelOf: this.typeLabelOf,
      priorityLabelOf: this.priorityLabelOf,
      siteLabelOf: this.siteLabelOf,
    });

    const blob: Blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    this.browserDownload.trigger(blob, this.exportFilename());
  }

  /** The export's filename: the organization, stamped with today's date (`yyyyMMdd`). */
  private exportFilename(): string {
    const now: Date = new Date();
    const yyyy: string = String(now.getFullYear());
    const mm: string = String(now.getMonth() + 1).padStart(2, '0');
    const dd: string = String(now.getDate()).padStart(2, '0');

    return `interventions-${this.organizationId()}-${yyyy}${mm}${dd}.csv`;
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

  /** Projects one intervention into the row view model. */
  private toItemViewModel(intervention: InterventionOutput): InterventionListItemViewModel {
    const isTerminal: boolean =
      intervention.status === 'published' || intervention.status === 'abandoned';
    const dueTime: number | null = intervention.dueAt
      ? new Date(intervention.dueAt).getTime()
      : null;
    const isOverdue: boolean = dueTime !== null && !isTerminal && dueTime < Date.now();
    const isDueSoon: boolean =
      dueTime !== null && !isTerminal && !isOverdue && dueTime - Date.now() <= DUE_SOON_WINDOW_MS;

    const memberIris: readonly string[] = [
      intervention.responsible,
      ...intervention.participants,
    ].filter((iri, index, all): iri is string => !!iri && all.indexOf(iri) === index);

    return {
      intervention,
      isOverdue,
      isDueSoon,
      siteName: intervention.site ? (this.siteDisplayMap().get(intervention.site) ?? null) : null,
      people: memberIris.map((iri: string): MemberAvatar => this.toPerson(iri)),
    };
  }

  /** Resolves a member IRI to an avatar, naming them rather than showing a hole. */
  private toPerson(memberIri: string): MemberAvatar {
    const member: MemberSelectOption | undefined = this.memberDisplayMap().get(memberIri);

    if (!member) {
      return { label: $localize`:@@intervention.list.memberFallback:Member` };
    }

    return {
      label: member.displayName,
      image: member.avatarUrl ?? undefined,
      tooltip: member.roleLabel
        ? `${member.displayName} · ${member.roleLabel}`
        : member.displayName,
    };
  }
  //#endregion
}
