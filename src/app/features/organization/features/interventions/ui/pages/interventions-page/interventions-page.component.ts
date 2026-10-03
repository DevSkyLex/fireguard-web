import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
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
  lucideListChecks,
  lucideMapPin,
  lucidePlus,
  lucideSlidersHorizontal,
  lucideTag,
  lucideTimer,
  lucideTrash2,
  lucideUser,
  lucideUserCog,
  lucideWrench,
  lucideChevronDown,
} from '@ng-icons/lucide';
import { Events } from '@ngrx/signals/events';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
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
  type InterventionDueRangeFilter,
  type InterventionDuplicatePrefill,
  type InterventionFilterFieldKey,
  type InterventionFilterFieldOption,
  type InterventionListFilters,
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
  type InterventionBoardCardViewModel,
} from '@features/organization/features/interventions/models';
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
import {
  buildInterventionDuplicatePrefill,
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
import { DashboardPanelRegistry } from '@layouts/dashboard-layout';
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
import { CollectionSkeletonCards } from '@shared/collection-surface';
import {
  CollectionSearchBox,
  CollectionSelectionBar,
  CollectionToolbar,
  type CollectionSelectionAction,
  type CollectionSelectionCommand,
} from '@shared/collection-toolbar';
import { GateReasonDirective } from '@shared/gate-reason';
import type { RegionalFormatSettings } from '@shared/regional-format';
import { formatRelativeDays } from '@shared/relative-time';
import { ResourceIllustration } from '@shared/resource-illustration';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmButtonGroup } from '@shared/ui/button-group';
import { HlmCheckboxImports } from '@shared/ui/checkbox';
import { HlmDrawerImports } from '@shared/ui/drawer';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSeparatorImports } from '@shared/ui/separator';
import { HlmSkeleton } from '@shared/ui/skeleton';
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
  interventionRecurrenceStoreEvents,
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
  INTERVENTION_TABLE_DEFAULT_HIDDEN_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import type {
  InterventionListItemViewModel,
  InterventionView,
  InterventionViewCriteria,
} from './models';
import type { InterventionBatchAction } from './models/intervention-batch-action.type';
import { projectInterventionCalendarCriteria, resolveInterventionViewCriteria } from './utils';

/**
 * Constant DUE_SOON_WINDOW_MS
 *
 * @description
 * How close a deadline must be to count as "due soon".
 */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/**
 * Constant PAGE_SIZES
 *
 * @description
 * The page sizes offered under the table — the server default first, its clamp last.
 */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/**
 * Constant SEARCH_DEBOUNCE_MS
 *
 * @description
 * How long typing settles before the search reaches the wire.
 */
const SEARCH_DEBOUNCE_MS: number = 300;

/**
 * Constant NO_FILTERS
 *
 * @description
 * The narrowing "Clear filters" restores — none.
 */
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
 * The three operators the "Deadline" chip's own `dueRange` field declares.
 *
 * @since 1.0.0
 *
 * @type {InterventionDueRangeOperator}
 */
type InterventionDueRangeOperator = 'greaterThan' | 'lessThan' | 'between';

/**
 * Type InterventionPlannedStartRangeOperator
 *
 * @description
 * The three operators the "Planned start" chip's own `plannedStartRange` field declares.
 *
 * @since 1.0.0
 *
 * @type {InterventionPlannedStartRangeOperator}
 */
type InterventionPlannedStartRangeOperator = 'greaterThan' | 'lessThan' | 'between';

/**
 * Type InterventionEnumFilterKey
 *
 * @description
 * The six {@link InterventionFilterFieldKey} entries whose value discriminates its own operator by
 * shape (a scalar under `equals`, a readonly array under `isAnyOf`).
 *
 * @since 1.0.0
 *
 * @type {InterventionEnumFilterKey}
 */
