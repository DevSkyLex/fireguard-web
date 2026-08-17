import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleDot,
  lucidePackage,
  lucidePlus,
  lucideSearch,
  lucideTag,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  EquipmentListSort,
  EquipmentOutput,
  EquipmentSortField,
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import { EquipmentListPreferencesService } from '@features/organization/features/equipments/services';
import {
  EquipmentStore,
  type EquipmentStoreType,
} from '@features/organization/features/equipments/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSelectImports } from '@shared/ui/select';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';
import { EquipmentTable } from '../../tables/equipment-table';

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the table — the server default first. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** Every lifecycle status offered in the filter bar. */
const STATUS_VALUES: readonly EquipmentStatus[] = [
  'in_stock',
  'operational',
  'under_maintenance',
  'decommissioned',
];

/**
 * Component EquipmentsPage
 * @class EquipmentsPage
 *
 * @description
 * Route entry page for the organization's equipment: a search box and an
 * editable type/status filter chip row (`app-collection-filter-bar`,
 * `@shared/collection-filters`) above the grid, in its bordered shell, and a
 * footer carrying the row count, the page size and the pager — the same
 * shell `InterventionsPage` draws, whose filter bar this one now shares.
 *
 * It owns the query the table renders — search, filters, paging — and the
 * "New equipment" affordance; the record itself is where every property is
 * edited (`FEATURE.md` "The record is the edit surface"), so this page has
 * no row menu and no bulk actions to orchestrate.
 *
 * Its title lives in the shell breadcrumb; "New equipment" registers on the
 * shell header through `PageActionsService`.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipments-page',
  imports: [
    RouterLink,
    NgIcon,
    EmptyState,
    ErrorState,
    EquipmentStatusTag,
    EquipmentTable,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    HlmButton,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleDot,
      lucidePackage,
      lucidePlus,
      lucideSearch,
      lucideTag,
    }),
  ],
  templateUrl: './equipments-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose equipment is listed, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property q
   * @readonly
   * @description The search term the URL carries, so a filtered list survives a reload.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /** The list dataset, provided by this route. */
  protected readonly store: EquipmentStoreType = inject<EquipmentStoreType>(EquipmentStore);

  /** Organization permission checks gating the "New equipment" action. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Router used to round-trip the `?q=` query param. */
  private readonly router: Router = inject(Router);

  /** Current route, anchoring the relative query-param navigation. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The cookie-backed memory of how this list was left ordered. */
  private readonly preferences: EquipmentListPreferencesService =
    inject<EquipmentListPreferencesService>(EquipmentListPreferencesService);

  /**
   * Property sortOrder
   * @readonly
   * @description The active ordering, restored from the preferences cookie.
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<EquipmentListSort>}
   */
  protected readonly sortOrder: WritableSignal<EquipmentListSort> = signal<EquipmentListSort>(
    this.preferences.readSort(),
  );

  /** The active narrowing. Questions asked now, so never persisted. */
  protected readonly filters: WritableSignal<{
    readonly type: EquipmentType | null;
    readonly status: EquipmentStatus | null;
  }> = signal({ type: null, status: null });

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** Type choices offered in the filter bar. */
  protected readonly typeOptions: typeof EQUIPMENT_TYPE_OPTIONS = EQUIPMENT_TYPE_OPTIONS;

  /** Status choices offered in the filter bar. */
  protected readonly statusValues: readonly EquipmentStatus[] = STATUS_VALUES;

  /**
   * Property searchTerm
   * @readonly
   * @description The search as everything downstream reads it: trimmed, never `undefined`.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /**
   * Property hasSearchOrFilters
   * @readonly
   * @description Whether the current view is narrowed at all, deciding what the empty state offers.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasSearchOrFilters: Signal<boolean> = computed<boolean>(() => {
    const filters = this.filters();

    return this.searchTerm() !== '' || filters.type !== null || filters.status !== null;
  });

  /** The filter bar's field catalog: type, then status. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'type',
      fieldLabel: $localize`:@@equipment.list.filterType:Type`,
      icon: 'lucideTag',
      operators: ['equals'],
    },
    {
      key: 'status',
      fieldLabel: $localize`:@@equipment.list.filterStatus:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   * @description Which of {@link filterFields} currently carry a value — the bar's `activeKeys` input.
   * @access protected
   * @since 1.3.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => {
      const filters = this.filters();

      return [
        ...(filters.type !== null ? ['type'] : []),
        ...(filters.status !== null ? ['status'] : []),
      ];
    },
  );

  /** Which field's value selector currently renders forced open — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<'type' | 'status' | null> = signal<
    'type' | 'status' | null
  >(null);

  /**
   * Property filtersVisible
   * @readonly
   * @description Whether `app-collection-filter-bar` is currently mounted below the toolbar — presentation-only. Seeded by `initialCollectionFilterBarVisibility` (`@shared/collection-filters`), then purely driven by `app-collection-filter-toggle`.
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly filtersVisible: WritableSignal<boolean> = initialCollectionFilterBarVisibility(
    computed<boolean>(() => this.activeFilterKeys().length > 0),
  );

  /** The "Type" chip's value control, projected into the filter bar. */
  private readonly typeChipTemplate = viewChild<TemplateRef<unknown>>('typeChip');

  /** The "Status" chip's value control, projected into the filter bar. */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /**
   * Property chipTemplates
   * @readonly
   * @description Every filter field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 1.3.0
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({ type: this.typeChipTemplate(), status: this.statusChipTemplate() }));

  /** The rows the table currently renders. */
  protected readonly items: Signal<readonly EquipmentOutput[]> = computed<
    readonly EquipmentOutput[]
  >(() => this.store.equipmentList());

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalEquipment() / this.pageSize())),
  );

  /**
   * Property canCreate
   * @readonly
   * @description Whether the member may register new equipment.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canCreate: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /** Where a row's link, and the "New equipment" button, point. */
  protected readonly listRouteBase: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'equipments',
  ]);

  /** Names an equipment type on a closed select trigger. */
  protected readonly typeLabelOf: (value: EquipmentType) => string = (value) =>
    this.typeOptions.find((option) => option.value === value)?.label ?? value;

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New equipment" button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the search round-trip and the load effect, the same shape
   * `InterventionsPage` uses: a settled (debounced) search resets the page
   * synchronously with the query navigation so the load effect fires once,
   * already on the first page of the new result set. Also registers
   * {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

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
          this.navigateQuery(term === '' ? null : term);
        }
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const params: Record<string, string> = this.buildListParams();
      const sort: EquipmentListSort = this.sortOrder();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: { params, page, itemsPerPage: pageSize, sort },
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchQueryChanged
   * @description Records a keystroke into the draft term the debounce watches.
   * @access protected
   * @since 1.1.0
   * @param {string} term - The search box's current value.
   * @returns {void}
   */
  protected onSearchQueryChanged(term: string): void {
    this.draftSearch.set(term);
  }

  /**
   * Method clearSearch
   * @description Drops the search from the URL.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearSearch(): void {
    this.draftSearch.set('');
    this.page.set(1);
    this.navigateQuery(null);
  }

  /**
   * Method applyFilter
   * @description Replaces one narrowing, which reloads the list from the first page.
   * @access protected
   * @since 1.0.0
   * @param {Partial<{ type: EquipmentType | null; status: EquipmentStatus | null }>} patch - The field to change.
   * @returns {void}
   */
  protected applyFilter(
    patch: Partial<{
      readonly type: EquipmentType | null;
      readonly status: EquipmentStatus | null;
    }>,
  ): void {
    this.page.set(1);
    this.filters.update((current) => ({ ...current, ...patch }));
  }

  /**
   * Method clearFilters
   * @description Drops every narrowing at once, including the search term.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.filters.set({ type: null, status: null });
    this.clearSearch();
  }

  /**
   * Method onFieldPicked
   * @description Reacts to the filter bar's `fieldPicked` output by forcing the picked field's value control open.
   * @access protected
   * @since 1.3.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as 'type' | 'status');
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by clearing that field's narrowing.
   * @access protected
   * @since 1.3.0
   * @param {string} key - The field key a chip's remove button cleared.
   * @returns {void}
   */
  protected onFieldRemoved(key: string): void {
    this.applyFilter(key === 'type' ? { type: null } : { status: null });
  }

  /**
   * Method toggleFiltersVisible
   * @description Reacts to `app-collection-filter-toggle`'s `visibleChange` by setting {@link filtersVisible} to the value it reports.
   * @access protected
   * @since 1.4.0
   * @param {boolean} visible - The toggle button's intended next state.
   * @returns {void}
   */
  protected toggleFiltersVisible(visible: boolean): void {
    this.filtersVisible.set(visible);
  }

  /**
   * Method fieldPopoverState
   * @description Whether a field's value control should currently render open — true only for {@link openFilterKey}.
   * @access protected
   * @since 1.3.0
   * @param {'type' | 'status'} key - The field to read.
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(key: 'type' | 'status'): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @description Keeps {@link openFilterKey} in sync with a field's own value control.
   * @access protected
   * @since 1.3.0
   * @param {'type' | 'status'} key - The field whose selector changed.
   * @param {BrnOverlayState} state - Its next state.
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(key: 'type' | 'status', state: BrnOverlayState): void {
    if (state === 'open') {
      this.openFilterKey.set(key);
      return;
    }

    if (this.openFilterKey() === key) this.openFilterKey.set(null);
  }

  /**
   * Method setPageSize
   * @description Changes the page size and returns to the first page.
   * @access protected
   * @since 1.0.0
   * @param {number} size - The chosen page size.
   * @returns {void}
   */
  protected setPageSize(size: number): void {
    this.page.set(1);
    this.pageSize.set(size);
  }

  /**
   * Method goToPage
   * @description Moves to a page within bounds.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested page.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    this.page.set(Math.min(Math.max(1, target), this.pageCount()));
  }

  /**
   * Method reload
   * @description Re-runs the current query, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.load({
      organizationId: this.organizationId(),
      options: {
        params: this.buildListParams(),
        page: this.page(),
        itemsPerPage: this.pageSize(),
        sort: this.sortOrder(),
      },
    });
  }

  /**
   * Method applySortField
   * @description Orders by a column head. Re-picking the active field reverses it, which is what a second click on a sorted column means everywhere else. Resets to the first page like every other narrowing change.
   * @access protected
   * @since 1.4.0
   * @param {EquipmentSortField} field - The column's field.
   * @returns {void}
   */
  protected applySortField(field: EquipmentSortField): void {
    this.page.set(1);
    this.sortOrder.update((current: EquipmentListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.preferences.write(this.sortOrder());
  }

  /**
   * Method buildListParams
   *
   * @description
   * Folds the active search and narrowing into the query params the
   * collection receives. A filter left unset is omitted, never sent empty —
   * the API treats an empty `status` as a value, not as "any".
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {Record<string, string>} The params to send alongside pagination.
   */
  private buildListParams(): Record<string, string> {
    const filters = this.filters();
    const search: string = this.searchTerm();
    const params: Record<string, string> = {};

    if (search) params['search'] = search;
    if (filters.type) params['type'] = filters.type;
    if (filters.status) params['status'] = filters.status;

    return params;
  }

  /**
   * Method navigateQuery
   * @description Round-trips `?q=` without disturbing the rest of the URL.
   * @access private
   * @since 1.0.0
   * @param {string | null} term - The search term to set, or `null` to remove it.
   * @returns {void}
   */
  private navigateQuery(term: string | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: term },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  //#endregion
}
