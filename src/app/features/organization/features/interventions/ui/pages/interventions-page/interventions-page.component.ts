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
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  untracked,
  viewChild,
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
  lucideCloudOff,
  lucideColumns3,
  lucideDownload,
  lucideFlag,
  lucideLayoutTemplate,
  lucideList,
  lucideLock,
  lucideMapPin,
  lucidePlus,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideTag,
  lucideTimer,
  lucideTrash2,
  lucideUser,
  lucideUserCog,
  lucideWrench,
  lucideChevronDown,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { PageTabsService, registerPageTabs } from '@core/page-tabs';
import { isCallPending, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { INTERVENTION_BOARD_COLUMNS } from '@features/organization/features/interventions/constants';
import { InterventionService } from '@features/organization/features/interventions/data-access';
import {
  type InterventionDueWindow,
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
  type InterventionRecurrenceFormTarget,
  type InterventionRecurrenceFormValues,
  type InterventionRecurrenceOutput,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionTemplateInstantiateRequest,
  type InterventionType,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import type { InterventionBoardCardViewModel } from '@features/organization/features/interventions/models';
import {
  INTERVENTION_DUE_WINDOW_OPTIONS,
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
import { InterventionBoardStore } from '@features/organization/features/interventions/state/intervention-board';
import { buildInterventionDuplicatePrefill } from '@features/organization/features/interventions/utils';
import {
  buildInterventionExportOptions,
  buildInterventionListOptions,
  isInterventionBoardMoveAllowed,
  resolveInterventionBoardMoveReason,
  parseInterventionListFilters,
  serializeInterventionListFilters,
} from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  REGIONAL_FORMATTING_PORT,
  type OrganizationContextPort,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import {
  OrganizationMemberAccessStore,
  type OrganizationMemberAccessStoreType,
} from '@features/organization/state';
import {
  Board,
  BoardCardDirective,
  BoardColumnHeaderDirective,
  type BoardColumn,
  type BoardMove,
} from '@shared/board';
import type { CalendarFirstDayOfWeek } from '@shared/calendar';
import {
  type CollectionFilterField,
  CollectionFilterBar,
  CollectionFilterDate,
  CollectionFilterDateRange,
  CollectionFilterMultiSelect,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterOperator,
  type CollectionFilterOperatorChangedEvent,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { GateReasonDirective } from '@shared/gate-reason';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmButtonGroup } from '@shared/ui/button-group';
import { HlmCheckboxImports } from '@shared/ui/checkbox';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmToggle } from '@shared/ui/toggle';
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
import { InterventionBoardCard } from '../../components/intervention-board-card';
import { InterventionCalendar } from '../../components/intervention-calendar';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionAssignDialog } from '../../dialogs/intervention-assign-dialog';
import { InterventionBulkDeleteDialog } from '../../dialogs/intervention-bulk-delete-dialog';
import { InterventionRecurrenceDeleteDialog } from '../../dialogs/intervention-recurrence-delete-dialog';
import type { InterventionCreateFormValues } from '../../forms/intervention-create-form';
import { InterventionCreateSheet } from '../../sheets/intervention-create-sheet';
import { InterventionRecurrenceSheet } from '../../sheets/intervention-recurrence-sheet';
import { InterventionRecurrenceTable } from '../../tables/intervention-recurrence-table';
import {
  INTERVENTION_TABLE_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import type { InterventionListItemViewModel } from './models';
import type { InterventionBatchAction } from './models/intervention-batch-action.type';

/** How close a deadline must be to count as "due soon". */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/** The page sizes offered under the table — the server default first, its clamp last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/**
 * * The one large page the Board asks for — see {@link InterventionsPage}'s class doc, "Board".
 */

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
 * @description Which of the four collection surfaces this page currently shows — driven by the `?view=` query param (`board`/`calendar`/`recurrences`; absent or any other value ⇒ `list`) and written back on a tab switch with `queryParamsHandling: 'merge'`, so the active narrowing survives the switch. `recurrences` falls back to `list` for a viewer without `INTERVENTIONS_READ` — see {@link activeView}.
 * @since 11.0.0
 */
type InterventionView = 'list' | 'board' | 'calendar' | 'recurrences';

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
 * {@link InterventionsPage.honouredFilterKeys}, so it lives beside the page
 * rather than in a shared `constants/` or `options/` unit (rule of three).
 * The list honours all eight; the board omits `status` (its columns already
 * narrow by status); the calendar honours only `status`, `type`, `site` and
 * `responsible` (`InterventionCalendarFilters`'s own `Pick`). A field the
 * active view does not honour is simply absent from that view's own filter
 * catalog ({@link InterventionsPage.offeredFilterFields}): the "+ Filter"
 * menu never lists it and, if the URL still carries a value for it from
 * another tab, no chip renders for it here either — the narrowing is neither
 * applied (each view's own query builder already ignores what it does not
 * declare) nor lost (the URL still carries it, and the chip reappears the
 * moment the operator returns to a view that honours the field).
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
    'dueWindow',
  ],
  board: [
    'type',
    'priority',
    'site',
    'responsible',
    'label',
    'dueRange',
    'plannedStartRange',
    'dueWindow',
  ],
  calendar: ['status', 'type', 'site', 'responsible'],
  recurrences: [],
};

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization’s interventions. A paginated native
 * Spartan `line` tab list beneath the shell title selects List, Board,
 * Calendar or Recurrences before the shared search/filter controls.
 * Creation is a single sheet with blank
 * and template modes, reached from the header’s primary action.
 *
 * **One page, four tabs, replacing three routes.** `InterventionsShellPage`,
 * `InterventionsBoardPage` and `InterventionsCalendarPage` are retired: the
 * List/Board/Calendar/Recurrences switcher is a native `hlm-tabs` composition
 * projected into the page header instead of a routed `<router-outlet />`, and
 * shared `Board` plus the feature-owned
 * `InterventionCalendar` are presentational components
 * this page feeds, not pages of their own — a table, a board or a calendar
 * never injects a store (`ARCHITECTURE.md` §10.3), and one physical page
 * means the toolbar and the filter bar are built once instead
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
 * it exists — behind `@defer`, on the Calendar view's first
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
 * Export and the bulk-actions menu render only while
 * {@link activeView} is `list`: the Board and the Calendar have no use for
 * any of them.
 *
 * The "Deadline" and "Planned start" chips' six operator-branched value
 * controls (`greaterThan`/`lessThan` → `app-collection-filter-date`,
 * `between` → `app-collection-filter-date-range`, both
 * `@shared/collection-filters`) replaced their earlier hand-rolled
 * `hlm-date-picker`/`hlm-date-range-picker` markup, which had drifted from
 * the six other chips' shared trigger chrome — no width clamp, no hover
 * surface, no double-padding fix. A side effect of adopting the shared
 * `state`/`stateChanged` contract: switching a chip's operator now reopens
 * its value control the same way an enum chip's already did, where the
 * hand-rolled pickers previously left it closed.
 *
 * @version 14.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    HlmButtonGroup,
    ...HlmTabsImports,
    GateReasonDirective,
    HlmBadge,
    HlmButton,
    HlmSpinner,
    HlmToggle,
    InterventionAssignDialog,
    Board,
    BoardCardDirective,
    BoardColumnHeaderDirective,
    InterventionBoardCard,
    InterventionBulkDeleteDialog,
    InterventionCalendar,
    InterventionCreateSheet,
    InterventionRecurrenceDeleteDialog,
    InterventionRecurrenceSheet,
    InterventionRecurrenceTable,
    InterventionTable,
    InterventionTag,
    CollectionFilterBar,
    CollectionFilterDate,
    CollectionFilterDateRange,
    CollectionFilterMultiSelect,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    ...HlmCheckboxImports,
    ...HlmDropdownMenuImports,
    ...HlmPopoverImports,
    ...HlmSelectImports,
    ...HlmSeparatorImports,
  ],
  providers: [
    InterventionCalendarStore,
    InterventionBoardStore,
    InterventionRecurrenceStore,
    provideIcons({
      lucideLock,
      lucideArrowDown,
      lucideArrowUp,
      lucideCalendarClock,
      lucideCalendarDays,
      lucideCheck,
      lucideCircleAlert,
      lucideCircleDot,
      lucideClipboardList,
      lucideCloudOff,
      lucideColumns3,
      lucideDownload,
      lucideFlag,
      lucideLayoutTemplate,
      lucideList,
      lucideMapPin,
      lucidePlus,
      lucideSearch,
      lucideSlidersHorizontal,
      lucideTag,
      lucideTrash2,
      lucideUser,
      lucideUserCog,
      lucideWrench,
      lucideTimer,
      lucideChevronDown,
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

  /**
   * * The search term the URL carries. See {@link searchTerm}.
   */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property collectionPage
   * @readonly
   * @description One-based list page restored from the collection URL after detail navigation.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly collectionPage = input<string | undefined>(undefined, { alias: 'p' });

  /** `?create=1` opens the creation sheet on arrival — the contract the parent feature's landing page uses to start an intervention. */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * * Which tab is shown — `board`/`calendar`, absent (or any other value) meaning `list`. See {@link activeView}.
   */
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
  /** Whether the last list read was refused for lack of permission, which a retry cannot fix. */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(
    () => this.store.listError()?.code === 403,
  );

  //#endregion

  //#region Properties
  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings and forwarded to date-rendering children.
   * @access protected
   * @since 1.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** The List/Board tabs' shared dataset. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Site, member and label choices for the filter bar and the creation form. */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /**
   * Property selectionMode
   * @readonly
   *
   * @description
   * Whether the compact card layout offers its selection checkboxes. A
   * permanent checkbox column costs an eighth of a 375px screen for an action
   * the field scene never performs, so below `sm` selection is a mode the
   * operator enters rather than a column that is always there. The table
   * layout above `sm` is unaffected.
   *
   * @access protected
   * @since 15.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly selectionMode: WritableSignal<boolean> = signal<boolean>(false);

  /** The organization's recurring intervention schedules, backing the Recurrences tab. */
  protected readonly recurrenceStore: InterventionRecurrenceStoreType =
    inject<InterventionRecurrenceStoreType>(InterventionRecurrenceStore);

  /** The Calendar tab's own bounded-window dataset — component-scoped here since only a page may inject a store; see class doc. */
  protected readonly calendarStore: InterventionCalendarStoreType =
    inject<InterventionCalendarStoreType>(InterventionCalendarStore);

  /** Organization permission checks gating every tab's write actions. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** The active organization context, source of the regional first-day-of-week preference. */
  private readonly organizationContext: OrganizationContextPort =
    inject<OrganizationContextPort>(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property firstDayOfWeek
   * @readonly
   * @description The organization's regional first-day-of-week preference, Monday when unset.
   * @access protected
   * @since 1.0.0
   * @type {Signal<CalendarFirstDayOfWeek>}
   */
  protected readonly firstDayOfWeek: Signal<CalendarFirstDayOfWeek> =
    computed<CalendarFirstDayOfWeek>(
      () =>
        this.organizationContext.selectedOrganization()?.settings?.regional?.firstDayOfWeek ??
        'monday',
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

  /**
   * * Registers {@link pageActions} on the layout header.
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /**
   * Property pageTabsService
   * @readonly
   *
   * @description
   * Registers this page's primary view tabs in the dashboard page header.
   *
   * @access private
   * @since 14.0.0
   *
   * @type {PageTabsService}
   */
  private readonly pageTabsService: PageTabsService = inject(PageTabsService);

  /** The signed-in member, resolving the "my interventions" chip and the List tab's identity gates. */
  private readonly memberAccess: OrganizationMemberAccessStoreType =
    inject<OrganizationMemberAccessStoreType>(OrganizationMemberAccessStore);

  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * The "New intervention" action contributed to the shell title row and
   * available from every collection view.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property pageTabs
   * @readonly
   *
   * @description
   * Native Spartan tab list projected into the dashboard page header while
   * remaining connected to this page's tab panels and query-param navigation.
   *
   * @access private
   * @since 14.0.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageTabs: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageTabs');

  /**
   * Property activeView
   * @readonly
   * @description Which tab is currently shown. See {@link InterventionView} and the `view` input. `recurrences` falls back to `list` for a viewer without {@link canReadRecurrences}.
   * @access protected
   * @since 11.0.0
   * @type {Signal<InterventionView>}
   */
  protected readonly activeView: Signal<InterventionView> = computed<InterventionView>(() => {
    const requested: string | undefined = this.view();

    if (requested === 'board' || requested === 'calendar') return requested;
    if (requested === 'recurrences' && this.canReadRecurrences()) return 'recurrences';

    return 'list';
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

  /**
   * * {@link filters}, `status` forced to `null` — the Board's columns are the status narrowing, so a `status` value left in the URL by another tab must never reach its query.
   */
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
   * @description The List tab's page window, one-based — a `linkedSignal` over {@link filters} and {@link searchTerm} and the page query parameter, preserving the window when returning from a detail.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = linkedSignal<number>((): number => {
    this.filters();
    this.searchTerm();
    const value = Number(this.collectionPage());
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  });

  /** How many rows a page holds, restored from the preferences cookie. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(this.restorePageSize());

  /** Whether the creation sheet is open. */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The header menu prepares a template in the sheet before any API mutation. */
  protected readonly createTemplateId: WritableSignal<string | null> = signal<string | null>(null);

  /** What the recurrence sheet is open on: `'create'`, an existing row for edit, `null` for closed. */
  protected readonly recurrenceTarget: WritableSignal<InterventionRecurrenceFormTarget> =
    signal<InterventionRecurrenceFormTarget>(null);

  /** Whether a recurrence create/update was submitted from the sheet and its outcome is still awaited — closes the sheet on success. */
  protected readonly awaitingRecurrenceWrite: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether a recurrence delete was confirmed and its outcome is still awaited — closes the dialog on success. */
  protected readonly awaitingRecurrenceRemove: WritableSignal<boolean> = signal<boolean>(false);

  /** The recurrence a row's Delete action asked to remove, pending the confirm dialog. */
  protected readonly pendingRecurrenceDelete: WritableSignal<InterventionRecurrenceOutput | null> =
    signal<InterventionRecurrenceOutput | null>(null);

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

  /** Named deadline windows the `?due=` chip offers — the same catalog the URL parser reads. */
  protected readonly dueWindowOptions: SelectOption<InterventionDueWindow>[] =
    INTERVENTION_DUE_WINDOW_OPTIONS;

  /** The active named deadline window, or `null` — the `?due=` chip's value. */
  protected readonly dueWindowValue: Signal<InterventionDueWindow | null> =
    computed<InterventionDueWindow | null>(() => this.filters().dueWindow);

  /** Renders a named deadline window in the `?due=` chip's trigger. */
  protected readonly dueWindowLabelOf: (value: InterventionDueWindow | null) => string = (
    value: InterventionDueWindow | null,
  ): string =>
    INTERVENTION_DUE_WINDOW_OPTIONS.find(
      (option: SelectOption<InterventionDueWindow>): boolean => option.value === value,
    )?.label ?? '';

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
      this.store.servedFromLocalCache() ||
      this.store.totalInterventions() === 0,
  );

  /**
   * Property exportGateReason
   * @readonly
   *
   * @description
   * Why Export is closed, when the reason is one the operator can act on. The
   * export is a server-side CSV, so it cannot answer from the device's own
   * snapshot — and a silently inert button is exactly what `PRODUCT.md`'s
   * second principle forbids. `null` when the button is simply busy or when
   * there is nothing to export, which `aria-busy` and the empty state already say.
   *
   * @access protected
   * @since 15.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly exportGateReason: Signal<string | null> = computed<string | null>(() =>
    this.store.servedFromLocalCache()
      ? $localize`:@@intervention.list.exportOfflineReason:Export needs the server; you're seeing this device's saved copy.`
      : null,
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

  /** Whether the Recurrences tab renders at all. */
  protected readonly canReadRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /** Whether the Recurrences tab offers create/edit/delete/toggle, or renders read-only. */
  protected readonly canWriteRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /** Whether the recurrence sheet's create or update write is in flight. */
  protected readonly recurrencePending: Signal<boolean> = computed<boolean>(
    () =>
      isCallPending(this.recurrenceStore.createCallState()) ||
      isCallPending(this.recurrenceStore.updateCallState()),
  );

  /** The recurrence sheet's own create/update failure message, if any. */
  protected readonly recurrenceServerError: Signal<string | null> = computed<string | null>(
    () =>
      this.recurrenceStore.createCallState().error?.message ??
      this.recurrenceStore.updateCallState().error?.message ??
      null,
  );

  /** Creation and its URL entry point share the planning permission. */
  protected readonly canCreate: Signal<boolean> = computed(() =>
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

  /**
   * Property boardStore
   * @readonly
   * @description Independent paginated status columns.
   * @access protected
   * @since 1.0.0
   * @type {InstanceType<typeof InterventionBoardStore>}
   */
  protected readonly boardStore: InstanceType<typeof InterventionBoardStore> =
    inject(InterventionBoardStore);

  /**
   * * Every loaded intervention as a Board card view model — see {@link boardFilters}, which shapes what {@link InterventionStore.interventionList} holds while the Board tab is active.
   */
  protected readonly boardItems: Signal<readonly InterventionBoardCardViewModel[]> = computed(() =>
    this.boardStore
      .boardInterventionEntities()
      .map((intervention: InterventionOutput) => this.toBoardCardViewModel(intervention)),
  );

  /**
   * Property boardColumns
   * @readonly
   *
   * @description
   * Projects workflow grouping and pending flags into the generic board contract.
   *
   * @access protected
   * @since 15.0.0
   *
   * @type {Signal<readonly BoardColumn<InterventionBoardCardViewModel, InterventionStatus>[]>}
   */
  protected readonly boardColumns: Signal<
    readonly BoardColumn<InterventionBoardCardViewModel, InterventionStatus>[]
  > = computed(() => {
    const items = this.boardItems();
    const pending = this.boardStore.moves();
    return INTERVENTION_BOARD_COLUMNS.map((status) => ({
      id: status,
      label: resolveInterventionTag('status', status).label,
      total: this.boardStore.columns()[status]?.total,
      loading: this.boardStore.columns()[status]?.callState.status === 'pending',
      error: this.boardStore.columns()[status]?.callState.error?.message,
      hasMore:
        (this.boardStore.columns()[status]?.ids.length ?? 0) <
        (this.boardStore.columns()[status]?.total ?? 0),
      items: items
        .filter((item) => this.boardStore.columns()[status]?.ids.includes(item.intervention.id))
        .map((item) => ({
          id: item.intervention.id,
          label: item.intervention.name,
          data: item,
          disabled: pending[item.intervention.id]?.status === 'pending',
        })),
    }));
  });

  /**
   * Method canMoveBoardItem
   * @method canMoveBoardItem
   *
   * @description
   * Applies the feature’s permission, pending-state and transition policy to board moves.
   *
   * @access protected
   * @since 15.0.0
   *
   * @param {InterventionBoardCardViewModel} item - The candidate intervention card.
   * @param {InterventionStatus} status - The requested status.
   * @returns {boolean}
   */
  protected readonly canMoveBoardItem = (
    item: InterventionBoardCardViewModel,
    status: InterventionStatus,
  ): boolean =>
    this.canTransition() &&
    this.boardStore.moves()[item.intervention.id]?.status !== 'pending' &&
    isInterventionBoardMoveAllowed(item.intervention, status, this.memberIri());

  /**
   * Method boardMoveBlockedReason
   * @method boardMoveBlockedReason
   *
   * @description
   * Supplies feature-owned transition and membership explanations to the generic board.
   *
   * @access protected
   * @since 15.0.0
   *
   * @param {InterventionBoardCardViewModel} item - The dragged intervention.
   * @param {InterventionStatus} status - The candidate destination.
   * @returns {string | null}
   */
  protected readonly boardMoveBlockedReason = (
    item: InterventionBoardCardViewModel,
    status: InterventionStatus,
  ): string | null =>
    resolveInterventionBoardMoveReason(item.intervention, status, this.memberIri());

  /**
   * Method onBoardMoveRequested
   * @method onBoardMoveRequested
   *
   * @description
   * Translates the generic board request into the existing optimistic transition flow.
   *
   * @access protected
   * @since 15.0.0
   *
   * @param {BoardMove<InterventionBoardCardViewModel, InterventionStatus>} event - The validated board move request.
   * @returns {void}
   */
  protected onBoardMoveRequested(
    event: BoardMove<InterventionBoardCardViewModel, InterventionStatus>,
  ): void {
    if (!this.canMoveBoardItem(event.item, event.columnId)) return;
    if (event.columnId === 'published') {
      void this.router.navigate([...this.detailRouteBase(), event.item.intervention.id]);
      return;
    }
    this.boardStore.move({ intervention: event.item.intervention, status: event.columnId });
  }

  /** How many pages the whole server-side List collection fills — at least one, so the footer never reads "Page 1 of 0". */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalInterventions() / this.pageSize())),
  );

  /**
   * Property batchSelectedCount
   * @readonly
   * @description Selection size before eligibility filtering.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly batchSelectedCount = signal(0);
  /**
   * Property batchNames
   * @readonly
   * @description Readable identities captured before successful rows leave the current page.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<Record<string, string>>}
   */
  protected readonly batchNames = signal<Record<string, string>>({});
  /**
   * Property lastBatchAction
   * @readonly
   * @description Last explicit batch intention, retained for a targeted retry.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<InterventionBatchAction | null>}
   */
  private readonly lastBatchAction = signal<InterventionBatchAction | null>(null);
  /**
   * Property batchPending
   * @readonly
   * @description Whether at least one batch operation is still in flight.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly batchPending = computed(() =>
    this.batchResults().some((result) => result.state?.status === 'pending'),
  );
  /**
   * Property batchIds
   * @readonly
   * @description Eligible intervention identifiers whose results are tracked for this batch.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<readonly string[]>}
   */
  protected readonly batchIds: WritableSignal<readonly string[]> = signal<readonly string[]>([]);
  /**
   * Property batchSettled
   * @readonly
   * @description Prevents repeating the collection refresh after completion.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  private readonly batchSettled: WritableSignal<boolean> = signal(false);
  /**
   * Property batchResults
   * @readonly
   * @description Consolidated per-resource results; failures remain selected.
   * @access protected
   * @since 1.0.0
   */
  protected readonly batchResults = computed(() =>
    this.batchIds().map((id) => ({
      id,
      name: this.batchNames()[id] ?? id,
      state: this.store.mutationCallStates()[id] as CallState | undefined,
    })),
  );
  /**
   * Property batchSucceededCount
   * @readonly
   * @description Confirmed successful operations in the current batch.
   * @access protected
   * @since 1.0.0
   */
  protected readonly batchSucceededCount = computed(
    () => this.batchResults().filter((result) => result.state?.status === 'success').length,
  );
  /**
   * Property batchFailedCount
   * @readonly
   * @description Failed operations retained for retry.
   * @access protected
   * @since 1.0.0
   */
  protected readonly batchFailedCount = computed(
    () => this.batchResults().filter((result) => result.state?.status === 'error').length,
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
          item.intervention.allowedActions?.canEditResponsible === true,
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

  /**
   * Property assignAttemptIds
   * @readonly
   * @description Resources in the current assignment attempt; successful rows are excluded from retries.
   * @access private
   * @since 1.0.0
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly assignAttemptIds: WritableSignal<readonly string[]> = signal([]);

  /**
   * Property assignDialogBusy
   * @readonly
   * @description Keeps the assignment draft locked until every resource has a confirmed result.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly assignDialogBusy: Signal<boolean> = computed(() =>
    this.assignAttemptIds().some((id) => {
      const status = this.store.mutationCallStates()[id]?.status;
      return status !== 'success' && status !== 'error';
    }),
  );

  /**
   * Property assignErrors
   * @readonly
   * @description Names failed resources without discarding the responsible selected in the dialog.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly assignErrors: Signal<readonly string[]> = computed(() =>
    this.assignAttemptIds().flatMap((id) => {
      const state = this.store.mutationCallStates()[id];
      if (state?.status !== 'error') return [];
      const name = this.batchNames()[id] ?? this.assignRequest()?.interventionName ?? id;
      return [
        `${name}: ${state.error?.message ?? $localize`:@@intervention.assign.failed:Assignment could not be saved.`}`,
      ];
    }),
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

  /**
   * Property offeredFilterFields
   * @readonly
   *
   * @description
   * The bar's `fields` input, narrowed to the active tab's own
   * {@link honouredFilterKeys}. The four tabs do not share one filter set,
   * and a field the active tab cannot apply is not part of its catalog at
   * all: the "+ Filter" menu never lists it, and — since
   * {@link honouredActiveFilterKeys} is what the bar's `activeKeys` input
   * reads — a value the URL still carries for it from another tab renders no
   * chip here either. The narrowing itself is unaffected: each tab's own
   * query builder (`boardFilters`, `toCalendarFilters`) already reads only
   * the fields it declares, regardless of what the bar renders.
   *
   * @access protected
   * @since 13.0.0
   * @type {Signal<readonly CollectionFilterField[]>}
   */
  protected readonly offeredFilterFields: Signal<readonly CollectionFilterField[]> = computed<
    readonly CollectionFilterField[]
  >(() => {
    const honoured: ReadonlySet<InterventionFilterFieldKey> = this.honouredFilterKeys();

    return INTERVENTION_FILTER_FIELDS.filter((field: InterventionFilterFieldOption): boolean =>
      honoured.has(field.key),
    );
  });

  /**
   * * Which of `INTERVENTION_FILTER_FIELDS` currently carry a value, over the whole catalog rather than {@link offeredFilterFields} — the base {@link honouredActiveFilterKeys} narrows to what the active tab actually renders, and {@link filtersVisible}'s own seed reads this one directly, so a filter set on another tab still auto-expands the bar on arrival.
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
   * Property honouredActiveFilterKeys
   * @readonly
   *
   * @description
   * Active keys the current tab actually applies — the bar's own `activeKeys`
   * input (which chips render) and the "Filters" toggle's badge count. An
   * unhonoured key is deliberately excluded from both: it narrows nothing
   * here, so rendering its chip or counting it in the badge would advertise a
   * narrowing that is not in force. The value is not lost — it is still in
   * {@link activeFilterKeys} and the URL, and reappears the moment the
   * operator switches to a tab that honours it.
   *
   * @access protected
   * @since 11.1.0
   * @type {Signal<readonly InterventionFilterFieldKey[]>}
   */
  protected readonly honouredActiveFilterKeys: Signal<readonly InterventionFilterFieldKey[]> =
    computed<readonly InterventionFilterFieldKey[]>(() => {
      const honoured: ReadonlySet<InterventionFilterFieldKey> = this.honouredFilterKeys();

      return this.activeFilterKeys().filter((key: InterventionFilterFieldKey): boolean =>
        honoured.has(key),
      );
    });

  /** Whether `app-collection-filter-bar` is currently mounted below the toolbar. */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** Which field's value selector currently renders forced open — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<InterventionFilterFieldKey | null> =
    signal<InterventionFilterFieldKey | null>(null);

  /** The operator pinned on one of the six `equals`/`isAnyOf` fields — set by an explicit pick or by any multi selection, dropped when the chip is removed or every filter is cleared. */
  private readonly enumFilterOperatorOverrides: WritableSignal<
    Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>
  > = signal<Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>>({});

  /** The "Status" chip's value control, projected into the filter bar. */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /** The "Type" chip's value control, projected into the filter bar. */
  private readonly typeChipTemplate = viewChild<TemplateRef<unknown>>('typeChip');

  /** The "Priority" chip's value control, projected into the filter bar. */
  private readonly priorityChipTemplate = viewChild<TemplateRef<unknown>>('priorityChip');

  /** The `?due=` chip's value control. */
  private readonly dueWindowChipTemplate = viewChild<TemplateRef<unknown>>('dueWindowChip');

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
   * * Every filter field's value-control `TemplateRef`, keyed by {@link InterventionFilterFieldKey}, for `app-collection-filter-bar`'s `templates` input.
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
    dueWindow: this.dueWindowChipTemplate(),
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

  /**
   * * The "Planned start" chip's own currently-selected operator. See {@link dueRangeOperator}.
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
   * * The applied `plannedStartRange`'s lower bound, when its operator carries one. See {@link dueRangeAfter}.
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
   * * The applied `plannedStartRange`'s upper bound, when its operator carries one. See {@link dueRangeBefore}.
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
   * * The applied `plannedStartRange`'s bound pair, only while its operator is `between`. See {@link dueRangeBetween}.
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
   * and loads each of the four tabs' own dataset — the List and the Board
   * gated on {@link activeView}, the Calendar gated on {@link calendarMonth}
   * reporting its first anchor, the Recurrences tab gated on {@link activeView}
   * and loaded once, the first time it activates.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      const ids = this.assignAttemptIds();
      if (
        ids.length &&
        ids.every((id) => this.store.mutationCallStates()[id]?.status === 'success')
      ) {
        untracked(() => this.dismissAssign());
      }
    });
    effect(() => {
      const results = this.batchResults();
      if (!results.length || this.batchSettled()) return;
      const successes = new Set(
        results.filter((result) => result.state?.status === 'success').map((result) => result.id),
      );
      untracked(() =>
        this.selectedIds.update(
          (selected) => new Set([...selected].filter((id) => !successes.has(id))),
        ),
      );
      if (
        results.every(
          (result) => result.state?.status === 'success' || result.state?.status === 'error',
        )
      ) {
        untracked(() => {
          this.batchSettled.set(true);
          this.reload();
        });
      }
    });

    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);
    registerPageTabs(this.pageTabs, this.pageTabsService, this.destroyRef);

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

        this.boardStore.load({
          organizationId,
          options: {
            ...buildInterventionListOptions(
              filters,
              { field: 'dueAt', direction: 'asc' },
              search,
              new Date(),
              null,
            ),
          },
        });
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      this.boardStore.revision();
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
      const view: InterventionView = this.activeView();
      const organizationId: string = this.organizationId();

      untracked((): void => {
        if (view !== 'recurrences') return;
        if (this.recurrenceStore.listCallState().status !== 'idle') return;

        this.recurrenceStore.load({ organizationIri: `/api/organizations/${organizationId}` });
      });
    });

    effect((): void => {
      const createStatus: CallState['status'] = this.recurrenceStore.createCallState().status;
      const updateStatus: CallState['status'] = this.recurrenceStore.updateCallState().status;

      untracked((): void => {
        if (!this.awaitingRecurrenceWrite()) return;
        if (createStatus === 'pending' || updateStatus === 'pending') return;

        this.awaitingRecurrenceWrite.set(false);
        if (createStatus === 'success' || updateStatus === 'success') {
          this.recurrenceTarget.set(null);
        }
      });
    });

    effect((): void => {
      const status: CallState['status'] = this.recurrenceStore.removeCallState().status;

      untracked((): void => {
        if (!this.awaitingRecurrenceRemove() || status === 'pending') return;

        this.awaitingRecurrenceRemove.set(false);
        if (status === 'success') this.pendingRecurrenceDelete.set(null);
      });
    });

    effect((): void => {
      const requested: boolean = this.create() === '1';

      untracked((): void => {
        if (!requested || !isPlatformBrowser(this.platformId)) return;
        if (!this.canCreate()) {
          this.navigateQuery({ create: null });
          return;
        }

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
        void this.router.navigate([...this.detailRouteBase(), createdId], {
          queryParamsHandling: 'preserve',
        });
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
   * @description
   * The native Spartan tab list's activation handler writes
   * the new `?view=` and merges it with every other query param,
   * **including** the ones the destination does not honour. Dropping them
   * here would delete a narrowing the user set, silently and irrecoverably;
   * leaving them costs nothing, since a destination neither offers nor
   * applies a field outside its own {@link honouredFilterKeys}, and
   * restores the narrowing intact on the way back.
   *
   * @access protected
   * @since 11.0.0
   * @param {string} tab - The activated tab id (`list`/`board`/`calendar`/`recurrences`).
   * @returns {void}
   */
  protected switchView(tab: string | readonly string[] | null | undefined): void {
    if (typeof tab !== 'string') return;

    const view: InterventionView =
      tab === 'board' || tab === 'calendar' || tab === 'recurrences' ? tab : 'list';

    this.navigateQuery({ view: view === 'list' ? null : view });
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
    this.navigateQuery({ p: null });
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
    const next = Math.min(Math.max(1, target), this.pageCount());
    this.page.set(next);
    this.navigateQuery({ p: next > 1 ? String(next) : null });
  }

  /** Changes how many rows a page holds and returns to the first one. */
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.navigateQuery({ p: null });
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
    if (!this.canCreate()) return;
    this.createTemplateId.set(null);
    this.duplicatePrefill.set(null);
    this.createSheetVisible.set(true);
  }

  /** Opens the creation sheet prefilled from a row's own "Duplicate" entry. */
  protected requestDuplicate(intervention: InterventionOutput): void {
    this.createTemplateId.set(null);
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

  /** Opens the template mode without creating until the operator confirms the form. */
  protected openTemplateCreate(templateId: string): void {
    if (!this.canCreate()) return;
    this.duplicatePrefill.set(null);
    this.createTemplateId.set(templateId);
    this.createSheetVisible.set(true);
  }

  /** Moves an intervention to the status a List row's menu or a Board card's move requested. The store owns the optimistic patch, the `If-Match` revision and the rollback. */
  protected applyTransition(request: InterventionTransitionRequest): void {
    if (request.status === 'published') {
      void this.router.navigate([...this.detailRouteBase(), request.intervention.id]);
      return;
    }
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
    if (this.batchPending()) return;
    const single: InterventionOutput | null = this.pendingDelete();
    if (single) {
      this.store.delete({ interventionId: single.id, revision: single.revision });
    }

    const bulkIds: ReadonlyArray<string> | null = this.pendingBulkDeleteIds();
    if (bulkIds) {
      this.lastBatchAction.set({ kind: 'delete' });
      const byId: ReadonlyMap<string, InterventionOutput> = new Map(
        this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
          item.intervention.id,
          item.intervention,
        ]),
      );

      this.batchSettled.set(false);
      this.batchSelectedCount.set(this.selectedIds().size);
      this.batchNames.set(
        Object.fromEntries(
          this.items().map((item) => [item.intervention.id, item.intervention.name]),
        ),
      );
      this.batchIds.set(bulkIds);
      for (const id of bulkIds) {
        const intervention: InterventionOutput | undefined = byId.get(id);
        if (intervention) {
          this.store.delete({ interventionId: intervention.id, revision: intervention.revision });
        }
      }
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
    if (target === 'published') return [];
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
      .filter((item: InterventionListItemViewModel): boolean =>
        isInterventionBoardMoveAllowed(item.intervention, target, currentMemberIri),
      )
      .map((item: InterventionListItemViewModel): string => item.intervention.id);
  }

  /** Sends the eligible selection and retains each failed row for a targeted retry. */
  protected confirmBulkTransition(target: InterventionStatus): void {
    if (this.batchPending()) return;
    const ids: ReadonlyArray<string> = this.transitionableSelectedIds(target);
    if (ids.length === 0) return;

    const byId: ReadonlyMap<string, InterventionOutput> = new Map(
      this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
        item.intervention.id,
        item.intervention,
      ]),
    );

    this.batchSettled.set(false);
    this.batchSelectedCount.set(this.selectedIds().size);
    this.batchNames.set(
      Object.fromEntries(
        this.items().map((item) => [item.intervention.id, item.intervention.name]),
      ),
    );
    this.batchIds.set(ids);
    this.lastBatchAction.set({ kind: 'transition', status: target });
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
  }

  /** Method retryFailedBatch
   * @description Repeats the last intention only for failed rows still eligible in the refreshed collection. Deletion keeps its confirmation.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected retryFailedBatch(): void {
    if (this.batchPending()) return;
    const action = this.lastBatchAction();
    if (!action) return;
    this.selectedIds.set(
      new Set(
        this.batchResults()
          .filter((result) => result.state?.status === 'error')
          .map((result) => result.id),
      ),
    );
    if (action.kind === 'transition') this.confirmBulkTransition(action.status);
    else if (action.kind === 'delete') this.requestBulkDelete();
    else {
      const ids = this.assignableSelectedIds();
      if (ids.length === 0) return;
      this.pendingBulkAssignIds.set(ids);
      this.submitAssign({ interventionId: '', responsible: action.responsible });
    }
  }

  /**
   * Method requestAssign
   * @description Opens an individual assignment and resolves its existing responsible label.
   * @access protected
   * @since 1.0.0
   * @param {InterventionOutput} intervention - Selected row.
   * @returns {void}
   */
  protected requestAssign(intervention: InterventionOutput): void {
    if (this.assignDialogBusy()) return;
    this.assignAttemptIds.set([]);
    this.pendingBulkAssignIds.set(null);
    this.planningOptions.ensureSelected(this.organizationId(), [intervention.responsible]);
    this.assignRequest.set({
      interventionId: intervention.id,
      interventionName: intervention.name,
      currentResponsible: intervention.responsible ?? null,
    });
  }

  /**
   * Method requestBulkAssign
   * @description Opens assignment for the selected eligible resources.
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected requestBulkAssign(): void {
    if (this.assignDialogBusy()) return;
    this.assignAttemptIds.set([]);
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
   * @description Sends assignment writes while retaining the dialog draft; retries exclude confirmed successes.
   * @access protected
   * @since 1.0.0
   * @param {InterventionAssignSubmittedEvent} event - Selected responsible.
   * @returns {void}
   */
  protected submitAssign(event: InterventionAssignSubmittedEvent): void {
    if (this.batchPending() || this.assignDialogBusy()) return;
    const byId: ReadonlyMap<string, InterventionOutput> = new Map(
      this.items().map((item: InterventionListItemViewModel): [string, InterventionOutput] => [
        item.intervention.id,
        item.intervention,
      ]),
    );

    const previousIds = this.assignAttemptIds();
    const bulkIds =
      this.pendingBulkAssignIds()?.filter(
        (id) =>
          byId.has(id) &&
          !(previousIds.includes(id) && this.store.mutationCallStates()[id]?.status === 'success'),
      ) ?? null;
    const attemptIds = bulkIds ?? (byId.has(event.interventionId) ? [event.interventionId] : []);
    if (!attemptIds.length) return;
    this.assignAttemptIds.set(attemptIds);
    if (bulkIds) {
      this.pendingBulkAssignIds.set(bulkIds);
      this.lastBatchAction.set({ kind: 'assign', responsible: event.responsible });
      this.batchSettled.set(false);
      this.batchSelectedCount.set(this.selectedIds().size);
      this.batchNames.set(
        Object.fromEntries(
          this.items().map((item) => [item.intervention.id, item.intervention.name]),
        ),
      );
      this.batchIds.set(bulkIds);
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
  }

  /**
   * Method dismissAssign
   * @description Closes only after requests have settled, preserving pending writes.
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected dismissAssign(): void {
    if (this.assignDialogBusy()) return;
    this.assignAttemptIds.set([]);
    this.assignRequest.set(null);
    this.pendingBulkAssignIds.set(null);
  }

  /** Opens the recurrence sheet on an empty draft. */
  protected openRecurrenceCreate(): void {
    this.recurrenceTarget.set('create');
  }

  /** Opens the recurrence sheet on an existing rule. */
  protected editRecurrence(recurrence: InterventionRecurrenceOutput): void {
    this.recurrenceTarget.set(recurrence);
  }

  /** Closes the recurrence sheet — the sheet already confirmed a dirty close. */
  protected closeRecurrenceSheet(): void {
    this.awaitingRecurrenceWrite.set(false);
    this.recurrenceTarget.set(null);
  }

  /** Creates or updates a recurrence, depending on whether the form's values carry an existing row's id. */
  protected submitRecurrence(values: InterventionRecurrenceFormValues): void {
    this.awaitingRecurrenceWrite.set(true);
    if (values.recurrenceId === null) {
      this.recurrenceStore.create({
        organization: `/api/organizations/${this.organizationId()}`,
        template: `/api/intervention-templates/${values.templateId}`,
        name: values.name,
        site: values.site ?? undefined,
        responsible: values.responsible ?? undefined,
        frequency: values.frequency,
        interval: values.interval,
        anchorDate: values.anchorDate,
        timezone: values.timezone,
        leadTimeDays: values.leadTimeDays,
        endAt: values.endAt ?? undefined,
      });
      return;
    }

    this.recurrenceStore.update({
      recurrenceId: values.recurrenceId,
      input: {
        name: values.name,
        site: values.site,
        responsible: values.responsible,
        frequency: values.frequency,
        interval: values.interval,
        anchorDate: values.anchorDate,
        timezone: values.timezone,
        leadTimeDays: values.leadTimeDays,
        endAt: values.endAt,
      },
    });
  }

  /** Raises the delete confirmation for a row the table asked to remove. */
  protected requestRecurrenceDelete(recurrence: InterventionRecurrenceOutput): void {
    this.pendingRecurrenceDelete.set(recurrence);
  }

  /** Deletes the recurrence the confirm dialog approved; the dialog closes on success. */
  protected confirmRecurrenceDelete(): void {
    const recurrence: InterventionRecurrenceOutput | null = this.pendingRecurrenceDelete();
    if (recurrence === null) return;

    this.awaitingRecurrenceRemove.set(true);
    this.recurrenceStore.remove(recurrence.id);
  }

  /** Closes the delete confirmation without removing anything. */
  protected dismissRecurrenceDelete(): void {
    this.awaitingRecurrenceRemove.set(false);
    this.pendingRecurrenceDelete.set(null);
  }

  /** Pauses or resumes a recurrence from the table's toggle. */
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

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing, and forgets the operator pinned on it so re-adding the field opens on its declared default rather than on last visit's choice.
   * @access protected
   * @since 1.0.0
   * @param {string} key - The removed field's key.
   * @returns {void}
   */
  protected onFieldRemoved(key: string): void {
    this.enumFilterOperatorOverrides.update(
      (
        overrides: Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>,
      ): Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>> => {
        const next: Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>> = {
          ...overrides,
        };
        delete next[key as InterventionEnumFilterKey];

        return next;
      },
    );

    this.applyFilter(this.filterClearPatchOf(key as InterventionFilterFieldKey));
  }

  /**
   * Method onFilterOperatorChanged
   *
   * @description
   * Reacts to the filter bar's `operatorChanged` output. Each handler drops
   * the current value, since it no longer fits the new operator's shape — a
   * scalar cannot serve `isAnyOf`, a single date cannot serve `between`. That
   * alone would unrender the chip, because the bar draws one per *active* key
   * and the key just stopped being active. Marking it pending keeps it on
   * screen with its new value control open, which is the whole point of the
   * interaction.
   *
   * @access protected
   * @since 11.1.0
   *
   * @param {CollectionFilterOperatorChangedEvent} event - The chip's key and its newly picked operator.
   *
   * @returns {void}
   */
  protected onFilterOperatorChanged(event: CollectionFilterOperatorChangedEvent): void {
    if (event.key === 'dueRange') this.onDueRangeOperatorPicked(event.operator);
    if (event.key === 'plannedStartRange') this.onPlannedStartRangeOperatorPicked(event.operator);
    if (this.isEnumFilterKey(event.key)) this.onEnumFilterOperatorPicked(event.key, event.operator);

    this.openFilterKey.set(event.key as InterventionFilterFieldKey);
  }

  /**
   * * Narrows a filter bar field key to {@link InterventionEnumFilterKey}.
   */
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

  /**
   * Method enumFieldOperator
   *
   * @description
   * Which operator one of the six `equals`/`isAnyOf` chips reads. An explicit
   * pick wins over the value's own shape, because the URL cannot tell the two
   * apart at one value: `['planned']` and `'planned'` both serialize to
   * `status=planned`, so deriving from the shape alone made "is any of"
   * silently snap back to "is" the moment a single value was selected. The
   * shape only decides for a field the user has not touched this session —
   * a multi-value URL arrives as `isAnyOf`, everything else as `equals`.
   *
   * @access protected
   * @since 11.1.0
   *
   * @param {InterventionEnumFilterKey} key - The chip's field.
   *
   * @returns {'equals' | 'isAnyOf'} The operator its value control renders for.
   */
  protected enumFieldOperator(key: InterventionEnumFilterKey): 'equals' | 'isAnyOf' {
    const picked: 'equals' | 'isAnyOf' | undefined = this.enumFilterOperatorOverrides()[key];
    if (picked !== undefined) return picked;

    return Array.isArray(this.filters()[key]) ? 'isAnyOf' : 'equals';
  }

  /**
   * Method onEnumFilterOperatorPicked
   *
   * @description
   * Switches one of the six `equals`/`isAnyOf` fields to the picked operator's
   * value shape, carrying the current narrowing across whenever the two shapes
   * can hold it: `equals` becomes a one-element `isAnyOf`, and an `isAnyOf` of
   * exactly one becomes that scalar. Only a multi-value `isAnyOf` collapsing
   * to `equals` genuinely cannot be represented, and only that case clears.
   *
   * @access private
   * @since 11.1.0
   *
   * @param {InterventionEnumFilterKey} key - The chip's field.
   * @param {CollectionFilterOperator} operator - The newly picked operator.
   *
   * @returns {void}
   */
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

    const current: InterventionListFilters[InterventionEnumFilterKey] = this.filters()[key];
    if (current === null) return;

    const values: unknown[] = Array.isArray(current) ? [...current] : [current];
    const carried: unknown =
      operator === 'isAnyOf' ? values : values[1] ? null : (values[0] ?? null);

    this.applyFilter({ [key]: carried } as Partial<InterventionListFilters>);
  }

  /** Normalizes one of the six `equals`/`isAnyOf` fields' current value to a readonly array. */
  private toEnumValues<T>(value: T | readonly T[] | null): T[] {
    if (value === null) return [];
    return Array.isArray(value) ? [...(value as readonly T[])] : [value as T];
  }

  /**
   * * The `equals`-mode counterpart of {@link toEnumValues}.
   */
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

  /**
   * Method applyEnumSelection
   *
   * @description
   * Applies one of the six `equals`/`isAnyOf` fields' multi select selection,
   * and pins that field to `isAnyOf` for the rest of the session. The pin is
   * what stops the chip from snapping back to "is" when a selection is
   * narrowed down to one value: the URL serializes `['planned']` and
   * `'planned'` identically, so the value's own shape cannot tell the two
   * apart once a single value is left.
   *
   * @access private
   * @since 11.2.0
   * @template T
   * @param {InterventionEnumFilterKey} key - The field the selection belongs to.
   * @param {readonly T[] | null | undefined} values - Its next selection.
   * @returns {void}
   */
  private applyEnumSelection<T>(
    key: InterventionEnumFilterKey,
    values: readonly T[] | null | undefined,
  ): void {
    this.enumFilterOperatorOverrides.update(
      (
        overrides: Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>,
      ): Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>> => ({
        ...overrides,
        [key]: 'isAnyOf',
      }),
    );

    const patch = {
      [key]: values && values.length > 0 ? values : null,
    } as Partial<InterventionListFilters>;

    this.applyFilter(patch);
  }

  /**
   * * Applies the "Status" chip's multi select selection. See {@link applyEnumSelection}.
   */
  protected applyStatusFilter(values: readonly InterventionStatus[] | null | undefined): void {
    this.applyEnumSelection('status', values);
  }

  /**
   * * Applies the "Type" chip's multi select selection. See {@link applyEnumSelection}.
   */
  protected applyTypeFilter(values: readonly InterventionType[] | null | undefined): void {
    this.applyEnumSelection('type', values);
  }

  /**
   * * Applies the "Priority" chip's multi select selection. See {@link applyEnumSelection}.
   */
  protected applyPriorityFilter(values: readonly InterventionPriority[] | null | undefined): void {
    this.applyEnumSelection('priority', values);
  }

  /**
   * * Applies the "Site" chip's multi select selection. See {@link applyEnumSelection}.
   */
  protected applySiteFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('site', values);
  }

  /**
   * * Applies the "Responsible" chip's multi select selection. See {@link applyEnumSelection}.
   */
  protected applyResponsibleFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('responsible', values);
  }

  /**
   * * Applies the "Label" chip's multi select selection. See {@link applyEnumSelection}.
   */
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
  protected pickDueBetween(range: readonly [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ dueRange: { operator: 'between', after, before } });
  }

  /**
   * * Switches the "Planned start" chip's value control and drops any already-applied narrowing. See {@link onDueRangeOperatorPicked}.
   */
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
  protected pickPlannedStartBetween(range: readonly [Date, Date] | null | undefined): void {
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

  /**
   * * Keeps {@link openFilterKey} in sync with a field's own value control.
   */
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

  /** Drops every narrowing at once — mine and the legacy due window included — along with every pinned operator. */
  protected clearFilters(): void {
    this.enumFilterOperatorOverrides.set({});
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
      case 'dueWindow':
        return { dueWindow: null };
    }
  }

  /**
   * Method chipAccessibleName
   * @description The chip's screen-reader name. A field never renders a chip on a tab that does not honour it (see {@link offeredFilterFields}), so this name never needs to explain an inert state — it is always the field's own label.
   * @access protected
   * @since 11.0.0
   * @param {InterventionFilterFieldKey} key - The chip's field.
   * @returns {string} The localized accessible name.
   */
  protected chipAccessibleName(key: InterventionFilterFieldKey): string {
    return this.changeFilterLabel(this.filterFieldOption(key).fieldLabel);
  }

  /** Merges query params into the URL without touching the path. */
  private navigateQuery(queryParams: Record<string, string | null>): void {
    if (Object.keys(queryParams).some((key) => !['view', 'create', 'p'].includes(key)))
      queryParams = { ...queryParams, p: null };
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
  /**
   * Method toggleSelectionMode
   * @method toggleSelectionMode
   * @description Enters or leaves the compact layout's selection mode, clearing the selection on the way out.
   * @access protected
   * @since 15.0.0
   * @returns {void}
   */
  protected toggleSelectionMode(): void {
    const next: boolean = !this.selectionMode();
    this.selectionMode.set(next);

    if (!next) this.selectedIds.set(new Set<string>());
  }

  //#endregion
}
