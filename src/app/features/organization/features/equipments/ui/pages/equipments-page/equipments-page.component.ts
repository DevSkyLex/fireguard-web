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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideCircleAlert,
  lucideListFilter,
  lucidePackage,
  lucidePlus,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  EquipmentOutput,
  EquipmentStatus,
  EquipmentType,
} from '@features/organization/features/equipments/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments/options';
import {
  EquipmentStore,
  type EquipmentStoreType,
} from '@features/organization/features/equipments/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmLabel } from '@shared/ui/label';
import { HlmPopoverImports } from '@shared/ui/popover';
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
 * Route entry page for the organization's equipment: a search box and a
 * type/status filter popover above the grid, in its bordered shell, and a
 * footer carrying the row count, the page size and the pager — the same
 * shell `InterventionsPage` draws.
 *
 * It owns the query the table renders — search, filters, paging — and the
 * "New equipment" affordance; the record itself is where every property is
 * edited (`FEATURE.md` "The record is the edit surface"), so this page has
 * no row menu and no bulk actions to orchestrate.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipments-page',
  imports: [
    RouterLink,
    NgIcon,
    EquipmentStatusTag,
    EquipmentTable,
    HlmBadge,
    HlmButton,
    HlmLabel,
    ...HlmEmptyImports,
    ...HlmInputGroupImports,
    ...HlmPopoverImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronRight,
      lucideChevronsLeft,
      lucideChevronsRight,
      lucideCircleAlert,
      lucideListFilter,
      lucidePackage,
      lucidePlus,
      lucideSearch,
      lucideX,
    }),
  ],
  templateUrl: './equipments-page.component.html',
  host: { class: 'block' },
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

  /** The page sizes offered under the table. */
  protected readonly pageSizes: readonly number[] = PAGE_SIZES;

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

  /**
   * Property activeFilterCount
   * @readonly
   * @description How many narrowings are in force, for the badge on the Filters button.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly activeFilterCount: Signal<number> = computed<number>(() => {
    const filters = this.filters();

    return (filters.type !== null ? 1 : 0) + (filters.status !== null ? 1 : 0);
  });

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
   * already on the first page of the new result set.
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
          this.navigateQuery(term === '' ? null : term);
        }
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const page: number = this.page();
      const pageSize: number = this.pageSize();
      const params: Record<string, string> = this.buildListParams();

      untracked((): void => {
        this.store.load({ organizationId, options: { params, page, itemsPerPage: pageSize } });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onSearchInput
   * @description Records a keystroke into the draft term the debounce watches.
   * @access protected
   * @since 1.0.0
   * @param {Event} event - The input event.
   * @returns {void}
   */
  protected onSearchInput(event: Event): void {
    this.draftSearch.set((event.target as HTMLInputElement).value);
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
      },
    });
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
