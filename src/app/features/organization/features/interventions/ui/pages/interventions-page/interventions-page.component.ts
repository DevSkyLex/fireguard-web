import { isPlatformBrowser } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
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
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallPending, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import {
  resolveInterventionTag,
  type InterventionAssignRequest,
  type InterventionAssignSubmittedEvent,
  type InterventionCalendarFilters,
  type InterventionDueRangeFilter,
  type InterventionDuplicatePrefill,
  type InterventionFilterFieldKey,
  type InterventionFilterFieldOption,
  type InterventionListFilters,
  type InterventionListOptions,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionPlannedStartRangeFilter,
  type InterventionPriority,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionTemplateInstantiateRequest,
  type InterventionType,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import {
  INTERVENTION_FILTER_FIELDS,
  INTERVENTION_PRIORITY_FILTER_OPTIONS,
  INTERVENTION_SORT_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from '@features/organization/features/interventions/options';
import {
  BrowserDownloadService,
  InterventionListPreferencesService,
} from '@features/organization/features/interventions/services';
import {
  InterventionStore,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import { buildInterventionDuplicatePrefill } from '@features/organization/features/interventions/utils';
import {
  buildInterventionExportOptions,
  buildInterventionListOptions,
  parseInterventionListFilters,
  serializeInterventionListFilters,
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
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmToggle } from '@shared/ui/toggle';
import { HlmTooltip } from '@shared/ui/tooltip';
import {
  InterventionCalendarStore,
  type InterventionCalendarStoreType,
} from '../../../state/intervention-calendar';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '../../../state/intervention-planning-options';
import {
  InterventionRecurrenceStore,
  type InterventionRecurrenceStoreType,
} from '../../../state/intervention-recurrence';
import {
  InterventionStatisticsStore,
  type InterventionStatisticsStoreType,
} from '../../../state/intervention-statistics';
import { InterventionBoard } from '../../components/intervention-board';
import type { InterventionBoardCardViewModel } from '../../components/intervention-board/models';
import { InterventionCalendar } from '../../components/intervention-calendar';
import { InterventionKpiStrip } from '../../components/intervention-kpi-strip';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionAssignDialog } from '../../dialogs/intervention-assign-dialog';
import { InterventionBulkDeleteDialog } from '../../dialogs/intervention-bulk-delete-dialog';
import type { InterventionCreateFormValues } from '../../forms/intervention-create-form';
import { InterventionCreateSheet } from '../../sheets/intervention-create-sheet';
import {
  InterventionRecurrencesSheet,
  type InterventionRecurrenceFormSubmittedEvent,
} from '../../sheets/intervention-recurrences-sheet';
import {
  INTERVENTION_TABLE_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import type { InterventionListItemViewModel } from './models';

/** How close a deadline must be to count as "due soon". */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/** The page sizes offered under the table — the server default first, its clamp last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The one large page the Board asks for — see {@link InterventionsPage}'s class doc, "Board". */
const BOARD_PAGE_SIZE: number = 200;

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
 * Type InterventionView
 * @description Which of the three collection surfaces this page currently shows — driven by the `?view=` query param (`board`/`calendar`; absent or any other value ⇒ `list`) and written back on a tab switch with `queryParamsHandling: 'merge'`, so the active narrowing survives the switch.
 * @since 11.0.0
 */
type InterventionView = 'list' | 'board' | 'calendar';

/**
 * Type InterventionDueRangeOperator
 * @description The three operators the "Deadline" chip's own `dueRange` field declares.
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
 * Constant INTERVENTION_VIEW_HONOURED_FILTER_KEYS
 * @const INTERVENTION_VIEW_HONOURED_FILTER_KEYS
 *
 * @description
 * Which of the filter bar's eight fields each {@link InterventionView}
 * actually applies — the sole consumer is this page's own
 * {@link InterventionsPage.isFieldIgnored}, so it lives beside the page
 * rather than in a shared `constants/` or `options/` unit (rule of three).
 * The list honours all eight; the board omits `status` (its columns already
 * narrow by status); the calendar honours only `status`, `type`, `site` and
 * `responsible` (`InterventionCalendarFilters`'s own `Pick`). A chip whose
 * field the active view does not honour still renders when active, but
 * disabled and greyed, with an `hlmTooltip` naming the reason — never
 * silently dropped, never silently misapplied.
 *
 * @since 11.0.0
 *
 * @type {Readonly<Record<InterventionView, readonly InterventionFilterFieldKey[]>>}
 */
const INTERVENTION_VIEW_HONOURED_FILTER_KEYS: Readonly<
  Record<InterventionView, readonly InterventionFilterFieldKey[]>
> = {
  list: [
    'status',
    'type',
    'priority',
    'site',
    'responsible',
    'label',
    'dueRange',
    'plannedStartRange',
  ],
  board: ['type', 'priority', 'site', 'responsible', 'label', 'dueRange', 'plannedStartRange'],
  calendar: ['status', 'type', 'site', 'responsible'],
};

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization's interventions
 * (`/organizations/:organizationId/interventions`): the KPI strip, the
 * toolbar (search box, "My interventions", the filter bar and its eight
 * chips, the List/Board/Calendar tabs), and each tab's own surface — the
 * table with its Display popover and row/bulk actions on List, the Kanban
 * board on Board, the month grid on Calendar — plus the sheets and dialogs
 * any of the three can open.
 *
 * **One page, three tabs, replacing three routes.** `InterventionsShellPage`,
 * `InterventionsBoardPage` and `InterventionsCalendarPage` are retired: the
 * List/Board/Calendar switcher is now `hlm-tabs` (`@shared/ui/tabs`) instead
 * of a routed `<router-outlet />`, and `InterventionBoard`/
 * `InterventionCalendar` (`ui/components/`) are presentational components
 * this page feeds, not pages of their own — a table, a board or a calendar
 * never injects a store (`ARCHITECTURE.md` §10.3), and one physical page
 * means the toolbar, the KPI strip and the filter bar are built once instead
 * of coordinated across three components through a `TemplateRef` slot. The
 * active tab is **not** local component state: it is the `view` route-bound
 * input (`?view=board|calendar`, absent ⇒ `list`), read into
 * {@link activeView} and written back by {@link switchView} with
 * `queryParamsHandling: 'merge'` so every other filter param survives the
 * switch — `/interventions/board` and `/interventions/calendar` still exist
 * as addressable URLs, as functional `redirectTo` entries onto this one
 * (`interventions.routes.ts`).
 *
 * **Board and Calendar share this page's own stores rather than injecting
 * their own.** The Board renders the same `InterventionStore` the table
 * does — {@link boardFilters} forces `status` to `null` (its columns are the
 * narrowing) and the Board's own load effect asks for one large page
 * (`BOARD_PAGE_SIZE`, 200) instead of the table's paginated window, gated on
 * {@link activeView} so switching tabs does not fight over the same cached
 * page. The Calendar reads a bounded date window instead, an incompatible
 * shape for the same entity cache, so it gets its own component-scoped
 * `InterventionCalendarStore` — provided here, on this page, since only a
 * page may inject a store — fed to `InterventionCalendar` through inputs and
 * driven back by its `monthChanged`/`reloadRequested` outputs.
 * {@link calendarMonth} starts `null` and the load effect no-ops until
 * `InterventionCalendar` reports its first anchor, which only happens once
 * it exists — behind `hlmTabsContentLazy`, on the Calendar tab's first
 * activation — so visiting List or Board first never fetches the calendar's
 * window.
 *
 * It owns what a table, a board or a calendar must not — the query each
 * sends, the `?q=`/`?create=`/filter params it round-trips, the ordering,
 * the column visibility and the page window (`ARCHITECTURE.md` §2.5).
 *
 * Paging, filtering and sorting are server-side end to end for the List
 * tab: the loaded entities ARE the current page, the footer derives its page
 * count from the server's `totalItems`, and any narrowing or search change
 * restarts from page one — {@link page} is a `linkedSignal` over
 * {@link filters} and {@link searchTerm}. The selection clears on every List
 * load: it only ever refers to rows of the page on screen, so the
 * bulk-delete dialog can never promise rows the operator no longer sees.
 *
 * Deletion is confirm-gated: a row's Delete entry and the toolbar's "Delete
 * selected" both set a `pending*` target signal instead of calling the store
 * directly, driving the single `hlm-alert-dialog` shared by both paths. A
 * bulk selection is filtered to the rows whose server-computed
 * `allowedActions.canDelete` is true before the dialog opens, so the count it
 * shows is always what will actually delete — never a promise the API would
 * refuse with a 409.
 *
 * "Duplicate" reuses the same creation sheet, prefilled — from a row's own
 * menu, or from a cross-route handoff `InterventionStore.pendingDuplicatePrefill`
 * carries when the detail page navigates here with `?create=1`. Never a
 * server-side copy: it ends in the normal `create` call, and never carries
 * `status`, the planned window or the review note.
 *
 * The "Display" toolbar button is a `hlm-popover` trigger opening a panel
 * that groups every presentation preference the List tab owns — ordering and
 * column visibility — the way Linear's own Display control does. Display,
 * Recurrences, Export and the bulk-actions menu render only while
 * {@link activeView} is `list`: the Board and the Calendar have no use for
 * any of them.
 *
 * @version 11.0.0
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
    HlmTooltip,
    InterventionAssignDialog,
    InterventionBoard,
    InterventionBulkDeleteDialog,
    InterventionCalendar,
    InterventionCreateSheet,
    InterventionKpiStrip,
    InterventionRecurrencesSheet,
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
    ...HlmTabsImports,
  ],
  providers: [
    InterventionCalendarStore,
    InterventionRecurrenceStore,
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
  /** The workspace whose interventions are shown, bound from the route. */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /** The search term the URL carries. See {@link searchTerm}. */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** `?create=1` opens the creation sheet on arrival — the contract the parent feature's landing page uses to start an intervention. */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /** Which tab is shown — `board`/`calendar`, absent (or any other value) meaning `list`. See {@link activeView}. */
  public readonly view: InputSignal<string | undefined> = input<string | undefined>(undefined);

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

  /** `?mine=1` narrows to the signed-in member (responsible OR participant). */
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
  /** The List/Board tabs' shared dataset. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Site, member and label choices for the filter bar and the creation form. */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /** The KPI strip's organization-wide snapshot. Reloaded only on an organization switch — the figures describe the collection, not one tab's rendering of it. */
  protected readonly statisticsStore: InterventionStatisticsStoreType =
    inject<InterventionStatisticsStoreType>(InterventionStatisticsStore);

  /** The organization's recurring intervention schedules, backing the "Recurrences" sheet. */
  protected readonly recurrenceStore: InterventionRecurrenceStoreType =
    inject<InterventionRecurrenceStoreType>(InterventionRecurrenceStore);

  /** The Calendar tab's own bounded-window dataset — component-scoped here since only a page may inject a store; see class doc. */
  protected readonly calendarStore: InterventionCalendarStoreType =
    inject<InterventionCalendarStoreType>(InterventionCalendarStore);

  /** Organization permission checks gating every tab's write actions. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Whether the app runs in the browser — gates the Calendar's fetch, a dated authenticated read that would immediately refetch after hydration. */
  private readonly platformId: object = inject(PLATFORM_ID);

  /** Router used to open a created intervention's detail page and to round-trip every `?q=`/filter/`?view=` query param. */
  private readonly router: Router = inject(Router);

  /** Current route, anchoring the relative query-param navigations. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The cookie-backed memory of how the List tab was left (sort, columns, page size). */
  private readonly preferences: InterventionListPreferencesService =
    inject<InterventionListPreferencesService>(InterventionListPreferencesService);

  /**
   * Read directly rather than through {@link InterventionStore}: the export
   * is a one-shot, page-local drain of every matching row, and the store's
   * public surface only ever loads and caches one server page at a time.
   */
  private readonly interventionService: InterventionService = inject(InterventionService);

  /** Saves the generated CSV to the visitor's device, browser-only. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Reports the export's outcome — a truncation warning or a failure. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes the export's in-flight drain if the page is left mid-fetch. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Registers {@link pageActions} on the layout header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The signed-in member, resolving the "my interventions" chip and the List tab's identity gates. */
  private readonly memberAccess: OrganizationMemberAccessStoreType =
    inject<OrganizationMemberAccessStoreType>(OrganizationMemberAccessStore);

  /** The "New intervention" header action, shared across all three tabs. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property activeView
   * @readonly
   * @description Which tab is currently shown. See {@link InterventionView} and the `view` input.
   * @access protected
   * @since 11.0.0
   * @type {Signal<InterventionView>}
   */
  protected readonly activeView: Signal<InterventionView> = computed<InterventionView>(() => {
    const requested: string | undefined = this.view();

    return requested === 'board' || requested === 'calendar' ? requested : 'list';
  });

  /**
   * Property memberIri
   * @readonly
   * @description The signed-in member's IRI in this organization, null until the profile resolves — the same identity the detail page's submit gate reads.
   * @access protected
   * @since 5.2.0
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
   * @description The active narrowing, parsed from the URL's query params — the URL is the single source of truth, so a filtered collection is shareable and the back button restores it.
   * @access protected
   * @since 5.2.0
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

  /** {@link filters}, `status` forced to `null` — the Board's columns are the status narrowing, so a `status` value left in the URL by another tab must never reach its query. */
  protected readonly boardFilters: Signal<InterventionListFilters> =
    computed<InterventionListFilters>(() => ({ ...this.filters(), status: null }));

  /** The search as everything downstream reads it: trimmed, never `undefined`. */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The active ordering, restored from the preferences cookie. */
  protected readonly sortOrder: WritableSignal<InterventionListSort> = signal<InterventionListSort>(
    this.preferences.readSort(),
  );

  /** Which optional columns the operator has hidden, restored from the preferences cookie. */
  protected readonly hiddenColumns: WritableSignal<ReadonlySet<InterventionTableColumn>> = signal<
    ReadonlySet<InterventionTableColumn>
  >(this.restoreHiddenColumns());

  /** Whether an export request is currently in flight. */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property page
   * @readonly
   * @description The List tab's page window, one-based — a `linkedSignal` over {@link filters} and {@link searchTerm} so it resets to `1` whenever either changes.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = linkedSignal<number>((): number => {
    this.filters();
    this.searchTerm();
    return 1;
  });

  /** How many rows a page holds, restored from the preferences cookie. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(this.restorePageSize());

  /** Whether the creation sheet is open. */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the "Recurrences" sheet is open. */
  protected readonly recurrencesVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** What the creation sheet is currently prefilled with, from a "Duplicate" request. `null` for a plain "New intervention". */
  protected readonly duplicatePrefill: WritableSignal<InterventionDuplicatePrefill | null> =
    signal<InterventionDuplicatePrefill | null>(null);

  /** Currently selected row ids, scoped to the loaded List page — cleared on every List load. */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /** The intervention a row's menu asked to delete, pending confirmation. */
  protected readonly pendingDelete: WritableSignal<InterventionOutput | null> =
    signal<InterventionOutput | null>(null);

  /** The selected, deletable ids the toolbar asked to bulk-delete, pending confirmation. */
  protected readonly pendingBulkDeleteIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /** What `InterventionAssignDialog` is currently asking to assign, or `null` to keep it closed. */
  protected readonly assignRequest: WritableSignal<InterventionAssignRequest | null> =
    signal<InterventionAssignRequest | null>(null);

  /** The selected, assignable ids the toolbar asked to bulk-assign, pending the dialog. */
  protected readonly pendingBulkAssignIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /** The Calendar tab's displayed anchor — `null` until `InterventionCalendar` reports its first one, which gates the load effect until the tab actually activates. */
  protected readonly calendarMonth: WritableSignal<Date | null> = signal<Date | null>(null);

  /** Every hideable column, for the Display popover's column list. */
  protected readonly allColumns: ReadonlyArray<InterventionTableColumn> =
    INTERVENTION_TABLE_COLUMNS;

  /** Orderings the Display popover's field select offers. */
  protected readonly sortOptions: SelectOption<InterventionSortField>[] = INTERVENTION_SORT_OPTIONS;

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

  /** Whether the export button should be inert: nothing loaded yet, nothing matches the current query, or an export is already in flight. */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean =>
      this.store.isLoadingInterventions() ||
      this.exportBusy() ||
      this.store.totalInterventions() === 0,
  );

  /** Where a row's link points, on every tab. */
  protected readonly detailRouteBase: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['/organizations', this.organizationId(), 'interventions'],
  );

  /** Whether the member may move an intervention along — the List row menu's and the Board card's own gate. */
  protected readonly canTransition: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
    ]),
  );

  /** Whether the member may delete an intervention. */
  protected readonly canDelete: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
    ]),
  );

  /** Whether the member may assign a responsible. */
  protected readonly canAssign: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Whether the "Recurrences" toolbar entry renders at all. */
  protected readonly canReadRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /** Whether the "Recurrences" sheet offers create/edit/delete/toggle, or renders read-only. */
  protected readonly canWriteRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Whether the member may duplicate an intervention. */
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

  /** Every loaded intervention as a List row view model. */
  protected readonly items: Signal<readonly InterventionListItemViewModel[]> = computed(() =>
    this.store
      .interventionList()
      .map((intervention: InterventionOutput) => this.toItemViewModel(intervention)),
  );

  /** Every loaded intervention as a Board card view model — see {@link boardFilters}, which shapes what {@link InterventionStore.interventionList} holds while the Board tab is active. */
  protected readonly boardItems: Signal<readonly InterventionBoardCardViewModel[]> = computed(() =>
    this.store
      .interventionList()
      .map((intervention: InterventionOutput) => this.toBoardCardViewModel(intervention)),
  );

  /** How many pages the whole server-side List collection fills — at least one, so the footer never reads "Page 1 of 0". */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalInterventions() / this.pageSize())),
  );

  /** Ids of the current selection that are actually deletable — the rows whose server-computed `allowedActions.canDelete` is true. */
  protected readonly deletableSelectedIds: Signal<ReadonlyArray<string>> = computed(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return this.items()
      .filter(
        (item: InterventionListItemViewModel): boolean =>
          selected.has(item.intervention.id) &&
          item.intervention.allowedActions?.canDelete === true,
      )
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  });

  /** The bulk-delete button's label, counting only the deletable subset of the selection. */
  protected readonly bulkDeleteLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.bulkDeleteButton:Delete (${this.deletableSelectedIds().length}:count:)`,
  );

  /** Ids of the current selection that are actually assignable — status `draft` or `planned`. */
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

  /** The bulk-assign menu entry's label, counting only the assignable subset of the selection. */
  protected readonly bulkAssignLabel: Signal<string> = computed<string>(
    () =>
      $localize`:@@intervention.list.bulkAssignButton:Assign responsible… (${this.assignableSelectedIds().length}:count:)`,
  );

  /** Every status the current selection could move to — the bulk "Move to" menu's own entries. */
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

  /** Whether the store's assignment write is in flight, disabling the dialog's submit while it runs. */
  protected readonly assignDialogBusy: Signal<boolean> = computed<boolean>(() =>
    isCallPending(this.store.assignCallState()),
  );

  /** The confirm dialog's open/closed state, derived from whichever `pending*` target signal is set. */
  protected readonly deleteDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingDelete() !== null || this.pendingBulkDeleteIds() !== null ? 'open' : 'closed',
  );

  /** The confirm dialog's title, naming the count for a bulk deletion. */
  protected readonly deleteDialogTitle: Signal<string> = computed<string>(() => {
    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();

    if (bulkIds && bulkIds.length > 1) {
      return $localize`:@@intervention.list.deleteConfirmTitleMany:Delete ${bulkIds.length}:count: interventions?`;
    }

    return $localize`:@@intervention.list.deleteConfirmTitleOne:Delete intervention?`;
  });

  /** The confirm dialog's body: names the intervention for a single row, counts them for a bulk selection. */
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

  /** Whether a search is active, which decides between the no-results and the first-run empty state. */
  protected readonly hasSearch: Signal<boolean> = computed<boolean>(
    () => this.searchTerm().length > 0,
  );

  /** Whether the List tab's last load failed. */
  protected readonly hasError: Signal<boolean> = computed<boolean>(
    () => this.store.listError() !== null,
  );

  /** Names a status on a closed select trigger, in the column menu, and in the bulk "Move to" menu. */
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

  /** Names an ordering field on the Display popover's closed select trigger. */
  protected readonly sortFieldLabelOf: (value: InterventionSortField) => string = (
    value: InterventionSortField,
  ): string =>
    this.sortOptions.find(
      (option: SelectOption<InterventionSortField>): boolean => option.value === value,
    )?.label ?? '';

  /** The Display popover's direction toggle button label, naming the active ordering rather than the action a click performs. */
  protected readonly sortDirectionLabel: Signal<string> = computed<string>(() =>
    this.sortOrder().direction === 'asc'
      ? $localize`:@@intervention.list.sortAscending:Ascending`
      : $localize`:@@intervention.list.sortDescending:Descending`,
  );

  /**
   * Method multiLabel
   * @description Wraps one of the six `…LabelOf` single-item labellers for `hlm-select-multiple`'s `itemToString`.
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

  /**
   * Property honouredFilterKeys
   * @readonly
   * @description The active tab's declared entry in {@link INTERVENTION_VIEW_HONOURED_FILTER_KEYS}.
   * @access protected
   * @since 11.0.0
   * @type {Signal<ReadonlySet<InterventionFilterFieldKey>>}
   */
  protected readonly honouredFilterKeys: Signal<ReadonlySet<InterventionFilterFieldKey>> = computed<
    ReadonlySet<InterventionFilterFieldKey>
  >(() => new Set(INTERVENTION_VIEW_HONOURED_FILTER_KEYS[this.activeView()]));

  /** Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input and the filter-toggle's badge count. */
  protected readonly activeFilterKeys: Signal<readonly InterventionFilterFieldKey[]> = computed<
    readonly InterventionFilterFieldKey[]
  >(() => {
    const filters: InterventionListFilters = this.filters();

    return INTERVENTION_FILTER_FIELDS.filter(
      (field: InterventionFilterFieldOption): boolean => filters[field.key] !== null,
    ).map((field: InterventionFilterFieldOption): InterventionFilterFieldKey => field.key);
  });

  /** Whether `app-collection-filter-bar` is currently mounted below the toolbar. */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** Which field's value selector currently renders forced open — `null` when none is. */
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

  /** The "Deadline" chip's own currently-selected operator. */
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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Registers the "New intervention" page action, wires the search debounce,
   * and loads each of the three tabs' own dataset — the List and the Board
   * gated on {@link activeView}, the Calendar gated on {@link calendarMonth}
   * reporting its first anchor.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.statisticsStore.load(organizationId);
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.planningOptions.loadCreationOptions(organizationId);
      });
    });

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
      const view: InterventionView = this.activeView();
      const organizationId: string = this.organizationId();
      const filters: InterventionListFilters = this.filters();
      const sort: InterventionListSort = this.sortOrder();
      const search: string = this.searchTerm();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const memberIri: string | null = filters.mine ? this.memberIri() : null;

      untracked((): void => {
        if (view !== 'list') return;

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
      const view: InterventionView = this.activeView();
      const organizationId: string = this.organizationId();
      const filters: InterventionListFilters = this.boardFilters();
      const search: string = this.searchTerm();

      untracked((): void => {
        if (view !== 'board') return;

        this.store.load({
          organizationId,
          options: {
            ...buildInterventionListOptions(
              filters,
              { field: 'dueAt', direction: 'asc' },
              search,
              new Date(),
              null,
            ),
            page: 1,
            itemsPerPage: BOARD_PAGE_SIZE,
          },
        });
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const month: Date | null = this.calendarMonth();
      const filters: InterventionListFilters = this.filters();

      untracked((): void => {
        if (month === null || !isPlatformBrowser(this.platformId)) return;

        this.calendarStore.load({
          organizationId,
          window: this.calendarWindowOf(month),
          filters: this.toCalendarFilters(filters),
        });
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
   * Method switchView
   * @description The tab list's `tabActivated` handler — writes the new `?view=` and merges it with every other query param, dropping `status` when switching to the Board (its columns already narrow by status, so a value inherited from the List would either duplicate or contradict the column split).
   * @access protected
   * @since 11.0.0
   * @param {string} tab - The activated tab id (`list`/`board`/`calendar`).
   * @returns {void}
   */
  protected switchView(tab: string): void {
    const view: InterventionView = tab === 'board' || tab === 'calendar' ? tab : 'list';
    const patch: Record<string, string | null> = { view: view === 'list' ? null : view };
    if (view === 'board') patch['status'] = null;

    this.navigateQuery(patch);
  }

  /** Drops the search from the URL. */
  protected clearSearch(): void {
    this.page.set(1);
    this.navigateQuery({ q: null });
  }

  /** Orders by a column head. Re-picking the active field reverses it. */
  protected applySortField(field: InterventionSortField): void {
    this.page.set(1);
    this.sortOrder.update((current: InterventionListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.persistListPreferences();
  }

  /** The Display popover's field select emits `null`/`undefined` only while clearing, which this select never does. */
  protected onSortFieldPicked(field: InterventionSortField | null | undefined): void {
    if (field) this.applySortField(field);
  }

  /** Flips the active ordering's direction without changing its field. */
  protected toggleSortDirection(): void {
    this.page.set(1);
    this.sortOrder.update((current: InterventionListSort) => ({
      field: current.field,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    }));
    this.persistListPreferences();
  }

  /** Shows or hides an optional column. */
  protected toggleColumn(id: InterventionTableColumn): void {
    const next: Set<InterventionTableColumn> = new Set(this.hiddenColumns());

    if (!next.delete(id)) next.add(id);

    this.hiddenColumns.set(next);
    this.persistListPreferences();
  }

  /** Whether a column currently renders, for the menu's checked state. */
  protected isColumnVisible(id: InterventionTableColumn): boolean {
    return !this.hiddenColumns().has(id);
  }

  /** Names a column in the visibility menu. */
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

  /** Moves the List page window, clamped to the available range. */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /** Changes how many rows a page holds and returns to the first one. */
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.persistListPreferences();
  }

  /** Narrows the cookie's raw hidden-column ids to the columns this build offers. */
  private restoreHiddenColumns(): ReadonlySet<InterventionTableColumn> {
    const stored: ReadonlySet<string> = this.preferences.readHiddenColumns();

    return new Set<InterventionTableColumn>(
      INTERVENTION_TABLE_COLUMNS.filter((column) => stored.has(column)),
    );
  }

  /** The remembered rows-per-page when it is one of the sizes this build offers, or the default otherwise. */
  private restorePageSize(): number {
    const stored: number | null = this.preferences.readPageSize();

    return stored !== null && PAGE_SIZES.includes(stored) ? stored : PAGE_SIZES[0];
  }

  /** Writes the List tab's current shape — sort, hidden columns, page size — to the preferences cookie in one pass. */
  private persistListPreferences(): void {
    this.preferences.write(this.sortOrder(), this.hiddenColumns(), this.pageSize());
  }

  /** Opens the creation sheet blank — drops any prefill a previous "Duplicate" left behind. */
  protected openCreate(): void {
    this.duplicatePrefill.set(null);
    this.createSheetVisible.set(true);
  }

  /** Opens the creation sheet prefilled from a row's own "Duplicate" entry. */
  protected requestDuplicate(intervention: InterventionOutput): void {
    this.duplicatePrefill.set(buildInterventionDuplicatePrefill(intervention));
    this.createSheetVisible.set(true);
  }

  /** Relays the sheet's open/closed state and, on close, drops any duplicate prefill. */
  protected onCreateSheetVisibleChange(visible: boolean): void {
    this.createSheetVisible.set(visible);

    if (!visible) this.duplicatePrefill.set(null);
  }

  /** Hands the form's values to the store. The sheet closes and the page navigates once the store reports the new record. */
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

  /** Hands the chosen template, plus whichever overrides the sheet drafted, to the store. */
  protected instantiateFromTemplate(request: InterventionTemplateInstantiateRequest): void {
    this.store.instantiateFromTemplate(request);
  }

  /** Moves an intervention to the status a List row's menu or a Board card's move requested. The store owns the optimistic patch, the `If-Match` revision and the rollback. */
  protected applyTransition(request: InterventionTransitionRequest): void {
    this.store.transition({
      id: request.intervention.id,
      status: request.status,
      revision: request.intervention.revision,
    });
  }

  /** Puts an intervention's `FG-…` reference on the clipboard. */
  protected copyReference(intervention: InterventionOutput): void {
    void navigator.clipboard?.writeText(`FG-${intervention.number}`);
  }

  /** Records the List table's next row selection. */
  protected onSelectionChanged(ids: ReadonlySet<string>): void {
    this.selectedIds.set(ids);
  }

  /** Opens the confirm dialog for a single row's Delete entry. */
  protected requestDelete(intervention: InterventionOutput): void {
    this.store.resetDeleteState();
    this.pendingDelete.set(intervention);
  }

  /** Opens the confirm dialog for the selection's deletable subset. A no-op when nothing selected can actually be deleted. */
  protected requestBulkDelete(): void {
    const ids: ReadonlyArray<string> = this.deletableSelectedIds();

    if (ids.length === 0) return;

    this.store.resetDeleteState();
    this.pendingBulkDeleteIds.set(ids);
  }

  /** Sends the pending target(s) to the store. */
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

  /** Clears both pending-delete signals on any dismissal — Cancel, the backdrop or Escape. */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.pendingDelete.set(null);
    this.pendingBulkDeleteIds.set(null);
  }

  /** Ids of the current selection that may actually move to `target`. */
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

  /** Sends the selection's eligible subset for `target` to the store, and clears the selection. */
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

  /** Opens the assign dialog for a single row's "Assign responsible…" entry. */
  protected requestAssign(intervention: InterventionOutput): void {
    this.pendingBulkAssignIds.set(null);
    this.assignRequest.set({
      interventionId: intervention.id,
      interventionName: intervention.name,
      currentResponsible: intervention.responsible,
    });
  }

  /** Opens the assign dialog for the selection's assignable subset. A no-op when nothing selected can actually be assigned. */
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

  /** Sends the picked responsible to the store. */
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

  /** Closes the assign dialog without submitting — Escape, the backdrop or Cancel. */
  protected dismissAssign(): void {
    this.assignRequest.set(null);
    this.pendingBulkAssignIds.set(null);
  }

  /** Opens the "Recurrences" sheet, fetching the organization's rules once on first open. */
  protected openRecurrences(): void {
    this.recurrencesVisible.set(true);
    if (this.recurrenceStore.listCallState().status !== 'idle') return;

    this.recurrenceStore.load({ organizationIri: `/api/organizations/${this.organizationId()}` });
  }

  /** Closes the "Recurrences" sheet. */
  protected closeRecurrences(): void {
    this.recurrencesVisible.set(false);
  }

  /** Creates or updates a recurrence, depending on whether the sheet's draft carries an existing row's id. */
  protected submitRecurrenceForm(event: InterventionRecurrenceFormSubmittedEvent): void {
    if (event.recurrenceId === null) {
      this.recurrenceStore.create({
        organization: `/api/organizations/${this.organizationId()}`,
        template: `/api/intervention-templates/${event.templateId}`,
        name: event.name,
        site: event.site ?? undefined,
        responsible: event.responsible ?? undefined,
        frequency: event.frequency,
        interval: event.interval,
        anchorDate: event.anchorDate,
        timezone: event.timezone,
        leadTimeDays: event.leadTimeDays,
        endAt: event.endAt ?? undefined,
      });
      return;
    }

    this.recurrenceStore.update({
      recurrenceId: event.recurrenceId,
      input: {
        name: event.name,
        site: event.site,
        responsible: event.responsible,
        frequency: event.frequency,
        interval: event.interval,
        anchorDate: event.anchorDate,
        timezone: event.timezone,
        leadTimeDays: event.leadTimeDays,
        endAt: event.endAt,
      },
    });
  }

  /** Deletes a recurrence the sheet's inline confirmation approved. */
  protected removeRecurrence(recurrenceId: string): void {
    this.recurrenceStore.remove(recurrenceId);
  }

  /** Pauses or resumes a recurrence from the sheet's table toggle. */
  protected toggleRecurrenceActive(event: {
    readonly recurrenceId: string;
    readonly isActive: boolean;
  }): void {
    this.recurrenceStore.update({
      recurrenceId: event.recurrenceId,
      input: { isActive: event.isActive },
    });
  }

  /** Re-runs the List tab's current query after a failure. */
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

  /** Downloads the current question as CSV, serialized server-side (`InterventionService.exportCsv`). */
  protected exportCsv(): void {
    if (this.store.totalInterventions() === 0) return;

    const { options, droppedFilterCount } = buildInterventionExportOptions(
      this.filters(),
      this.sortOrder(),
      this.searchTerm(),
      new Date(),
      this.filters().mine ? this.memberIri() : null,
    );

    if (droppedFilterCount > 0) {
      this.feedback.warn(
        $localize`:@@intervention.list.exportFiltersDropped:Some active filters aren't supported by the export and were left out.`,
      );
    }

    this.exportBusy.set(true);

    this.interventionService
      .exportCsv(this.organizationId(), options)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.exportBusy.set(false);
          this.browserDownload.trigger(blob, this.exportFilename());
        },
        error: (error: HttpErrorResponse): void => {
          this.exportBusy.set(false);
          void this.resolveExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ?? $localize`:@@intervention.list.exportFailed:Couldn't export interventions.`,
            );
          });
        },
      });
  }

  /** Replaces one narrowing. */
  protected applyFilter(patch: Partial<InterventionListFilters>): void {
    this.navigateQuery(serializeInterventionListFilters({ ...this.filters(), ...patch }));
  }

  /**
   * Method toggleMine
   *
   * @description
   * Flips the `?mine=1` narrowing. It stays a toolbar toggle rather than
   * becoming a ninth chip: the filter bar is collapsed by default, so a chip
   * would put the collection's most-used narrowing three clicks away.
   *
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected toggleMine(): void {
    this.applyFilter({ mine: !this.filters().mine });
  }

  /** The catalog entry for one field. */
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

  /** The operator one of the six `equals`/`isAnyOf` fields currently reads. */
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

  /** Drops every narrowing at once, mine and the legacy due window included. */
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

  /**
   * Method isFieldIgnored
   * @description Whether the active tab does not honour a filter field — the chip still renders when active, but disabled and greyed rather than silently applied.
   * @access protected
   * @since 1.0.0
   * @param {InterventionFilterFieldKey} key - The field to check.
   * @returns {boolean} True when the active tab ignores it.
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

  /**
   * Resolves the RFC 7807 `detail` a `422` export response carries — the
   * response is fetched as a blob, so a JSON error body arrives as one too
   * and must be read back through `Blob.text()` before it can be parsed.
   */
  private async resolveExportErrorDetail(error: HttpErrorResponse): Promise<string | null> {
    if (!(error.error instanceof Blob)) return null;

    try {
      const body: unknown = JSON.parse(await error.error.text());
      return isApiError(body) ? body.detail : null;
    } catch {
      return null;
    }
  }

  /** The export's filename: the organization, stamped with today's date (`yyyyMMdd`). */
  private exportFilename(): string {
    const now: Date = new Date();
    const yyyy: string = String(now.getFullYear());
    const mm: string = String(now.getMonth() + 1).padStart(2, '0');
    const dd: string = String(now.getDate()).padStart(2, '0');

    return `interventions-${this.organizationId()}-${yyyy}${mm}${dd}.csv`;
  }

  /** Projects one intervention into the List row view model. */
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

  /** Projects one intervention into the Board card view model. */
  private toBoardCardViewModel(intervention: InterventionOutput): InterventionBoardCardViewModel {
    const dueTime: number | null = intervention.dueAt
      ? new Date(intervention.dueAt).getTime()
      : null;
    const isTerminal: boolean =
      intervention.status === 'published' || intervention.status === 'abandoned';

    return {
      intervention,
      isOverdue: dueTime !== null && !isTerminal && dueTime < Date.now(),
      responsible: intervention.responsible
        ? (this.memberDisplayMap().get(intervention.responsible) ?? null)
        : null,
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

  /**
   * Method onCalendarMonthChanged
   * @description Records the Calendar tab's displayed anchor — the load effect reads it back and gates on it being non-`null`.
   * @access protected
   * @since 11.0.0
   * @param {Date} month - The anchor `InterventionCalendar` reports.
   * @returns {void}
   */
  protected onCalendarMonthChanged(month: Date): void {
    this.calendarMonth.set(month);
  }

  /** Re-fetches the Calendar tab's current window after a failure. */
  protected calendarReload(): void {
    const month: Date | null = this.calendarMonth();
    if (month === null) return;

    this.calendarStore.load({
      organizationId: this.organizationId(),
      window: this.calendarWindowOf(month),
      filters: this.toCalendarFilters(this.filters()),
    });
  }

  /**
   * Method calendarWindowOf
   *
   * @description
   * The bounded date window the Calendar's store fetches — the displayed
   * month, one month either side, so the grid's leading/trailing filler days
   * from the neighboring months are covered too.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Date} anchor - Any date inside the displayed month.
   *
   * @returns {{ after: Date; before: Date }} The window to fetch.
   */
  private calendarWindowOf(anchor: Date): { readonly after: Date; readonly before: Date } {
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
   * are discarded, since the Calendar's store neither sorts nor searches.
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
      { field: 'dueAt', direction: 'asc' },
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
  //#endregion
}