type InterventionEnumFilterKey = 'status' | 'type' | 'priority' | 'site' | 'responsible' | 'label';

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
 * It owns what a table, a board or a calendar must not — the query each
 * sends, the `?q=`/`?create=`/filter params it round-trips, the ordering,
 * the column visibility and the page window (`ARCHITECTURE.md` §2.5).
 * Paging, filtering and sorting are server-side end to end for the List
 * tab: the loaded entities ARE the current page, the footer derives its page
 * count from the server's `totalItems`, and any narrowing or search change
 * restarts from page one — {@link page} is a `linkedSignal` over
 * {@link filters} and {@link searchTerm}. The selection clears on every List
 * load: it only ever refers to rows of the page on screen, so the
 * bulk-delete dialog can never promise rows the operator no longer sees.
 * Deletion is confirm-gated: a row's Delete entry and the toolbar's "Delete
 * selected" both set a `pending*` target signal instead of calling the store
 * directly, driving the single `hlm-alert-dialog` shared by both paths. A
 * bulk selection is filtered to the rows whose server-computed
 * `allowedActions.canDelete` is true before the dialog opens, so the count it
 * shows is always what will actually delete — never a promise the API would
 * refuse with a 409.
 * "Duplicate" reuses the same creation sheet, prefilled — from a row's own
 * menu, or from a cross-route handoff `InterventionStore.pendingDuplicatePrefill`
 * carries when the detail page navigates here with `?create=1`. Never a
 * server-side copy: it ends in the normal `create` call, and never carries
 * `status`, the planned window or the review note.
 * The "Display" toolbar button is a `hlm-popover` trigger opening a panel
 * that groups every presentation preference the List tab owns — ordering and
 * column visibility — the way Linear's own Display control does. Display,
 * Export and the bulk-actions menu render only while
 * {@link activeView} is `list`: the Board and the Calendar have no use for
 * any of them.
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
    ...HlmAlertImports,
    HlmAvatarImports,
    NgTemplateOutlet,
    ...HlmDrawerImports,
    NgIcon,
    ...HlmEmptyImports,
    ResourceIllustration,
    StateIllustration,
    ...HlmItemImports,
    HlmButtonGroup,
    ...HlmTabsImports,
    GateReasonDirective,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
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
    CollectionSkeletonCards,
    CollectionSearchBox,
    CollectionSelectionBar,
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
      lucideListChecks,
      lucideMapPin,
      lucidePlus,
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
  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Central interaction mode; viewport width only controls geometry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property mobileToolsVisible
   * @readonly
   *
   * @description
   * Keeps an open tools drawer mounted until dismissal restores focus after an interaction mode
   * change.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly mobileToolsVisible: WritableSignal<boolean> = signal(false);

  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace whose interventions are shown, bound from the route.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property q
   * @readonly
   *
   * @description
   * - The search term the URL carries. See {@link searchTerm}.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property collectionPage
   * @readonly
   *
   * @description
   * One-based list page restored from the collection URL after detail navigation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly collectionPage = input<string | undefined>(undefined, { alias: 'p' });

  /**
   * Property create
   * @readonly
   *
   * @description
   * `?create=1` opens the creation sheet on arrival — the contract the parent feature's landing
   * page uses to start an intervention.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property view
   * @readonly
   *
   * @description
   * - Which tab is shown — `board`/`calendar`, absent (or any other value) meaning `list`. See
   *   {@link activeView}.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly view: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property status
   * @readonly
   *
   * @description
   * The status filter the URL carries.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly status: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property type
   * @readonly
   *
   * @description
   * The type filter the URL carries.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly type: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property priority
   * @readonly
   *
   * @description
   * The priority filter the URL carries.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly priority: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property site
   * @readonly
   *
   * @description
   * The site filter the URL carries, as a raw facility id.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly site: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property responsible
   * @readonly
   *
   * @description
   * The responsible filter the URL carries, as a raw member id.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly responsible: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /**
   * Property label
   * @readonly
   *
   * @description
   * The label filter the URL carries, as a raw label id.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly label: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property mine
   * @readonly
   *
   * @description
   * `?mine=1` narrows to the signed-in member (responsible OR participant).
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly mine: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property due
   * @readonly
   *
   * @description
   * The named due-date window the URL carries — the segmented views' and the Today page's own
   * legacy preset.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property dueAfter
   * @readonly
   *
   * @description
   * The filter bar's "Deadline" chip lower bound, `YYYY-MM-DD`.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly dueAfter: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property dueBefore
   * @readonly
   *
   * @description
   * The filter bar's "Deadline" chip upper bound, `YYYY-MM-DD`.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly dueBefore: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property plannedStartAfter
   * @readonly
   *
   * @description
   * The filter bar's "Planned start" chip lower bound, `YYYY-MM-DD`.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly plannedStartAfter: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  /**
   * Property plannedStartBefore
   * @readonly
   *
   * @description
   * The filter bar's "Planned start" chip upper bound, `YYYY-MM-DD`.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly plannedStartBefore: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

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
    () => this.store.listError()?.code === 403,
  );

  //#endregion

  //#region Properties
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
   * The active organization's date pattern and timezone, read by `appOrgDate` bindings and
   * forwarded to date-rendering children.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property store
   * @readonly
   *
   * @description
   * The List/Board tabs' shared dataset.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InterventionStoreType}
   */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /**
   * Property planningOptions
   * @readonly
   *
   * @description
   * Site, member and label choices for the filter bar and the creation form.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InterventionPlanningOptionsStoreType}
   */
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

  /**
   * Property recurrenceStore
   * @readonly
   *
   * @description
   * The organization's recurring intervention schedules, backing the Recurrences tab.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InterventionRecurrenceStoreType}
   */
  protected readonly recurrenceStore: InterventionRecurrenceStoreType =
    inject<InterventionRecurrenceStoreType>(InterventionRecurrenceStore);

  /**
   * Property calendarStore
   * @readonly
   *
   * @description
   * The Calendar tab's own bounded-window dataset — component-scoped here since only a page may
   * inject a store; see class doc.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InterventionCalendarStoreType}
   */
  protected readonly calendarStore: InterventionCalendarStoreType =
    inject<InterventionCalendarStoreType>(InterventionCalendarStore);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating every tab's write actions.
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
   * Property firstDayOfWeek
   * @readonly
   *
   * @description
   * The organization's regional first-day-of-week preference, Monday when unset.
   *
   * @access protected
   * @since 1.0.0
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
   * Property platformId
   * @readonly
   *
   * @description
   * Whether the app runs in the browser — gates the Calendar's fetch, a dated authenticated read
   * that would immediately refetch after hydration.
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
   * The active locale, resolving each row's day-granular due label.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to open a created intervention's detail page and to round-trip every
   * `?q=`/filter/`?view=` query param.
   *
   * @access private
   * @since unreleased
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
   * @since unreleased
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /**
   * Property preferences
   * @readonly
   *
   * @description
   * The cookie-backed memory of how the List tab was left (sort, columns, page size).
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionListPreferencesService}
   */
  private readonly preferences: InterventionListPreferencesService =
    inject<InterventionListPreferencesService>(InterventionListPreferencesService);

  /**
   * Property interventionService
   * @readonly
   *
   * @description
   * Read directly rather than through {@link InterventionStore}: the export
   * is a one-shot, page-local drain of every matching row, and the store's
   * public surface only ever loads and caches one server page at a time.
   *
   * @access private
   * @since unreleased
   *
   * @type {InterventionService}
   */
  private readonly interventionService: InterventionService = inject(InterventionService);

  /**
   * Property browserDownload
   * @readonly
   *
   * @description
   * Saves the generated CSV to the visitor's device, browser-only.
   *
   * @access private
   * @since unreleased
   *
   * @type {BrowserDownloadService}
   */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * Reports the export's outcome — a truncation warning or a failure.
   *
   * @access private
   * @since unreleased
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Unsubscribes the export's in-flight drain if the page is left mid-fetch.
   *
   * @access private
   * @since unreleased
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property pageActionsService
   * @readonly
   *
   * @description
   * - Registers {@link pageActions} on the layout header.
   *
   * @access private
   * @since unreleased
   *
   * @type {PageActionsService}
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

  /**
   * Property calendarView
   * @readonly
   *
   * @description
   * Lazily mounted calendar owning the selected-day template and selection signals.
   *
   * @access private
   * @since 14.0.0
   *
   * @type {Signal<InterventionCalendar | undefined>}
   */
  private readonly calendarView: Signal<InterventionCalendar | undefined> =
    viewChild(InterventionCalendar);

  /**
   * Property panelRegistry
   * @readonly
   *
   * @description
   * Shell-scoped registry for the active Calendar tab's day panel.
   *
   * @access private
   * @since 14.0.0
   *
   * @type {DashboardPanelRegistry}
   */
  private readonly panelRegistry: DashboardPanelRegistry = inject(DashboardPanelRegistry);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * The signed-in member, resolving the "my interventions" chip and the List tab's identity gates.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationMemberAccessStoreType}
   */
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
   *
   * @description
   * Which tab is currently shown. See {@link InterventionView} and the `view` input. `recurrences`
   * falls back to `list` for a viewer without {@link canReadRecurrences}.
   *
   * @access protected
   * @since 11.0.0
   *
   * @type {Signal<InterventionView>}
   */
  protected readonly activeView: Signal<InterventionView> = computed<InterventionView>(
    () => this.viewCriteria().view,
  );

  /**
   * Property memberIri
   * @readonly
   *
   * @description
   * The signed-in member's IRI in this organization, null until the profile resolves — the same
   * identity the detail page's submit gate reads.
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
   * The active narrowing, parsed from the URL's query params — the URL is the single source of
   * truth, so a filtered collection is shareable and the back button restores it.
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

  /**
   * Property viewCriteria
   * @readonly
   *
   * @description
   * Resolves the permitted collection view and its supported filter catalogue without changing the
   * URL.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<InterventionViewCriteria>}
   */
  private readonly viewCriteria: Signal<InterventionViewCriteria> =
    computed<InterventionViewCriteria>(() =>
      resolveInterventionViewCriteria(this.view(), this.canReadRecurrences()),
    );

  /**
   * Property boardFilters
   * @readonly
   *
   * @description
   * - {@link filters}, `status` forced to `null` — the Board's columns are the status narrowing, so a
   *   `status` value left in the URL by another tab must never reach its query.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<InterventionListFilters>}
   */
  protected readonly boardFilters: Signal<InterventionListFilters> =
    computed<InterventionListFilters>(() => ({ ...this.filters(), status: null }));

  /**
   * Property searchTerm
   * @readonly
   *
   * @description
   * The search as everything downstream reads it: trimmed, never `undefined`.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /**
   * Property draftSearch
   * @readonly
   *
   * @description
   * What the search box holds, before the debounce settles.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /**
   * Property sortOrder
   * @readonly
   *
   * @description
   * The active ordering, restored from the preferences cookie.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionListSort>}
   */
  protected readonly sortOrder: WritableSignal<InterventionListSort> = signal<InterventionListSort>(
    this.preferences.readSort(),
  );

  /**
   * Property hiddenColumns
   * @readonly
   *
   * @description
   * Which optional columns the operator has hidden, restored from the preferences cookie.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlySet<InterventionTableColumn>>}
   */
  protected readonly hiddenColumns: WritableSignal<ReadonlySet<InterventionTableColumn>> = signal<
    ReadonlySet<InterventionTableColumn>
  >(this.restoreHiddenColumns());

  /**
   * Property exportBusy
   * @readonly
   *
   * @description
   * Whether an export request is currently in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property page
   * @readonly
   *
   * @description
   * The List tab's page window, one-based — a `linkedSignal` over {@link filters} and
   * {@link searchTerm} and the page query parameter, preserving the window when returning from a
   * detail.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly page: WritableSignal<number> = linkedSignal<number>((): number => {
    this.filters();
    this.searchTerm();
    const value = Number(this.collectionPage());
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  });

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * How many rows a page holds, restored from the preferences cookie.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<number>}
   */
  protected readonly pageSize: WritableSignal<number> = signal<number>(this.restorePageSize());

  /**
   * Property createSheetVisible
   * @readonly
   *
   * @description
   * Whether the creation sheet is open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property createTemplateId
   * @readonly
   *
   * @description
   * The header menu prepares a template in the sheet before any API mutation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly createTemplateId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property recurrenceTarget
   * @readonly
   *
   * @description
   * What the recurrence sheet is open on: `'create'`, an existing row for edit, `null` for closed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionRecurrenceFormTarget>}
   */
  protected readonly recurrenceTarget: WritableSignal<InterventionRecurrenceFormTarget> =
    signal<InterventionRecurrenceFormTarget>(null);

  /**
   * Property awaitingRecurrenceWrite
   * @readonly
   *
   * @description
   * Captures the sheet's accepted operation and target until its matching result arrives.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<'create' | { readonly recurrenceId: string } | null>}
   */
  protected readonly awaitingRecurrenceWrite: WritableSignal<
    'create' | { readonly recurrenceId: string } | null
  > = signal(null);

  /**
   * Property awaitingRecurrenceRemove
   * @readonly
   *
   * @description
   * Captures the confirmed recurrence id until its matching deletion settles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly awaitingRecurrenceRemove: WritableSignal<string | null> = signal(null);

  /**
   * Property pendingRecurrenceDelete
   * @readonly
   *
   * @description
   * The recurrence a row's Delete action asked to remove, pending the confirm dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionRecurrenceOutput | null>}
   */
  protected readonly pendingRecurrenceDelete: WritableSignal<InterventionRecurrenceOutput | null> =
    signal<InterventionRecurrenceOutput | null>(null);

  /**
   * Property duplicatePrefill
   * @readonly
   *
   * @description
   * What the creation sheet is currently prefilled with, from a "Duplicate" request. `null` for a
   * plain "New intervention".
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionDuplicatePrefill | null>}
   */
  protected readonly duplicatePrefill: WritableSignal<InterventionDuplicatePrefill | null> =
    signal<InterventionDuplicatePrefill | null>(null);

  /**
   * Property selectedIds
   * @readonly
   *
   * @description
   * Currently selected row ids, scoped to the loaded List page — cleared on every List load.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property pendingDelete
   * @readonly
   *
   * @description
   * The intervention a row's menu asked to delete, pending confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionOutput | null>}
   */
  protected readonly pendingDelete: WritableSignal<InterventionOutput | null> =
    signal<InterventionOutput | null>(null);

  /**
   * Property pendingBulkDeleteIds
   * @readonly
   *
   * @description
   * The selected, deletable ids the toolbar asked to bulk-delete, pending confirmation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlyArray<string> | null>}
   */
  protected readonly pendingBulkDeleteIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /**
   * Property assignRequest
   * @readonly
   *
   * @description
   * What `InterventionAssignDialog` is currently asking to assign, or `null` to keep it closed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionAssignRequest | null>}
   */
  protected readonly assignRequest: WritableSignal<InterventionAssignRequest | null> =
    signal<InterventionAssignRequest | null>(null);

  /**
   * Property pendingBulkAssignIds
   * @readonly
   *
   * @description
   * The selected, assignable ids the toolbar asked to bulk-assign, pending the dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlyArray<string> | null>}
   */
  protected readonly pendingBulkAssignIds: WritableSignal<ReadonlyArray<string> | null> =
    signal<ReadonlyArray<string> | null>(null);

  /**
   * Property calendarMonth
   * @readonly
   *
   * @description
   * The Calendar tab's displayed anchor — `null` until `InterventionCalendar` reports its first
   * one, which gates the load effect until the tab actually activates.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<Date | null>}
   */
  protected readonly calendarMonth: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property allColumns
   * @readonly
   *
   * @description
   * Every hideable column, for the Display popover's column list.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ReadonlyArray<InterventionTableColumn>}
   */
  protected readonly allColumns: ReadonlyArray<InterventionTableColumn> =
    INTERVENTION_TABLE_COLUMNS;

  /**
   * Property sortOptions
   * @readonly
   *
   * @description
   * Orderings the Display popover's field select offers.
   *
   * @access protected
   * @since unreleased
   *
   * @type {SelectOption<InterventionSortField>[]}
   */
  protected readonly sortOptions: SelectOption<InterventionSortField>[] = INTERVENTION_SORT_OPTIONS;

  /**
   * Property dueWindowOptions
   * @readonly
   *
   * @description
   * Named deadline windows the `?due=` chip offers — the same catalog the URL parser reads.
   *
   * @access protected
   * @since unreleased
   *
   * @type {SelectOption<InterventionDueWindow>[]}
   */
  protected readonly dueWindowOptions: SelectOption<InterventionDueWindow>[] =
    INTERVENTION_DUE_WINDOW_OPTIONS;

  /**
   * Property dueWindowValue
   * @readonly
   *
   * @description
   * The active named deadline window, or `null` — the `?due=` chip's value.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<InterventionDueWindow | null>}
   */
  protected readonly dueWindowValue: Signal<InterventionDueWindow | null> =
    computed<InterventionDueWindow | null>(() => this.filters().dueWindow);

  /**
   * Property dueWindowLabelOf
   * @readonly
   *
   * @description
   * Renders a named deadline window in the `?due=` chip's trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: InterventionDueWindow | null) => string}
   */
  protected readonly dueWindowLabelOf: (value: InterventionDueWindow | null) => string = (
    value: InterventionDueWindow | null,
  ): string =>
    INTERVENTION_DUE_WINDOW_OPTIONS.find(
      (option: SelectOption<InterventionDueWindow>): boolean => option.value === value,
    )?.label ?? '';

  /**
   * Property statusOptions
   * @readonly
   *
   * @description
   * Status choices offered in the filter bar.
   *
   * @access protected
   * @since unreleased
   *
   * @type {SelectOption<InterventionStatus>[]}
   */
  protected readonly statusOptions: SelectOption<InterventionStatus>[] =
    INTERVENTION_STATUS_FILTER_OPTIONS;

  /**
   * Property typeOptions
   * @readonly
   *
   * @description
   * Intervention type choices displayed by the list filters.
   *
   * @access protected
   * @since unreleased
   *
   * @type {SelectOption<InterventionType>[]}
   */
  protected readonly typeOptions: SelectOption<InterventionType>[] =
    INTERVENTION_TYPE_FILTER_OPTIONS;

  /**
   * Property priorityOptions
   * @readonly
   *
   * @description
   * Priority choices offered in the filter bar.
   *
   * @access protected
   * @since unreleased
   *
   * @type {SelectOption<InterventionPriority>[]}
   */
  protected readonly priorityOptions: SelectOption<InterventionPriority>[] =
    INTERVENTION_PRIORITY_FILTER_OPTIONS;

  /**
   * Property exportDisabled
   * @readonly
   *
   * @description
   * Whether the export button should be inert: nothing loaded yet, nothing matches the current
   * query, or an export is already in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
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

  /**
   * Property detailRouteBase
   * @readonly
   *
   * @description
   * Where a row's link points, on every tab.
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
   * Property canTransition
   * @readonly
   *
   * @description
   * Whether the member may move an intervention along — the List row menu's and the Board card's
   * own gate.
   *
   * @access protected
   * @since unreleased
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
   * Whether the member may delete an intervention.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDelete: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasAnyPermission([
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
    ]),
  );

  /**
   * Property canAssign
   * @readonly
   *
   * @description
   * Whether the member may assign a responsible.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canAssign: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canReadRecurrences
   * @readonly
   *
   * @description
   * Whether the Recurrences tab renders at all.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property canWriteRecurrences
   * @readonly
   *
   * @description
   * Whether the Recurrences tab offers create/edit/delete/toggle, or renders read-only.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWriteRecurrences: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property recurrencePending
   * @readonly
   *
   * @description
   * Whether the current sheet target has an accepted command in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly recurrencePending: Signal<boolean> = computed(() => {
    const target = this.recurrenceTarget();
    if (target === null) return false;
    if (target === 'create') return isCallPending(this.recurrenceStore.createCallState());
    return (
      this.recurrenceStore.savingIds().includes(target.id) ||
      this.recurrenceStore.removingIds().includes(target.id)
    );
  });

  /**
   * Property recurrenceServerError
   * @readonly
   *
   * @description
   * Failure belonging exclusively to the current form target.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly recurrenceServerError: Signal<string | null> = computed(() => {
    const target = this.recurrenceTarget();
    if (target === null) return null;
    return (
      (target === 'create'
        ? this.recurrenceStore.createCallState().error
        : this.recurrenceStore.updateCallStates()[target.id]?.error
      )?.message ?? null
    );
  });

  /**
   * Property recurrenceRemovePending
   * @readonly
   *
   * @description
   * Locks confirmation only while its target is being updated or removed.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly recurrenceRemovePending: Signal<boolean> = computed(() => {
    const target = this.pendingRecurrenceDelete();
    return (
      target !== null &&
      (this.recurrenceStore.savingIds().includes(target.id) ||
        this.recurrenceStore.removingIds().includes(target.id))
    );
  });

  /**
   * Property canCreate
   * @readonly
   *
   * @description
   * Creation and its URL entry point share the planning permission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreate: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property canDuplicate
   * @readonly
   *
   * @description
   * Whether the member may duplicate an intervention.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDuplicate: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN),
  );

  /**
   * Property siteDisplayMap
   * @readonly
   *
   * @description
   * Site names keyed by facility IRI.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ReadonlyMap<string, string>>}
   */
  private readonly siteDisplayMap: Signal<ReadonlyMap<string, string>> = computed(
    (): ReadonlyMap<string, string> =>
      new Map(
        this.planningOptions
          .sites()
          .map((site: SelectOption): [string, string] => [site.value, site.label]),
      ),
  );

  /**
   * Property memberDisplayMap
   * @readonly
   *
   * @description
   * Members keyed by IRI.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ReadonlyMap<string, MemberSelectOption>>}
   */
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
   * Property items
   * @readonly
   *
   * @description
   * Every loaded intervention as a List row view model.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly InterventionListItemViewModel[]>}
   */
  protected readonly items: Signal<readonly InterventionListItemViewModel[]> = computed(() =>
    this.store
      .interventionList()
      .map((intervention: InterventionOutput) => this.toItemViewModel(intervention)),
  );

  /**
   * Property boardStore
   * @readonly
   *
   * @description
   * Independent paginated status columns.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InstanceType<typeof InterventionBoardStore>}
   */
  protected readonly boardStore: InstanceType<typeof InterventionBoardStore> =
    inject(InterventionBoardStore);

  /**
   * Property boardItems
   * @readonly
   *
   * @description
   * - Every loaded intervention as a Board card view model — see {@link boardFilters}, which shapes
   *   what {@link InterventionStore.interventionList} holds while the Board tab is active.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly InterventionBoardCardViewModel[]>}
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
   * Property canMoveBoardItem
   * @readonly
   *
   * @description
   * Applies the feature’s permission, pending-state and transition policy to board moves.
   *
   * @access protected
   * @since 15.0.0
   *
   * @type {(item: InterventionBoardCardViewModel, status: InterventionStatus) => boolean}
   *
   * @param {InterventionBoardCardViewModel} item - The candidate intervention card.
   * @param {InterventionStatus} status - The requested status.
   *
   * @returns {boolean}
   *
   * @function canMoveBoardItem
   */
  protected readonly canMoveBoardItem = (
    item: InterventionBoardCardViewModel,
    status: InterventionStatus,
  ): boolean =>
    this.canTransition() &&
    this.boardStore.moves()[item.intervention.id]?.status !== 'pending' &&
    isInterventionBoardMoveAllowed(item.intervention, status, this.memberIri());

  /**
   * Property boardMoveBlockedReason
   * @readonly
   *
   * @description
   * Supplies feature-owned transition and membership explanations to the generic board.
   *
   * @access protected
   * @since 15.0.0
   *
   * @type {(item: InterventionBoardCardViewModel, status: InterventionStatus) => string | null}
   *
   * @param {InterventionBoardCardViewModel} item - The dragged intervention.
   * @param {InterventionStatus} status - The candidate destination.
   *
   * @returns {string | null}
   *
   * @function boardMoveBlockedReason
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
   * @param {BoardMove<InterventionBoardCardViewModel, InterventionStatus>} event - The validated
   *   board move request.
   *
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

  /**
   * Method boardColumnCountLabel
   * @method boardColumnCountLabel
   *
   * @description
   * Names a mobile board column's count badge for screen-reader navigation —
   * the mobile grid's own count badge, mirroring the shared `Board`
   * component's `countLabel`.
   *
   * @access protected
   * @since 6.4.0
   *
   * @param {BoardColumn<InterventionBoardCardViewModel, InterventionStatus>} column - The counted
   *   column.
   *
   * @returns {string} The localized accessible name.
   */
  protected boardColumnCountLabel(
    column: BoardColumn<InterventionBoardCardViewModel, InterventionStatus>,
  ): string {
    return $localize`:@@intervention.board.columnItemCount:${column.total ?? column.items.length}:count: items in ${column.label}:column:`;
  }

  /**
   * Property pageCount
   * @readonly
   *
   * @description
   * How many pages the whole server-side List collection fills — at least one, so the footer never
   * reads "Page 1 of 0".
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalInterventions() / this.pageSize())),
  );

  /**
   * Property batchSelectedCount
   * @readonly
   *
   * @description
   * Selection size before eligibility filtering.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly batchSelectedCount = signal(0);

  /**
   * Property batchNames
   * @readonly
   *
   * @description
   * Readable identities captured before successful rows leave the current page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<Record<string, string>>}
   */
  protected readonly batchNames = signal<Record<string, string>>({});

  /**
   * Property lastBatchAction
   * @readonly
   *
   * @description
   * Last explicit batch intention, retained for a targeted retry.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<InterventionBatchAction | null>}
   */
  private readonly lastBatchAction = signal<InterventionBatchAction | null>(null);

  /**
   * Property batchPending
   * @readonly
   *
   * @description
   * Whether at least one batch operation is still in flight.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly batchPending = computed(() =>
    this.batchResults().some((result) => result.state?.status === 'pending'),
  );

  /**
   * Property batchIds
   * @readonly
   *
   * @description
   * Eligible intervention identifiers whose results are tracked for this batch.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly string[]>}
   */
  protected readonly batchIds: WritableSignal<readonly string[]> = signal<readonly string[]>([]);

  /**
   * Property batchSettled
   * @readonly
   *
   * @description
   * Prevents repeating the collection refresh after completion.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly batchSettled: WritableSignal<boolean> = signal(false);

  /**
   * Property batchResults
   * @readonly
   *
   * @description
   * Consolidated per-resource results; failures remain selected.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ id: string; name: string; state: CallState | undefined }[]>}
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
   *
   * @description
   * Confirmed successful operations in the current batch.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly batchSucceededCount = computed(
    () => this.batchResults().filter((result) => result.state?.status === 'success').length,
  );

  /**
   * Property batchFailedCount
   * @readonly
   *
   * @description
   * Failed operations retained for retry.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly batchFailedCount = computed(
    () => this.batchResults().filter((result) => result.state?.status === 'error').length,
  );

  /**
   * Property deletableSelectedIds
   * @readonly
   *
   * @description
   * Ids of the current selection that are actually deletable — the rows whose server-computed
   * `allowedActions.canDelete` is true.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
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

  /**
   * Property bulkDeleteLabel
   * @readonly
   *
   * @description
   * The bulk-delete button's label, counting only the deletable subset of the selection.
   *
   * @access protected
   * @since unreleased
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
   * Ids of the current selection that are actually assignable — status `draft` or `planned`.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlyArray<string>>}
   */
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

  /**
   * Property bulkAssignLabel
   * @readonly
   *
   * @description
   * The bulk-assign menu entry's label, counting only the assignable subset of the selection.
   *
   * @access protected
   * @since unreleased
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
   * Every status the current selection could move to — the bulk "Move to" menu's own entries.
   *
   * @access protected
   * @since unreleased
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
   * Property selectionActions
   * @readonly
   *
   * @description
   * Current permission- and row-eligible bulk commands for the shared selection bar.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly CollectionSelectionAction[]>}
   */
  protected readonly selectionActions: Signal<readonly CollectionSelectionAction[]> = computed(
    () => {
      const actions: CollectionSelectionAction[] = [];
      const pending = this.batchPending();

      if (this.canTransition()) {
        const transitions: CollectionSelectionCommand[] = this.bulkTransitionTargets()
          .filter((target) => this.transitionableSelectedIds(target).length > 0)
          .map((target) => ({
            kind: 'command',
            id: `transition:${target}`,
            label: `${this.statusLabelOf(target)} (${this.transitionableSelectedIds(target).length})`,
            icon: 'lucideFlag',
            disabled: pending,
          }));
        if (transitions.length > 0) {
          actions.push({
            kind: 'group',
            id: 'transitions',
            label: $localize`:@@intervention.list.bulkMoveToLabel:Move to`,
            icon: 'lucideFlag',
            actions: transitions,
          });
        }
      }

      if (this.canAssign() && this.assignableSelectedIds().length > 0) {
        actions.push({
          kind: 'command',
          id: 'assign',
          label: this.bulkAssignLabel(),
          icon: 'lucideUserCog',
          disabled: pending || this.assignDialogBusy(),
        });
      }

      if (this.canDelete()) {
        const deletable = this.deletableSelectedIds().length;
        actions.push({
          kind: 'command',
          id: 'delete',
          label: this.bulkDeleteLabel(),
          icon: 'lucideTrash2',
          disabled: pending || deletable === 0,
          disabledReason:
            deletable === 0
              ? $localize`:@@intervention.list.noSelectedRowsDeletable:No selected intervention can be deleted.`
              : undefined,
          destructive: true,
        });
      }

      return actions;
    },
  );

  /**
   * Property assignAttemptIds
   * @readonly
   *
   * @description
   * Resources in the current assignment attempt; successful rows are excluded from retries.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<readonly string[]>}
   */
  private readonly assignAttemptIds: WritableSignal<readonly string[]> = signal([]);

  /**
   * Property assignDialogBusy
   * @readonly
   *
   * @description
   * Keeps the assignment draft locked until every resource has a confirmed result.
   *
   * @access protected
   * @since 1.0.0
   *
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
   *
   * @description
   * Names failed resources without discarding the responsible selected in the dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly assignErrors: Signal<readonly string[]> = computed(() =>
    this.assignAttemptIds().flatMap((id) => {
      const state = this.store.mutationCallStates()[id];
      if (state?.status !== 'error') return [];
      const name = this.batchNames()[id] ?? this.assignRequest()?.interventionName ?? id;
      const message =
        state.error?.message ??
        $localize`:@@intervention.assign.failed:Assignment could not be saved.`;
      return [`${name}: ${message}`];
    }),
  );

  /**
   * Property deleteDialogState
   * @readonly
   *
   * @description
   * The confirm dialog's open/closed state, derived from whichever `pending*` target signal is set.
   *
   * @access protected
   * @since unreleased
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
   * @since unreleased
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
   * The confirm dialog's body: names the intervention for a single row, counts them for a bulk
   * selection.
   *
   * @access protected
   * @since unreleased
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
   * Property hasSearch
   * @readonly
   *
   * @description
   * Whether a search is active, which decides between the no-results and the first-run empty state.
   *
   * @access protected
   * @since unreleased
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
   * Whether the List tab's last load failed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasError: Signal<boolean> = computed<boolean>(
    () => this.store.listError() !== null,
  );

  /**
   * Property statusLabelOf
   * @readonly
   *
   * @description
   * Names a status on a closed select trigger, in the column menu, and in the bulk "Move to" menu.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: InterventionStatus) => string}
   */
  protected readonly statusLabelOf: (value: InterventionStatus) => string = (
    value: InterventionStatus,
  ): string => resolveInterventionTag('status', value).label;

  /**
   * Property typeLabelOf
   * @readonly
   *
   * @description
   * Names a type on a closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: InterventionType) => string}
   */
  protected readonly typeLabelOf: (value: InterventionType) => string = (
    value: InterventionType,
  ): string => resolveInterventionTag('type', value).label;

  /**
   * Property priorityLabelOf
   * @readonly
   *
   * @description
   * Names a priority on a closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: InterventionPriority) => string}
   */
  protected readonly priorityLabelOf: (value: InterventionPriority) => string = (
    value: InterventionPriority,
  ): string => resolveInterventionTag('priority', value).label;

  /**
   * Property siteLabelOf
   * @readonly
   *
   * @description
   * Names a site IRI on a closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly siteLabelOf: (value: string) => string = (value: string): string =>
    this.siteDisplayMap().get(value) ?? '';

  /**
   * Property responsibleLabelOf
   * @readonly
   *
   * @description
   * Names a member IRI on a closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly responsibleLabelOf: (value: string) => string = (value: string): string =>
    this.memberDisplayMap().get(value)?.label ?? '';

  /**
   * Property labelOptions
   * @readonly
   *
   * @description
   * The organization's intervention labels as filter options, including their semantic colors.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly SelectOption[]>}
   */
  protected readonly labelOptions: Signal<readonly SelectOption[]> = computed<
    readonly SelectOption[]
  >(() =>
    this.planningOptions.labels().map((label): SelectOption => ({
      value: `/api/intervention-labels/${label.id}`,
      label: label.name,
      color: label.color,
    })),
  );

  /**
   * Property labelDisplayMap
   * @readonly
   *
   * @description
   * Labels keyed by IRI.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<ReadonlyMap<string, string>>}
   */
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
   * Property labelLabelOf
   * @readonly
   *
   * @description
   * Names a label IRI on a closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: string) => string}
   */
  protected readonly labelLabelOf: (value: string) => string = (value: string): string =>
    this.labelDisplayMap().get(value) ?? '';

  /**
   * Property sortFieldLabelOf
   * @readonly
   *
   * @description
   * Names an ordering field on the Display popover's closed select trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(value: InterventionSortField) => string}
   */
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
   * The Display popover's direction toggle button label, naming the active ordering rather than the
   * action a click performs.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly sortDirectionLabel: Signal<string> = computed<string>(() =>
    this.sortOrder().direction === 'asc'
      ? $localize`:@@intervention.list.sortAscending:Ascending`
      : $localize`:@@intervention.list.sortDescending:Descending`,
  );

  /**
   * Property changeFilterLabel
   * @readonly
   *
   * @description
   * Names a filter chip's value segment, so each is distinguishable by screen reader.
   *
   * @access protected
   * @since unreleased
   *
   * @type {(fieldLabel: string) => string}
   */
  protected readonly changeFilterLabel: (fieldLabel: string) => string = (
    fieldLabel: string,
  ): string => $localize`:@@intervention.list.changeFilter:Change filter: ${fieldLabel}:field:`;

  /**
   * Property honouredFilterKeys
   * @readonly
   *
   * @description
   * The supported filter catalogue resolved by the page-local view criteria policy.
   *
   * @access protected
   * @since 11.0.0
   *
   * @type {Signal<ReadonlySet<InterventionFilterFieldKey>>}
   */
  protected readonly honouredFilterKeys: Signal<ReadonlySet<InterventionFilterFieldKey>> = computed<
    ReadonlySet<InterventionFilterFieldKey>
  >(() => new Set(this.viewCriteria().filterKeys));

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
   * Board criteria and the Calendar projection already apply only the fields each view declares,
   * regardless of what the bar renders.
   *
   * @access protected
   * @since 13.0.0
   *
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
   * Property activeFilterKeys
   * @readonly
   *
   * @description
   * - Which of `INTERVENTION_FILTER_FIELDS` currently carry a value, over the whole catalog rather
   *   than {@link offeredFilterFields} — the base {@link honouredActiveFilterKeys} narrows to what
   *   the active tab actually renders, and {@link filtersVisible}'s own seed reads this one
   *   directly, so a filter set on another tab still auto-expands the bar on arrival.
   *
   * @access protected
   * @since unreleased
   *
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
   *
   * @type {Signal<readonly InterventionFilterFieldKey[]>}
   */
  protected readonly honouredActiveFilterKeys: Signal<readonly InterventionFilterFieldKey[]> =
    computed<readonly InterventionFilterFieldKey[]>(() => {
      const honoured: ReadonlySet<InterventionFilterFieldKey> = this.honouredFilterKeys();

      return this.activeFilterKeys().filter((key: InterventionFilterFieldKey): boolean =>
        honoured.has(key),
      );
    });

  /**
   * Property filtersVisible
   * @readonly
   *
   * @description
   * Whether `app-collection-filter-bar` is currently mounted below the toolbar.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /**
   * Property openFilterKey
   * @readonly
   *
   * @description
   * Which field's value selector currently renders forced open — `null` when none is.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<InterventionFilterFieldKey | null>}
   */
  protected readonly openFilterKey: WritableSignal<InterventionFilterFieldKey | null> =
    signal<InterventionFilterFieldKey | null>(null);

  /**
   * Property enumFilterOperatorOverrides
   * @readonly
   *
   * @description
   * The operator pinned on one of the six `equals`/`isAnyOf` fields — set by an explicit pick or by
   * any multi selection, dropped when the chip is removed or every filter is cleared.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<
   *   Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>
   * >}
   */
  private readonly enumFilterOperatorOverrides: WritableSignal<
    Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>
  > = signal<Readonly<Partial<Record<InterventionEnumFilterKey, 'equals' | 'isAnyOf'>>>>({});

  /**
   * Property statusChipTemplate
   * @readonly
   *
   * @description
   * The "Status" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /**
   * Property typeChipTemplate
   * @readonly
   *
   * @description
   * The "Type" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly typeChipTemplate = viewChild<TemplateRef<unknown>>('typeChip');

  /**
   * Property priorityChipTemplate
   * @readonly
   *
   * @description
   * The "Priority" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly priorityChipTemplate = viewChild<TemplateRef<unknown>>('priorityChip');

  /**
   * Property dueWindowChipTemplate
   * @readonly
   *
   * @description
   * The `?due=` chip's value control.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly dueWindowChipTemplate = viewChild<TemplateRef<unknown>>('dueWindowChip');

  /**
   * Property siteChipTemplate
   * @readonly
   *
   * @description
   * The "Site" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly siteChipTemplate = viewChild<TemplateRef<unknown>>('siteChip');

  /**
   * Property responsibleChipTemplate
   * @readonly
   *
   * @description
   * The "Responsible" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly responsibleChipTemplate = viewChild<TemplateRef<unknown>>('responsibleChip');

  /**
   * Property labelChipTemplate
   * @readonly
   *
   * @description
   * The "Label" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly labelChipTemplate = viewChild<TemplateRef<unknown>>('labelChip');

  /**
   * Property dueRangeChipTemplate
   * @readonly
   *
   * @description
   * The "Deadline" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly dueRangeChipTemplate = viewChild<TemplateRef<unknown>>('dueRangeChip');

  /**
   * Property plannedStartRangeChipTemplate
   * @readonly
   *
   * @description
   * The "Planned start" chip's value control, projected into the filter bar.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly plannedStartRangeChipTemplate =
    viewChild<TemplateRef<unknown>>('plannedStartRangeChip');

  /**
   * Property chipTemplates
   * @readonly
   *
   * @description
   * - Every filter field's value-control `TemplateRef`, keyed by {@link InterventionFilterFieldKey},
   *   for `app-collection-filter-bar`'s `templates` input.
   *
   * @access protected
   * @since unreleased
   *
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
    dueWindow: this.dueWindowChipTemplate(),
  }));

  /**
   * Property dueRangeOperator
   * @readonly
   *
   * @description
   * The "Deadline" chip's own currently-selected operator.
   *
   * @access protected
   * @since unreleased
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
   *
   * @description
   * The applied `dueRange`'s lower bound, when its operator carries one.
   *
   * @access protected
   * @since unreleased
   *
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
   *
   * @description
   * The applied `dueRange`'s upper bound, when its operator carries one.
   *
   * @access protected
   * @since unreleased
   *
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
   *
   * @description
   * The applied deadline bounds when the operator is `between`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<[Date, Date] | undefined>}
   */
  protected readonly dueRangeBetween: Signal<[Date, Date] | undefined> = computed<
    [Date, Date] | undefined
  >(() => {
    const dueRange: InterventionDueRangeFilter | null = this.filters().dueRange;

    return dueRange?.operator === 'between' ? [dueRange.after, dueRange.before] : undefined;
  });

  /**
   * Property plannedStartRangeOperator
   * @readonly
   *
   * @description
   * - The "Planned start" chip's own currently-selected operator. See {@link dueRangeOperator}.
   *
   * @access protected
   * @since unreleased
   *
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
   *
   * @description
   * - The applied `plannedStartRange`'s lower bound, when its operator carries one. See
   *   {@link dueRangeAfter}.
   *
   * @access protected
   * @since unreleased
   *
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
   *
   * @description
   * - The applied `plannedStartRange`'s upper bound, when its operator carries one. See
   *   {@link dueRangeBefore}.
   *
   * @access protected
   * @since unreleased
   *
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
   *
   * @description
   * The applied planned-start bounds when the operator is `between`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<[Date, Date] | undefined>}
   */
  protected readonly plannedStartRangeBetween: Signal<[Date, Date] | undefined> = computed<
    [Date, Date] | undefined
  >(() => {
    const plannedStartRange: InterventionPlannedStartRangeFilter | null =
      this.filters().plannedStartRange;

    return plannedStartRange?.operator === 'between'
      ? [plannedStartRange.after, plannedStartRange.before]
      : undefined;
  });

  /**
   * Property filterOperators
   * @readonly
   *
   * @description
   * The currently active operator per field key, for `app-collection-filter-bar`'s
   * `activeOperators` input.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<Readonly<Record<string, CollectionFilterOperator>>>}
   */
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
   * @constructor
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
    effect((onCleanup): void => {
      const template =
        this.activeView() === 'calendar' ? this.calendarView()?.dayPanelTemplate() : undefined;
      if (!template) return;
      this.panelRegistry.register(
        template,
        $localize`:@@intervention.calendar.selectedDayPanelLabel:Selected day interventions`,
      );
      onCleanup(() => this.panelRegistry.clear(template));
    });

    effect(() => {
      const organizationIri = `/api/organizations/${this.organizationId()}`;
      untracked(() => {
        this.closeRecurrenceSheet();
        this.dismissRecurrenceDelete();
        this.recurrenceStore.setOrganization(organizationIri);
      });
    });
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
          filters: projectInterventionCalendarCriteria(filters, new Date()),
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

    const recurrenceEvents = inject(Events);
    recurrenceEvents
      .on(
        interventionRecurrenceStoreEvents.createSucceeded,
        interventionRecurrenceStoreEvents.createFailed,
      )
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (this.awaitingRecurrenceWrite() !== 'create' || this.recurrenceTarget() !== 'create')
          return;
        this.awaitingRecurrenceWrite.set(null);
        if (event.type === interventionRecurrenceStoreEvents.createSucceeded.type)
          this.recurrenceTarget.set(null);
      });
    recurrenceEvents
      .on(
        interventionRecurrenceStoreEvents.updateSucceeded,
        interventionRecurrenceStoreEvents.updateFailed,
      )
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        const awaiting = this.awaitingRecurrenceWrite();
        const target = this.recurrenceTarget();
        if (
          awaiting === null ||
          awaiting === 'create' ||
          target === null ||
          target === 'create' ||
          awaiting.recurrenceId !== event.payload.recurrenceId ||
          target.id !== event.payload.recurrenceId
        )
          return;
        this.awaitingRecurrenceWrite.set(null);
        if (event.type === interventionRecurrenceStoreEvents.updateSucceeded.type)
          this.recurrenceTarget.set(null);
      });
    recurrenceEvents
      .on(
        interventionRecurrenceStoreEvents.removeSucceeded,
        interventionRecurrenceStoreEvents.removeFailed,
      )
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (
          this.awaitingRecurrenceRemove() !== event.payload.recurrenceId ||
          this.pendingRecurrenceDelete()?.id !== event.payload.recurrenceId
        )
          return;
        this.awaitingRecurrenceRemove.set(null);
        if (event.type === interventionRecurrenceStoreEvents.removeSucceeded.type)
          this.pendingRecurrenceDelete.set(null);
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
   * @method switchView
   *
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
   *
   * @param {string} tab - The activated tab id (`list`/`board`/`calendar`/`recurrences`).
   *
   * @returns {void}
   */
  protected switchView(tab: string | readonly string[] | null | undefined): void {
    if (typeof tab !== 'string') return;

    const view: InterventionView =
      tab === 'board' || tab === 'calendar' || tab === 'recurrences' ? tab : 'list';

    this.navigateQuery({ view: view === 'list' ? null : view });
  }

  /**
   * Method clearSearch
   * @method clearSearch
   *
   * @description
   * Drops the search from the URL.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected clearSearch(): void {
    this.page.set(1);
    this.navigateQuery({ q: null });
  }

  /**
   * Method applySortField
   * @method applySortField
   *
   * @description
   * Orders by a column head. Re-picking the active field reverses it.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionSortField} field - Sort field to commit to the intervention list query.
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
    this.navigateQuery({ p: null });
    this.persistListPreferences();
  }

  /**
   * Method onSortFieldPicked
   * @method onSortFieldPicked
   *
   * @description
   * The Display popover's field select emits `null`/`undefined` only while clearing, which this
   * select never does.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionSortField | null | undefined} field - Selected sort field; nullish
   *   selections are ignored.
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
   * Flips the active ordering's direction without changing its field.
   *
   * @access protected
   * @since unreleased
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
   * @since unreleased
   *
   * @param {InterventionTableColumn} id - Table column whose visibility is toggled.
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
   * @since unreleased
   *
   * @param {InterventionTableColumn} id - Table column whose current visibility is inspected.
   *
   * @returns {boolean}
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
   * @since unreleased
   *
   * @param {InterventionTableColumn} id - Table column whose localized label is requested.
   *
   * @returns {string}
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
      case 'responsible':
        return $localize`:@@intervention.list.columnResponsible:Responsible`;
      case 'participants':
        return $localize`:@@intervention.list.columnParticipants:Participants`;
      case 'start':
        return $localize`:@@intervention.list.columnStart:Start`;
      case 'updated':
        return $localize`:@@intervention.list.columnUpdated:Updated`;
      default:
        return $localize`:@@intervention.list.columnDue:Due`;
    }
  }

  /**
   * Method goToPage
   * @method goToPage
   *
   * @description
   * Moves the List page window, clamped to the available range.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} target - One-based page requested by the list pager.
   *
   * @returns {void}
   */
  protected goToPage(target: number): void {
    const next = Math.min(Math.max(1, target), this.pageCount());
    this.page.set(next);
    this.navigateQuery({ p: next > 1 ? String(next) : null });
  }

  /**
   * Method setPageSize
   * @method setPageSize
   *
   * @description
   * Changes how many rows a page holds and returns to the first one.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} size - Maximum items requested for each list page.
   *
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.navigateQuery({ p: null });
    this.persistListPreferences();
  }

  /**
   * Method restoreHiddenColumns
   * @method restoreHiddenColumns
   *
   * @description
   * Narrows the cookie's raw hidden-column ids to the columns this build
   * offers. An operator who has never touched the Display popover has no
   * cookie at all, so this falls back to {@link INTERVENTION_TABLE_DEFAULT_HIDDEN_COLUMNS}
   * rather than showing every optional column.
   *
   * @access private
   * @since unreleased
   *
   * @returns {ReadonlySet<InterventionTableColumn>}
   */
  private restoreHiddenColumns(): ReadonlySet<InterventionTableColumn> {
    const stored: ReadonlySet<string> = this.preferences.readHiddenColumns();

    if (stored.size === 0)
      return new Set<InterventionTableColumn>(INTERVENTION_TABLE_DEFAULT_HIDDEN_COLUMNS);

    return new Set<InterventionTableColumn>(
      INTERVENTION_TABLE_COLUMNS.filter((column) => stored.has(column)),
    );
  }

  /**
   * Method restorePageSize
   * @method restorePageSize
   *
   * @description
   * The remembered rows-per-page when it is one of the sizes this build offers, or the default
   * otherwise.
   *
   * @access private
   * @since unreleased
   *
   * @returns {number}
   */
  private restorePageSize(): number {
    const stored: number | null = this.preferences.readPageSize();

    return stored !== null && PAGE_SIZES.includes(stored) ? stored : PAGE_SIZES[0];
  }

  /**
   * Method persistListPreferences
   * @method persistListPreferences
   *
   * @description
   * Writes the List tab's current shape — sort, hidden columns, page size — to the preferences
   * cookie in one pass.
   *
   * @access private
   * @since unreleased
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
   * Opens the creation sheet blank — drops any prefill a previous "Duplicate" left behind.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected openCreate(): void {
    if (!this.canCreate()) return;
    this.createTemplateId.set(null);
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
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Intervention whose data seeds the duplicate draft.
   *
   * @returns {void}
   */
  protected requestDuplicate(intervention: InterventionOutput): void {
    this.createTemplateId.set(null);
    this.duplicatePrefill.set(buildInterventionDuplicatePrefill(intervention));
    this.createSheetVisible.set(true);
  }

  /**
   * Method onCreateSheetVisibleChange
   * @method onCreateSheetVisibleChange
   *
   * @description
   * Relays the sheet's open/closed state and, on close, drops any duplicate prefill.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} visible - Whether the intervention creation sheet is open.
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
   * Hands the form's values to the store. The sheet closes and the page navigates once the store
   * reports the new record.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionCreateFormValues} values - Validated creation-form values submitted by the
   *   sheet.
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
   * Hands the chosen template, plus whichever overrides the sheet drafted, to the store.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionTemplateInstantiateRequest} request - Template and draft values used to
   *   create an intervention.
   *
   * @returns {void}
   */
  protected instantiateFromTemplate(request: InterventionTemplateInstantiateRequest): void {
    this.store.instantiateFromTemplate(request);
  }

  /**
   * Method openTemplateCreate
   * @method openTemplateCreate
   *
   * @description
   * Opens the template mode without creating until the operator confirms the form.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} templateId - Template selected to seed the creation sheet.
   *
   * @returns {void}
   */
  protected openTemplateCreate(templateId: string): void {
    if (!this.canCreate()) return;
    this.duplicatePrefill.set(null);
    this.createTemplateId.set(templateId);
    this.createSheetVisible.set(true);
  }

  /**
   * Method applyTransition
   * @method applyTransition
   *
   * @description
   * Moves an intervention to the status a List row's menu or a Board card's move requested. The
   * store owns the optimistic patch, the `If-Match` revision and the rollback.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionTransitionRequest} request - Intervention identity and target state
   *   requested by the user.
   *
   * @returns {void}
   */
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

  /**
   * Method copyReference
   * @method copyReference
   *
   * @description
   * Puts an intervention's `FG-…` reference on the clipboard.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Intervention whose reference is copied.
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
   * Records the List table's next row selection.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ReadonlySet<string>} ids - Selected intervention identities emitted by the collection.
   *
   * @returns {void}
   */
  protected onSelectionChanged(ids: ReadonlySet<string>): void {
    this.selectedIds.set(ids);
  }

  /**
   * Method onSelectionActionRequested
   * @method onSelectionActionRequested
   *
   * @description
   * Routes a shared bar command through the existing permission-checked bulk handlers.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} id - Command id emitted after any mobile drawer closes.
   *
   * @returns {void}
   */
  protected onSelectionActionRequested(id: string): void {
    if (this.activeView() !== 'list' || this.selectedIds().size === 0 || this.batchPending())
      return;
    if (id === 'assign') {
      if (this.canAssign()) this.requestBulkAssign();
      return;
    }
    if (id === 'delete') {
      if (this.canDelete()) this.requestBulkDelete();
      return;
    }
    if (!this.canTransition()) return;
    const target = this.bulkTransitionTargets().find((status) => id === `transition:${status}`);
    if (target) this.confirmBulkTransition(target);
  }

  /**
   * Method requestDelete
   * @method requestDelete
   *
   * @description
   * Opens the confirm dialog for a single row's Delete entry.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Intervention selected for deletion confirmation.
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
   * Opens the confirm dialog for the selection's deletable subset. A no-op when nothing selected
   * can actually be deleted.
   *
   * @access protected
   * @since unreleased
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
   * Sends the pending target(s) to the store.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
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

  /**
   * Method onDeleteDialogStateChanged
   * @method onDeleteDialogStateChanged
   *
   * @description
   * Clears both pending-delete signals on any dismissal — Cancel, the backdrop or Escape.
   *
   * @access protected
   * @since unreleased
   *
   * @param {BrnDialogState} state - Delete-dialog lifecycle state emitted by the overlay.
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
   * Ids of the current selection that may actually move to `target`.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionStatus} target - Target status used to filter eligible selected
   *   interventions.
   *
   * @returns {ReadonlyArray<string>}
   */
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

  /**
   * Method confirmBulkTransition
   * @method confirmBulkTransition
   *
   * @description
   * Starts transitions for the eligible selection and retains failed rows for targeted retries.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionStatus} target - The requested destination status.
   *
   * @returns {boolean}
   */
  protected confirmBulkTransition(target: InterventionStatus): boolean {
    if (this.batchPending()) return false;
    const ids: ReadonlyArray<string> = this.transitionableSelectedIds(target);
    if (ids.length === 0) return false;

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
    return true;
  }

  /**
   * Method retryFailedBatch
   * @method retryFailedBatch
   *
   * @description
   * Repeats the last intention only for failed rows still eligible in the refreshed collection.
   * Deletion keeps its confirmation.
   *
   * @access protected
   * @since 1.0.0
   *
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
   * @method requestAssign
   *
   * @description
   * Opens an individual assignment and resolves its existing responsible label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Selected row.
   *
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
   * @method requestBulkAssign
   *
   * @description
   * Opens assignment for the selected eligible resources.
   *
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
   * @method submitAssign
   *
   * @description
   * Sends assignment writes while retaining the dialog draft; retries exclude confirmed successes.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionAssignSubmittedEvent} event - Selected responsible.
   *
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
   * @method dismissAssign
   *
   * @description
   * Closes only after requests have settled, preserving pending writes.
   *
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

  /**
   * Method openRecurrenceCreate
   * @method openRecurrenceCreate
   *
   * @description
   * Opens the recurrence sheet on an empty draft and clears any previous wait.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openRecurrenceCreate(): void {
    this.awaitingRecurrenceWrite.set(null);
    this.recurrenceTarget.set('create');
  }

  /**
   * Method editRecurrence
   * @method editRecurrence
   *
   * @description
   * Opens a recurrence draft and clears the previous target's wait.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionRecurrenceOutput} recurrence - Recurrence to edit.
   *
   * @returns {void}
   */
  protected editRecurrence(recurrence: InterventionRecurrenceOutput): void {
    this.awaitingRecurrenceWrite.set(null);
    this.recurrenceTarget.set(recurrence);
  }

  /**
   * Method closeRecurrenceSheet
   * @method closeRecurrenceSheet
   *
   * @description
   * Closes the sheet after its dirty-close confirmation and discards its pending result
   * correlation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected closeRecurrenceSheet(): void {
    this.awaitingRecurrenceWrite.set(null);
    this.recurrenceTarget.set(null);
  }

  /**
   * Method submitRecurrence
   * @method submitRecurrence
   *
   * @description
   * Submits one create or update for the current target and waits for its matching result.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionRecurrenceFormValues} values - Validated recurrence draft and optional
   *   existing id.
   *
   * @returns {void}
   */
  protected submitRecurrence(values: InterventionRecurrenceFormValues): void {
    if (this.recurrencePending()) return;
    this.awaitingRecurrenceWrite.set(
      values.recurrenceId === null ? 'create' : { recurrenceId: values.recurrenceId },
    );
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

  /**
   * Method requestRecurrenceDelete
   * @method requestRecurrenceDelete
   *
   * @description
   * Opens confirmation for one recurrence and clears the previous deletion wait.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {InterventionRecurrenceOutput} recurrence - Recurrence to remove.
   *
   * @returns {void}
   */
  protected requestRecurrenceDelete(recurrence: InterventionRecurrenceOutput): void {
    this.awaitingRecurrenceRemove.set(null);
    this.pendingRecurrenceDelete.set(recurrence);
  }

  /**
   * Method confirmRecurrenceDelete
   * @method confirmRecurrenceDelete
   *
   * @description
   * Submits deletion of the current confirmation target and closes only on its success.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected confirmRecurrenceDelete(): void {
    const recurrence: InterventionRecurrenceOutput | null = this.pendingRecurrenceDelete();
    if (recurrence === null || this.recurrenceRemovePending()) return;

    this.awaitingRecurrenceRemove.set(recurrence.id);
    this.recurrenceStore.remove(recurrence.id);
  }

  /**
   * Method dismissRecurrenceDelete
   * @method dismissRecurrenceDelete
   *
   * @description
   * Closes deletion confirmation and clears its pending result correlation.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected dismissRecurrenceDelete(): void {
    this.awaitingRecurrenceRemove.set(null);
    this.pendingRecurrenceDelete.set(null);
  }

  /**
   * Method toggleRecurrenceActive
   * @method toggleRecurrenceActive
   *
   * @description
   * Pauses or resumes a recurrence from the table's toggle.
   *
   * @access protected
   * @since unreleased
   *
   * @param {{ readonly recurrenceId: string; readonly isActive: boolean }} event - Recurrence
   *   identity and requested enabled state.
   *
   * @returns {void}
   */
  protected toggleRecurrenceActive(event: {
    readonly recurrenceId: string;
    readonly isActive: boolean;
  }): void {
    this.recurrenceStore.update({
      recurrenceId: event.recurrenceId,
      input: { isActive: event.isActive },
    });
  }

  /**
   * Method retryRecurrences
   * @method retryRecurrences
   *
   * @description
   * Re-runs the Recurrences tab's fetch after the table's own load failure.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected retryRecurrences(): void {
    this.recurrenceStore.load({
      organizationIri: `/api/organizations/${this.organizationId()}`,
    });
  }

  /**
   * Method reload
   * @method reload
   *
   * @description
   * Re-runs the List tab's current query after a failure.
   *
   * @access protected
   * @since unreleased
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
   * Downloads the current question as CSV, serialized server-side
   * (`InterventionService.exportCsv`).
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
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

  /**
   * Method applyFilter
   * @method applyFilter
   *
   * @description
   * Replaces one narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Partial<InterventionListFilters>} patch - Filter values to merge into the current
   *   query.
   *
   * @returns {void}
   */
  protected applyFilter(patch: Partial<InterventionListFilters>): void {
    this.navigateQuery(serializeInterventionListFilters({ ...this.filters(), ...patch }));
  }

  /**
   * Method toggleMine
   * @method toggleMine
   *
   * @description
   * Flips the `?mine=1` narrowing. It stays a toolbar toggle rather than
   * becoming a ninth chip: the filter bar is collapsed by default, so a chip
   * would put the collection's most-used narrowing three clicks away.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected toggleMine(): void {
    this.applyFilter({ mine: !this.filters().mine });
  }

  /**
   * Method filterFieldOption
   * @method filterFieldOption
   *
   * @description
   * The catalog entry for one field.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionFilterFieldKey} key - Filter field whose option configuration is requested.
   *
   * @returns {InterventionFilterFieldOption}
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
   * @method onFieldPicked
   *
   * @description
   * Reacts to the filter bar's `fieldPicked` output.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} key - Filter field selected from the add-filter menu.
   *
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as InterventionFilterFieldKey);
  }

  /**
   * Method onFieldRemoved
   * @method onFieldRemoved
   *
   * @description
   * Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing, and
   * forgets the operator pinned on it so re-adding the field opens on its declared default rather
   * than on last visit's choice.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} key - The removed field's key.
   *
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
   * @method onFilterOperatorChanged
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
   * @param {CollectionFilterOperatorChangedEvent} event - The chip's key and its newly picked
   *   operator.
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
   * Method isEnumFilterKey
   * @method isEnumFilterKey
   *
   * @description
   * - Narrows a filter bar field key to {@link InterventionEnumFilterKey}.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} key - Filter key to test for enumerated value handling.
   *
   * @returns {boolean}
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
   * @method enumFieldOperator
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
   * @method onEnumFilterOperatorPicked
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
    let carried: unknown = values[0] ?? null;
    if (operator === 'isAnyOf') carried = values;
    else if (values[1]) carried = null;

    this.applyFilter({ [key]: carried } as Partial<InterventionListFilters>);
  }

  /**
   * Method toEnumValues
   * @method toEnumValues
   *
   * @description
   * Normalizes one of the six `equals`/`isAnyOf` fields' current value to a readonly array.
   *
   * @access private
   * @since unreleased
   *
   * @param {T | readonly T[] | null} value - Scalar or multiple selection to normalize into enum
   *   values.
   *
   * @returns {T[]}
   */
  private toEnumValues<T>(value: T | readonly T[] | null): T[] {
    if (value === null) return [];
    return Array.isArray(value) ? [...(value as readonly T[])] : [value as T];
  }

  /**
   * Method toScalarValue
   * @method toScalarValue
   *
   * @description
   * - The `equals`-mode counterpart of {@link toEnumValues}.
   *
   * @access private
   * @since unreleased
   *
   * @param {T | readonly T[] | null} value - Scalar or multiple selection from which one value is
   *   retained.
   *
   * @returns {T | null}
   */
  private toScalarValue<T>(value: T | readonly T[] | null): T | null {
    return Array.isArray(value) ? null : (value as T | null);
  }

  /**
   * Method statusValues
   * @method statusValues
   *
   * @description
   * The "Status" chip's currently checked values, for its multi select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {InterventionStatus[]}
   */
  protected statusValues(): InterventionStatus[] {
    return this.toEnumValues(this.filters().status);
  }

  /**
   * Method statusScalar
   * @method statusScalar
   *
   * @description
   * The "Status" chip's own scalar value, for its single select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {InterventionStatus | null}
   */
  protected statusScalar(): InterventionStatus | null {
    return this.toScalarValue(this.filters().status);
  }

  /**
   * Method typeValues
   * @method typeValues
   *
   * @description
   * The "Type" chip's currently checked values, for its multi select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {InterventionType[]}
   */
  protected typeValues(): InterventionType[] {
    return this.toEnumValues(this.filters().type);
  }

  /**
   * Method typeScalar
   * @method typeScalar
   *
   * @description
   * The "Type" chip's own scalar value, for its single select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {InterventionType | null}
   */
  protected typeScalar(): InterventionType | null {
    return this.toScalarValue(this.filters().type);
  }

  /**
   * Method priorityValues
   * @method priorityValues
   *
   * @description
   * The "Priority" chip's currently checked values, for its multi select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {InterventionPriority[]}
   */
  protected priorityValues(): InterventionPriority[] {
    return this.toEnumValues(this.filters().priority);
  }

  /**
   * Method priorityScalar
   * @method priorityScalar
   *
   * @description
   * The "Priority" chip's own scalar value, for its single select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {InterventionPriority | null}
   */
  protected priorityScalar(): InterventionPriority | null {
    return this.toScalarValue(this.filters().priority);
  }

  /**
   * Method siteValues
   * @method siteValues
   *
   * @description
   * The "Site" chip's currently checked values, for its multi select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {string[]}
   */
  protected siteValues(): string[] {
    return this.toEnumValues(this.filters().site);
  }

  /**
   * Method siteScalar
   * @method siteScalar
   *
   * @description
   * The "Site" chip's own scalar value, for its single select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {string | null}
   */
  protected siteScalar(): string | null {
    return this.toScalarValue(this.filters().site);
  }

  /**
   * Method responsibleValues
   * @method responsibleValues
   *
   * @description
   * The "Responsible" chip's currently checked values, for its multi select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {string[]}
   */
  protected responsibleValues(): string[] {
    return this.toEnumValues(this.filters().responsible);
  }

  /**
   * Method responsibleScalar
   * @method responsibleScalar
   *
   * @description
   * The "Responsible" chip's own scalar value, for its single select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {string | null}
   */
  protected responsibleScalar(): string | null {
    return this.toScalarValue(this.filters().responsible);
  }

  /**
   * Method labelValues
   * @method labelValues
   *
   * @description
   * The "Label" chip's currently checked values, for its multi select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {string[]}
   */
  protected labelValues(): string[] {
    return this.toEnumValues(this.filters().label);
  }

  /**
   * Method labelScalar
   * @method labelScalar
   *
   * @description
   * The "Label" chip's own scalar value, for its single select.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {string | null}
   */
  protected labelScalar(): string | null {
    return this.toScalarValue(this.filters().label);
  }

  /**
   * Method applyEnumSelection
   * @method applyEnumSelection
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
   *
   * @template T
   *
   * @param {InterventionEnumFilterKey} key - The field the selection belongs to.
   * @param {readonly T[] | null | undefined} values - Its next selection.
   *
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
   * Method applyStatusFilter
   * @method applyStatusFilter
   *
   * @description
   * - Applies the "Status" chip's multi select selection. See {@link applyEnumSelection}.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly InterventionStatus[] | null | undefined} values - Selected intervention
   *   statuses; nullish values clear the filter.
   *
   * @returns {void}
   */
  protected applyStatusFilter(values: readonly InterventionStatus[] | null | undefined): void {
    this.applyEnumSelection('status', values);
  }

  /**
   * Method applyTypeFilter
   * @method applyTypeFilter
   *
   * @description
   * - Applies the "Type" chip's multi select selection. See {@link applyEnumSelection}.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly InterventionType[] | null | undefined} values - Selected intervention types;
   *   nullish values clear the filter.
   *
   * @returns {void}
   */
  protected applyTypeFilter(values: readonly InterventionType[] | null | undefined): void {
    this.applyEnumSelection('type', values);
  }

  /**
   * Method applyPriorityFilter
   * @method applyPriorityFilter
   *
   * @description
   * - Applies the "Priority" chip's multi select selection. See {@link applyEnumSelection}.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly InterventionPriority[] | null | undefined} values - Selected priorities;
   *   nullish values clear the filter.
   *
   * @returns {void}
   */
  protected applyPriorityFilter(values: readonly InterventionPriority[] | null | undefined): void {
    this.applyEnumSelection('priority', values);
  }

  /**
   * Method applySiteFilter
   * @method applySiteFilter
   *
   * @description
   * - Applies the "Site" chip's multi select selection. See {@link applyEnumSelection}.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly string[] | null | undefined} values - Selected site identities; nullish values
   *   clear the filter.
   *
   * @returns {void}
   */
  protected applySiteFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('site', values);
  }

  /**
   * Method applyResponsibleFilter
   * @method applyResponsibleFilter
   *
   * @description
   * - Applies the "Responsible" chip's multi select selection. See {@link applyEnumSelection}.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly string[] | null | undefined} values - Selected responsible-member identities;
   *   nullish values clear the filter.
   *
   * @returns {void}
   */
  protected applyResponsibleFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('responsible', values);
  }

  /**
   * Method applyLabelFilter
   * @method applyLabelFilter
   *
   * @description
   * - Applies the "Label" chip's multi select selection. See {@link applyEnumSelection}.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly string[] | null | undefined} values - Selected label identities; nullish
   *   values clear the filter.
   *
   * @returns {void}
   */
  protected applyLabelFilter(values: readonly string[] | null | undefined): void {
    this.applyEnumSelection('label', values);
  }

  /**
   * Method onDueRangeOperatorPicked
   * @method onDueRangeOperatorPicked
   *
   * @description
   * Switches the "Deadline" chip's value control to the picked operator's own shape and drops any
   * already-applied narrowing.
   *
   * @access private
   * @since unreleased
   *
   * @param {CollectionFilterOperator} operator - Date comparison operator selected for the due-date
   *   filter.
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
   * @method pickDueAfter
   *
   * @description
   * Applies the "Deadline" chip's `greaterThan` narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Date | null | undefined} date - Lower due-date bound; nullish values clear the bound.
   *
   * @returns {void}
   */
  protected pickDueAfter(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ dueRange: { operator: 'greaterThan', after: date } });
  }

  /**
   * Method pickDueBefore
   * @method pickDueBefore
   *
   * @description
   * Applies the "Deadline" chip's `lessThan` narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Date | null | undefined} date - Upper due-date bound; nullish values clear the bound.
   *
   * @returns {void}
   */
  protected pickDueBefore(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ dueRange: { operator: 'lessThan', before: date } });
  }

  /**
   * Method pickDueBetween
   * @method pickDueBetween
   *
   * @description
   * Applies the "Deadline" chip's `between` narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly [Date, Date] | null | undefined} range - Inclusive due-date bounds; nullish
   *   values clear the range.
   *
   * @returns {void}
   */
  protected pickDueBetween(range: readonly [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ dueRange: { operator: 'between', after, before } });
  }

  /**
   * Method onPlannedStartRangeOperatorPicked
   * @method onPlannedStartRangeOperatorPicked
   *
   * @description
   * - Switches the "Planned start" chip's value control and drops any already-applied narrowing. See
   *   {@link onDueRangeOperatorPicked}.
   *
   * @access private
   * @since unreleased
   *
   * @param {CollectionFilterOperator} operator - Date comparison operator selected for the
   *   planned-start filter.
   *
   * @returns {void}
   */
  private onPlannedStartRangeOperatorPicked(operator: CollectionFilterOperator): void {
    if (operator !== 'greaterThan' && operator !== 'lessThan' && operator !== 'between') return;

    this.plannedStartRangeOperator.set(operator);
    if (this.filters().plannedStartRange !== null) this.applyFilter({ plannedStartRange: null });
  }

  /**
   * Method pickPlannedStartAfter
   * @method pickPlannedStartAfter
   *
   * @description
   * Applies the "Planned start" chip's `greaterThan` narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Date | null | undefined} date - Lower planned-start bound; nullish values clear the
   *   bound.
   *
   * @returns {void}
   */
  protected pickPlannedStartAfter(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ plannedStartRange: { operator: 'greaterThan', after: date } });
  }

  /**
   * Method pickPlannedStartBefore
   * @method pickPlannedStartBefore
   *
   * @description
   * Applies the "Planned start" chip's `lessThan` narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Date | null | undefined} date - Upper planned-start bound; nullish values clear the
   *   bound.
   *
   * @returns {void}
   */
  protected pickPlannedStartBefore(date: Date | null | undefined): void {
    if (!date) return;
    this.applyFilter({ plannedStartRange: { operator: 'lessThan', before: date } });
  }

  /**
   * Method pickPlannedStartBetween
   * @method pickPlannedStartBetween
   *
   * @description
   * Applies the "Planned start" chip's `between` narrowing.
   *
   * @access protected
   * @since unreleased
   *
   * @param {readonly [Date, Date] | null | undefined} range - Inclusive planned-start bounds;
   *   nullish values clear the range.
   *
   * @returns {void}
   */
  protected pickPlannedStartBetween(range: readonly [Date, Date] | null | undefined): void {
    if (!range) return;
    const [after, before] = range;
    this.applyFilter({ plannedStartRange: { operator: 'between', after, before } });
  }

  /**
   * Method toggleFiltersVisible
   * @method toggleFiltersVisible
   *
   * @description
   * Reacts to `app-collection-filter-toggle`'s `visibleChange`.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} visible - Whether the filter controls should be visible.
   *
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method fieldPopoverState
   * @method fieldPopoverState
   *
   * @description
   * Whether a field's value control should currently render open.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionFilterFieldKey} key - Filter field whose popover state is requested.
   *
   * @returns {'open' | 'closed'}
   */
  protected fieldPopoverState(key: InterventionFilterFieldKey): 'open' | 'closed' {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @method onFieldPopoverStateChanged
   *
   * @description
   * - Keeps {@link openFilterKey} in sync with a field's own value control.
   *
   * @access protected
   * @since unreleased
   *
   * @param {InterventionFilterFieldKey} key - Filter field whose popover changed state.
   * @param {'open' | 'closed'} state - Open or closed state emitted by the field popover.
   *
   * @returns {void}
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

  /**
   * Method clearFilters
   * @method clearFilters
   *
   * @description
   * Drops every narrowing at once — mine and the legacy due window included — along with every
   * pinned operator.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected clearFilters(): void {
    this.enumFilterOperatorOverrides.set({});
    this.navigateQuery(serializeInterventionListFilters(NO_FILTERS));
  }

  /**
   * Method filterClearPatchOf
   * @method filterClearPatchOf
   *
   * @description
   * The `applyFilter` patch that clears one field back to `null`.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionFilterFieldKey} key - Filter field whose values should be cleared.
   *
   * @returns {Partial<InterventionListFilters>}
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
      case 'dueWindow':
        return { dueWindow: null };
    }
  }

  /**
   * Method chipAccessibleName
   * @method chipAccessibleName
   *
   * @description
   * The chip's screen-reader name. A field never renders a chip on a tab that does not honour it
   * (see {@link offeredFilterFields}), so this name never needs to explain an inert state — it is
   * always the field's own label.
   *
   * @access protected
   * @since 11.0.0
   *
   * @param {InterventionFilterFieldKey} key - The chip's field.
   *
   * @returns {string} The localized accessible name.
   */
  protected chipAccessibleName(key: InterventionFilterFieldKey): string {
    return this.changeFilterLabel(this.filterFieldOption(key).fieldLabel);
  }

  /**
   * Method navigateQuery
   * @method navigateQuery
   *
   * @description
   * Merges query params into the URL without touching the path.
   *
   * @access private
   * @since unreleased
   *
   * @param {Record<string, string | null>} queryParams - Query-parameter updates merged into the
   *   current route.
   *
   * @returns {void}
   */
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

  /**
   * Method onSearchQueryChanged
   * @method onSearchQueryChanged
   *
   * @description
   * Records a keystroke into the draft term the debounce watches.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} term - Search text retained in the filter draft.
   *
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /**
   * Method resolveExportErrorDetail
   * @method resolveExportErrorDetail
   *
   * @description
   * Resolves the RFC 7807 `detail` a `422` export response carries — the
   * response is fetched as a blob, so a JSON error body arrives as one too
   * and must be read back through `Blob.text()` before it can be parsed.
   *
   * @access private
   * @since unreleased
   *
   * @param {HttpErrorResponse} error - Failed export response whose user-facing detail is resolved.
   *
   * @returns {Promise<string | null>}
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

  /**
   * Method exportFilename
   * @method exportFilename
   *
   * @description
   * The export's filename: the organization, stamped with today's date (`yyyyMMdd`).
   *
   * @access private
   * @since unreleased
   *
   * @returns {string}
   */
  private exportFilename(): string {
    const now: Date = new Date();
    const yyyy: string = String(now.getFullYear());
    const mm: string = String(now.getMonth() + 1).padStart(2, '0');
    const dd: string = String(now.getDate()).padStart(2, '0');

    return `interventions-${this.organizationId()}-${yyyy}${mm}${dd}.csv`;
  }

  /**
   * Method toItemViewModel
   * @method toItemViewModel
   *
   * @description
   * Projects one intervention into the List row view model.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Intervention projected into a list-row view model.
   *
   * @returns {InterventionListItemViewModel}
   */
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
      dueRelativeLabel: intervention.dueAt
        ? formatRelativeDays(intervention.dueAt, new Date().toISOString(), this.locale)
        : null,
      siteName: intervention.site ? (this.siteDisplayMap().get(intervention.site) ?? null) : null,
      responsible: intervention.responsible
        ? (this.memberDisplayMap().get(intervention.responsible) ?? null)
        : null,
      people: memberIris.map((iri: string): MemberAvatar => this.toPerson(iri)),
    };
  }

  /**
   * Method toBoardCardViewModel
   * @method toBoardCardViewModel
   *
   * @description
   * Projects one intervention into the Board card view model.
   *
   * @access private
   * @since unreleased
   *
   * @param {InterventionOutput} intervention - Intervention projected into a board-card view model.
   *
   * @returns {InterventionBoardCardViewModel}
   */
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

  /**
   * Method toPerson
   * @method toPerson
   *
   * @description
   * Resolves a member IRI to an avatar, naming them rather than showing a hole.
   *
   * @access private
   * @since unreleased
   *
   * @param {string} memberIri - Member resource identifier to resolve for display.
   *
   * @returns {MemberAvatar}
   */
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
   * @method onCalendarMonthChanged
   *
   * @description
   * Records the Calendar tab's displayed anchor — the load effect reads it back and gates on it
   * being non-`null`.
   *
   * @access protected
   * @since 11.0.0
   *
   * @param {Date} month - The anchor `InterventionCalendar` reports.
   *
   * @returns {void}
   */
  protected onCalendarMonthChanged(month: Date): void {
    this.calendarMonth.set(month);
  }

  /**
   * Method calendarReload
   * @method calendarReload
   *
   * @description
   * Re-fetches the Calendar tab's current window after a failure.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void}
   */
  protected calendarReload(): void {
    const month: Date | null = this.calendarMonth();
    if (month === null) return;

    this.calendarStore.load({
      organizationId: this.organizationId(),
      window: this.calendarWindowOf(month),
      filters: projectInterventionCalendarCriteria(this.filters(), new Date()),
    });
  }

  /**
   * Method calendarWindowOf
   * @method calendarWindowOf
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
   * Method toggleSelectionMode
   * @method toggleSelectionMode
   *
   * @description
   * Enters or leaves the compact layout's selection mode, clearing the selection on the way out.
   *
   * @access protected
   * @since 15.0.0
   *
   * @returns {void}
   */
  protected toggleSelectionMode(): void {
    const next: boolean = !this.selectionMode();
    this.selectionMode.set(next);

    if (!next) this.selectedIds.set(new Set<string>());
  }

  //#endregion
}
