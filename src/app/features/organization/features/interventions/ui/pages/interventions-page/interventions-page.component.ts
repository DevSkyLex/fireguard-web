import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCheck,
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideCircleAlert,
  lucideClipboardList,
  lucideListFilter,
  lucidePlus,
  lucideSearch,
  lucideSettings2,
  lucideTrash2,
  lucideUserCog,
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { isCallPending } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import {
  resolveInterventionTag,
  type InterventionAssignRequest,
  type InterventionAssignSubmittedEvent,
  type InterventionDueWindow,
  type InterventionListFilters,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionPriority,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionType,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import {
  InterventionListPreferencesService,
  InterventionSyncCoordinatorService,
} from '@features/organization/features/interventions/services';
import {
  InterventionStore,
  type InterventionStoreType,
} from '@features/organization/features/interventions/state';
import { isInterventionDeletable } from '@features/organization/features/interventions/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationMemberAccessStore,
  type OrganizationMemberAccessStoreType,
} from '@features/organization/state';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmLabel } from '@shared/ui/label';
import { HlmPopoverImports } from '@shared/ui/popover';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmToggle } from '@shared/ui/toggle';
import {
  InterventionPlanningOptionsStore,
  type InterventionPlanningOptionsStoreType,
} from '../../../state/intervention-planning-options';
import { InterventionSyncStatus } from '../../components/intervention-sync-status';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionAssignDialog } from '../../dialogs/intervention-assign-dialog';
import type { InterventionCreateFormValues } from '../../forms/intervention-create-form';
import { InterventionCreateSheet } from '../../sheets/intervention-create-sheet';
import {
  INTERVENTION_TABLE_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import type { InterventionListItemViewModel } from './models';
import {
  INTERVENTION_DUE_WINDOW_OPTIONS,
  INTERVENTION_PRIORITY_FILTER_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from './options';
import {
  buildInterventionListOptions,
  countActiveFilters,
  parseInterventionListFilters,
  serializeInterventionListFilters,
} from './utils';

/** How close a deadline must be to count as "due soon". */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the table — the server default first, its clamp last. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

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
};

/**
 * Component InterventionsPage
 * @class InterventionsPage
 *
 * @description
 * Route entry page for the organization's interventions, laid out like
 * spartan's dashboard table: a filter bar and a column menu above, the grid in
 * its bordered shell, and a footer carrying the row count, the page size and
 * the pager.
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
 * @version 6.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions-page',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmLabel,
    HlmToggle,
    InterventionAssignDialog,
    InterventionCreateSheet,
    InterventionSyncStatus,
    InterventionTable,
    InterventionTag,
    ...HlmAlertDialogImports,
    ...HlmDropdownMenuImports,
    ...HlmEmptyImports,
    ...HlmInputGroupImports,
    ...HlmPopoverImports,
    ...HlmSelectImports,
  ],
  providers: [
    InterventionPlanningOptionsStore,
    provideIcons({
      lucideCheck,
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronsLeft,
      lucideChevronsRight,
      lucideCircleAlert,
      lucideClipboardList,
      lucideListFilter,
      lucidePlus,
      lucideSearch,
      lucideSettings2,
      lucideTrash2,
      lucideUserCog,
      lucideX,
    }),
  ],
  templateUrl: './interventions-page.component.html',
  host: { class: 'block' },
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

  /** The named due-date window the URL carries. See {@link status}. */
  public readonly due: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /** The list dataset, provided by the pathless parent route. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Site and member choices for the filters and the creation form. */
  protected readonly planningOptions: InterventionPlanningOptionsStoreType =
    inject<InterventionPlanningOptionsStoreType>(InterventionPlanningOptionsStore);

  /** The sync coordinator behind the toolbar's sync chip. */
  protected readonly sync: InterventionSyncCoordinatorService = inject(
    InterventionSyncCoordinatorService,
  );

  /** The outbox, read only for the chip's pending indicator. */
  private readonly offline: InterventionOfflineService = inject(InterventionOfflineService);

  /** Whether the offline outbox has changes waiting to sync. */
  protected readonly hasUnsyncedChanges: Signal<boolean> = this.offline.hasUnsyncedChanges;

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

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds, restored from the preferences cookie. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(this.restorePageSize());

  /** Whether the creation sheet is open. */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

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

  /** Deadline windows offered in the filter bar. */
  protected readonly dueWindowOptions: SelectOption<InterventionDueWindow>[] =
    INTERVENTION_DUE_WINDOW_OPTIONS;

  /** Every hideable column, for the column menu. */
  protected readonly allColumns: ReadonlyArray<InterventionTableColumn> =
    INTERVENTION_TABLE_COLUMNS;

  /** The page sizes offered under the table. */
  protected readonly pageSizes: ReadonlyArray<number> = PAGE_SIZES;

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
   * entries, each further narrowed by {@link transitionableSelectedIds}.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly InterventionStatus[]>}
   */
  protected readonly bulkTransitionTargets: Signal<readonly InterventionStatus[]> = computed(
    (): readonly InterventionStatus[] => {
      const selected: ReadonlySet<string> = this.selectedIds();
      const targets: Set<InterventionStatus> = new Set<InterventionStatus>();

      for (const item of this.items()) {
        if (!selected.has(item.intervention.id)) continue;
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
   * Property activeFilterCount
   * @readonly
   *
   * @description
   * How many narrowings are set, which decides whether the "Clear filters"
   * button in the toolbar renders at all.
   *
   * @access protected
   * @since 4.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly activeFilterCount: Signal<number> = computed<number>(() =>
    countActiveFilters(this.filters()),
  );

  /**
   * Property subtitle
   * @readonly
   *
   * @description
   * The count line under the title, naming the overdue work rather than
   * leaving it to be found by scrolling. The total is the server's collection
   * count — pagination is server-side, so the loaded page's length would
   * undercount — while the overdue figure narrows to the rows on screen,
   * which are the ones the line points at.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly subtitle: Signal<string> = computed<string>(() => {
    const total: number = this.store.totalInterventions();
    const overdue: number = this.items().filter(
      (item: InterventionListItemViewModel): boolean => item.isOverdue,
    ).length;

    const counted: string =
      total === 1
        ? $localize`:@@intervention.list.countOne:1 intervention`
        : $localize`:@@intervention.list.countMany:${total}:count: interventions`;

    if (overdue === 0) return counted;

    return overdue === 1
      ? $localize`:@@intervention.list.countOverdueOne:${counted}:counted: · 1 overdue`
      : $localize`:@@intervention.list.countOverdueMany:${counted}:counted: · ${overdue}:overdue: overdue`;
  });

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

  /** Names a deadline window on a closed select trigger. */
  protected readonly dueWindowLabelOf: (value: InterventionDueWindow) => string = (
    value: InterventionDueWindow,
  ): string =>
    this.dueWindowOptions.find(
      (option: SelectOption<InterventionDueWindow>): boolean => option.value === value,
    )?.label ?? '';

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
      const requested: boolean = this.create() === '1';

      untracked((): void => {
        if (!requested) return;

        this.createSheetVisible.set(true);
        this.navigateQuery({ create: null });
      });
    });

    effect((): void => {
      const created: InterventionOutput | null = this.store.createdIntervention();

      untracked((): void => {
        if (!created) return;

        this.createSheetVisible.set(false);
        this.store.clearCreatedIntervention();
        void this.router.navigate([...this.detailRouteBase(), created.id]);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchInput
   * @method onSearchInput
   *
   * @description
   * Records a keystroke into the draft term the debounce watches.
   *
   * @access protected
   * @since 3.0.0
   *
   * @param {Event} event - The input event.
   *
   * @returns {void}
   */
  protected onSearchInput(event: Event): void {
    this.draftSearch.set((event.target as HTMLInputElement).value);
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
   * Opens the creation sheet.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openCreate(): void {
    this.createSheetVisible.set(true);
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

    this.pendingBulkDeleteIds.set(ids);
  }

  /**
   * Method confirmDelete
   * @method confirmDelete
   *
   * @description
   * Sends the pending target(s) to the store and closes the dialog. A bulk
   * selection resolves each id back to its cached revision and calls
   * `store.delete` once per intervention — the store's `mergeMap` runs them
   * concurrently, each reporting its own success or failure.
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

    this.pendingDelete.set(null);
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
   * row's own `allowedTransitions` must include it, and — mirroring
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
    const currentMemberIri: string | null = this.memberIri();

    return this.items()
      .filter((item: InterventionListItemViewModel): boolean => selected.has(item.intervention.id))
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
