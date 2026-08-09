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
  lucideX,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  CURRENT_MEMBER_SENTINEL,
  INTERVENTION_BUILTIN_VIEWS,
  MAX_CUSTOM_VIEWS,
} from '@features/organization/features/interventions/constants';
import {
  resolveInterventionTag,
  type InterventionDueWindow,
  type InterventionListFilters,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionPriority,
  type InterventionSortField,
  type InterventionStatus,
  type InterventionType,
  type InterventionView,
  type MemberAvatar,
  type MemberSelectOption,
  type SelectOption,
} from '@features/organization/features/interventions/models';
import { InterventionListPreferencesService } from '@features/organization/features/interventions/services/intervention-list-preferences';
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
import { InterventionPlanningOptionsStore } from '../../../state/intervention-planning-options';
import { InterventionTag } from '../../components/intervention-tag';
import { InterventionViewSaveDialog } from '../../dialogs/intervention-view-save-dialog';
import type { InterventionCreateFormValues } from '../../forms/intervention-create-form';
import { InterventionCreateSheet } from '../../sheets/intervention-create-sheet';
import {
  INTERVENTION_TABLE_COLUMNS,
  InterventionTable,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from '../../tables/intervention-table';
import { InterventionViewSwitcher } from './components/intervention-view-switcher';
import type { InterventionListItemViewModel } from './models';
import {
  INTERVENTION_DUE_WINDOW_OPTIONS,
  INTERVENTION_PRIORITY_FILTER_OPTIONS,
  INTERVENTION_STATUS_FILTER_OPTIONS,
  INTERVENTION_TYPE_FILTER_OPTIONS,
} from './options';
import { buildInterventionListOptions, countActiveFilters } from './utils';

/** How close a deadline must be to count as "due soon". */
const DUE_SOON_WINDOW_MS: number = 48 * 60 * 60 * 1000;

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the table — the server default first, its clamp last. */
const PAGE_SIZES: ReadonlyArray<number> = [30, 60, 100];

/** The ordering a freshly opened list applies. */
const DEFAULT_SORT: InterventionListSort = { field: 'dueAt', direction: 'asc' };

/** The narrowing a freshly opened list applies: none. */
const NO_FILTERS: InterventionListFilters = {
  status: null,
  type: null,
  priority: null,
  site: null,
  responsible: null,
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
 * @version 5.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-interventions',
  imports: [
    NgIcon,
    HlmBadge,
    HlmButton,
    HlmLabel,
    InterventionCreateSheet,
    InterventionTable,
    InterventionTag,
    InterventionViewSaveDialog,
    InterventionViewSwitcher,
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
      lucideX,
    }),
  ],
  templateUrl: './interventions.component.html',
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
  //#endregion

  //#region Properties
  /** The list dataset, provided by the pathless parent route. */
  protected readonly store: InterventionStoreType =
    inject<InterventionStoreType>(InterventionStore);

  /** Site and member choices for the filters and the creation form. */
  protected readonly planningOptions = inject(InterventionPlanningOptionsStore);

  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Cookie-backed memory of the operator's sort, active view and saved views. */
  private readonly preferences: InterventionListPreferencesService = inject(
    InterventionListPreferencesService,
  );

  /** The signed-in member's profile, for resolving the `@me` view sentinel. */
  private readonly memberAccess: OrganizationMemberAccessStoreType =
    inject<OrganizationMemberAccessStoreType>(OrganizationMemberAccessStore);

  private readonly router: Router = inject(Router);

  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The active narrowing. Questions asked now, so never persisted. */
  protected readonly filters: WritableSignal<InterventionListFilters> =
    signal<InterventionListFilters>(NO_FILTERS);

  /** The active ordering. */
  protected readonly sortOrder: WritableSignal<InterventionListSort> =
    signal<InterventionListSort>(DEFAULT_SORT);

  /** Which optional columns the operator has hidden. */
  protected readonly hiddenColumns: WritableSignal<ReadonlySet<InterventionTableColumn>> = signal<
    ReadonlySet<InterventionTableColumn>
  >(new Set<InterventionTableColumn>());

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0] as number);

  /** Whether the creation sheet is open. */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** Currently selected row ids, scoped to the loaded page — cleared on every load. */
  protected readonly selectedIds: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /** The operator's saved views, restored from the preferences cookie. */
  protected readonly customViews: WritableSignal<readonly InterventionView[]> = signal<
    readonly InterventionView[]
  >([]);

  /** The applied view's id, or null once the operator narrowed manually. */
  protected readonly activeViewId: WritableSignal<string | null> = signal<string | null>(null);

  /** Whether the save-view dialog is open. */
  protected readonly saveViewVisible: WritableSignal<boolean> = signal<boolean>(false);

  /** The intervention a row's menu asked to delete, pending confirmation. */
  protected readonly pendingDelete: WritableSignal<InterventionOutput | null> =
    signal<InterventionOutput | null>(null);

  /** The selected, deletable ids the toolbar asked to bulk-delete, pending confirmation. */
  protected readonly pendingBulkDeleteIds: WritableSignal<ReadonlyArray<string> | null> =
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
   * Property views
   * @readonly
   *
   * @description
   * Every offered view: the five built-ins, then the operator's saved ones.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {Signal<readonly InterventionView[]>}
   */
  protected readonly views: Signal<readonly InterventionView[]> = computed<
    readonly InterventionView[]
  >(() => [...INTERVENTION_BUILTIN_VIEWS, ...this.customViews()]);

  /**
   * Property currentMemberIri
   * @readonly
   *
   * @description
   * The signed-in member's IRI, or null before the profile resolves — what the
   * `@me` view sentinel substitutes to at query time.
   *
   * @access private
   * @since 6.0.0
   *
   * @type {Signal<string | null>}
   */
  private readonly currentMemberIri: Signal<string | null> = computed<string | null>(() => {
    const memberId: string | undefined = this.memberAccess.profile()?.id;

    return memberId === undefined
      ? null
      : `/api/organizations/${this.organizationId()}/members/${memberId}`;
  });

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
  protected readonly items: Signal<readonly InterventionListItemViewModel[]> = computed(() => {
    // The Overdue view means "late AND still actionable", but the server's
    // status filter is single-valued so it cannot exclude two terminal
    // statuses; they are dropped client-side, within the loaded page. The
    // follow-up multi-valued status filter will move this server-side.
    const loaded: readonly InterventionOutput[] =
      this.activeViewId() === 'overdue'
        ? this.store
            .interventionList()
            .filter(
              (intervention: InterventionOutput) =>
                intervention.status !== 'published' && intervention.status !== 'abandoned',
            )
        : this.store.interventionList();

    return loaded.map((intervention: InterventionOutput) => this.toItemViewModel(intervention));
  });

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
   * leaving it to be found by scrolling.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly subtitle: Signal<string> = computed<string>(() => {
    const total: number = this.items().length;
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

  //#endregion

  //#region Constructor
  public constructor() {
    this.customViews.set(this.preferences.readCustomViews());
    this.sortOrder.set(this.preferences.readSort());

    const rememberedViewId: string | null = this.preferences.readViewId();
    if (rememberedViewId !== null) {
      const remembered: InterventionView | undefined = this.views().find(
        (candidate: InterventionView): boolean => candidate.id === rememberedViewId,
      );
      if (remembered) {
        this.filters.set(remembered.filters);
        this.sortOrder.set(remembered.sort);
        this.activeViewId.set(rememberedViewId);
      }
    }

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
          // Reset synchronously with the query change so the load effect fires
          // once, already on the first page of the new result set.
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
      // Tracked on purpose: a view using `@me` must reload once the profile
      // resolves, since the sentinel substitutes to null until then.
      const memberIri: string | null = this.currentMemberIri();

      untracked((): void => {
        this.selectedIds.set(new Set<string>());
        const effective: InterventionListFilters =
          filters.responsible === CURRENT_MEMBER_SENTINEL
            ? { ...filters, responsible: memberIri }
            : filters;
        this.store.load({
          organizationId,
          options: {
            ...buildInterventionListOptions(effective, sort, search, new Date()),
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
    this.detachFromView();
    this.filters.update((current: InterventionListFilters) => ({ ...current, ...patch }));
  }

  /**
   * Method selectView
   *
   * @description
   * Applies a named view as a preset — its narrowing and ordering replace the
   * current ones, from the first page — and remembers the choice.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {string} viewId - The picked view's id.
   *
   * @returns {void}
   */
  protected selectView(viewId: string): void {
    const view: InterventionView | undefined = this.views().find(
      (candidate: InterventionView): boolean => candidate.id === viewId,
    );
    if (!view) return;

    this.page.set(1);
    this.filters.set(view.filters);
    this.sortOrder.set(view.sort);
    this.activeViewId.set(viewId);
    this.preferences.writeViewId(viewId);
  }

  /**
   * Method removeCustomView
   *
   * @description
   * Deletes one saved view. Removing the active one detaches without touching
   * the narrowing on screen — the operator loses the shortcut, not the query.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {string} viewId - The custom view's id.
   *
   * @returns {void}
   */
  protected removeCustomView(viewId: string): void {
    const next: readonly InterventionView[] = this.customViews().filter(
      (view: InterventionView): boolean => view.id !== viewId,
    );
    this.customViews.set(next);
    this.preferences.writeCustomViews(next);
    if (this.activeViewId() === viewId) this.detachFromView();
  }

  /**
   * Method saveCurrentView
   *
   * @description
   * Names the current narrowing and ordering as a saved view — capped at
   * {@link MAX_CUSTOM_VIEWS}, dropping the oldest when full — and makes it the
   * active one.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {string} label - The name the operator typed.
   *
   * @returns {void}
   */
  protected saveCurrentView(label: string): void {
    const view: InterventionView = {
      id: crypto.randomUUID(),
      label,
      builtin: false,
      filters: this.filters(),
      sort: this.sortOrder(),
      grouping: 'status',
      render: 'list',
    };
    const next: readonly InterventionView[] = [...this.customViews(), view].slice(
      -MAX_CUSTOM_VIEWS,
    );
    this.customViews.set(next);
    this.preferences.writeCustomViews(next);
    this.activeViewId.set(view.id);
    this.preferences.writeViewId(view.id);
  }

  /**
   * Method detachFromView
   *
   * @description
   * Drops the active-view highlight once the operator narrows manually: the
   * view is a preset, not a mode, and the cookie forgets it too.
   *
   * @access private
   * @since 6.0.0
   *
   * @returns {void}
   */
  private detachFromView(): void {
    if (this.activeViewId() === null) return;

    this.activeViewId.set(null);
    this.preferences.writeViewId('');
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
    this.detachFromView();
    this.filters.set(NO_FILTERS);
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
    this.detachFromView();
    this.sortOrder.update((current: InterventionListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.preferences.write(
      this.preferences.readShowAbandoned(),
      this.preferences.readCollapsedGroups(),
      this.sortOrder(),
    );
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
      return { label: $localize`:@@intervention.list.unknownMember:Member` };
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
