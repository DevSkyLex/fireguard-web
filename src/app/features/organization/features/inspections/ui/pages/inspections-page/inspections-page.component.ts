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
  lucideClipboardCheck,
  lucideGauge,
  lucideListFilter,
  lucidePlus,
  lucideSearch,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionListOptions,
  InspectionListSort,
  InspectionOutput,
  InspectionResult,
  InspectionSortField,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import { resolveInspectionStatusTag } from '@features/organization/features/inspections/models';
import { InspectionListPreferencesService } from '@features/organization/features/inspections/services';
import {
  InspectionStore,
  type InspectionStoreType,
} from '@features/organization/features/inspections/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  CollectionFilterBar,
  CollectionFilterSelect,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
  type CollectionFilterOption,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { InspectionStatusTag } from '../../components/inspection-status-tag';
import { InspectionTable } from '../../tables/inspection-table';

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the table — the server default first. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** Every workflow status offered in the filter bar. */
const STATUS_VALUES: readonly InspectionStatus[] = ['draft', 'submitted', 'closed', 'cancelled'];

/** Every result offered in the filter bar. */
const RESULT_VALUES: readonly InspectionResult[] = ['pass', 'partial', 'fail'];

/**
 * Component InspectionsPage
 * @class InspectionsPage
 *
 * @description
 * Route entry page for the organization's inspections: a toolbar carrying a
 * URL-synced search box (`app-collection-search-box`, `?q=`) and the
 * "Filters" toggle (`app-collection-filter-toggle`), an editable
 * status/result filter chip row (`app-collection-filter-bar`,
 * `@shared/collection-filters`) mounted below it once expanded, the grid in
 * its bordered shell, and a footer carrying the row count, the page size and
 * the pager — the same shell `EquipmentsPage` draws.
 *
 * It owns the query the table renders — search, filters, sort and paging —
 * and the "New inspection" affordance; the record itself is where every
 * property is edited (`FEATURE.md` "The record is the edit surface"), so
 * this page has no row menu and no bulk actions to orchestrate. The active
 * ordering ({@link sortOrder}) is remembered across visits through
 * `InspectionListPreferencesService`, the same cookie-backed pattern
 * `InterventionsPage` established; unlike that page, page size is not
 * remembered here. The `?page=` query param is synced the same way
 * `FacilitiesPage` does it, so a reload or a shared link lands back on the
 * same page; any narrowing change (search, filters, sort) resets to the
 * first page.
 *
 * Its title lives in the shell breadcrumb; "New inspection" registers on the
 * shell header through `PageActionsService`. The status/result chips' own
 * value controls are `app-collection-filter-select`
 * (`@shared/collection-filters`), the generic single-value control the
 * intervention list's own chips already draw.
 *
 * @version 1.7.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspections-page',
  imports: [
    RouterLink,
    NgIcon,
    EmptyState,
    ErrorState,
    InspectionStatusTag,
    InspectionTable,
    CollectionFilterBar,
    CollectionFilterSelect,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    HlmButton,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleDot,
      lucideClipboardCheck,
      lucideGauge,
      lucideListFilter,
      lucidePlus,
      lucideSearch,
    }),
  ],
  templateUrl: './inspections-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose inspections are listed, bound from the route.
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
   * @since 1.4.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly q: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property page
   * @readonly
   * @description The page number the URL carries, so a reload or a shared link lands back on the same page.
   * @access public
   * @since 1.6.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly page: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /** The list dataset, provided by this route. */
  protected readonly store: InspectionStoreType = inject<InspectionStoreType>(InspectionStore);

  /** Organization permission checks gating the "New inspection" action. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Remembers the active ordering across visits. */
  private readonly preferences: InspectionListPreferencesService =
    inject<InspectionListPreferencesService>(InspectionListPreferencesService);

  /** Router used to round-trip `?q=` and `?page=`. */
  private readonly router: Router = inject(Router);

  /** Current route, anchoring the relative query-param navigation. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The active narrowing. Questions asked now, so never persisted. */
  protected readonly filters: WritableSignal<{
    readonly status: InspectionStatus | null;
    readonly result: InspectionResult | null;
  }> = signal({ status: null, result: null });

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** The active ordering, restored from the preferences cookie. */
  protected readonly sortOrder: WritableSignal<InspectionListSort> = signal<InspectionListSort>(
    this.preferences.readSort(),
  );

  /** How many rows a page holds. Not remembered — a per-visit preference. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /**
   * Property statusOptions
   * @readonly
   * @description Status choices offered in the filter bar, labelled through the inspection status registry rather than a second copy (`ARCHITECTURE.md` §10.10).
   * @access protected
   * @since 1.7.0
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly statusOptions: readonly CollectionFilterOption[] = STATUS_VALUES.map(
    (status: InspectionStatus): CollectionFilterOption => ({
      value: status,
      label: resolveInspectionStatusTag('status', status).label,
    }),
  );

  /**
   * Property resultOptions
   * @readonly
   * @description Result choices offered in the filter bar, labelled through the same registry as {@link statusOptions}.
   * @access protected
   * @since 1.7.0
   * @type {readonly CollectionFilterOption[]}
   */
  protected readonly resultOptions: readonly CollectionFilterOption[] = RESULT_VALUES.map(
    (result: InspectionResult): CollectionFilterOption => ({
      value: result,
      label: resolveInspectionStatusTag('result', result).label,
    }),
  );

  /**
   * Property searchTerm
   * @readonly
   * @description The search as everything downstream reads it: trimmed, never `undefined`.
   * @access protected
   * @since 1.4.0
   * @type {Signal<string>}
   */
  protected readonly searchTerm: Signal<string> = computed<string>(() => this.q()?.trim() ?? '');

  /**
   * Property currentPage
   * @readonly
   * @description The URL's `?page=` as a bounded positive integer, defaulting to the first page.
   * @access protected
   * @since 1.6.0
   * @type {Signal<number>}
   */
  protected readonly currentPage: Signal<number> = computed<number>(() => {
    const parsed: number = Number(this.page());

    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
  });

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

    return this.searchTerm() !== '' || filters.status !== null || filters.result !== null;
  });

  /** The filter bar's field catalog: status, then result. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'status',
      fieldLabel: $localize`:@@inspection.list.filterStatus:Status`,
      icon: 'lucideCircleDot',
      operators: ['equals'],
    },
    {
      key: 'result',
      fieldLabel: $localize`:@@inspection.list.filterResult:Result`,
      icon: 'lucideGauge',
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
        ...(filters.status !== null ? ['status'] : []),
        ...(filters.result !== null ? ['result'] : []),
      ];
    },
  );

  /** Which field's value selector currently renders forced open — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<'status' | 'result' | null> = signal<
    'status' | 'result' | null
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

  /** The "Status" chip's value control, projected into the filter bar. */
  private readonly statusChipTemplate = viewChild<TemplateRef<unknown>>('statusChip');

  /** The "Result" chip's value control, projected into the filter bar. */
  private readonly resultChipTemplate = viewChild<TemplateRef<unknown>>('resultChip');

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
  > = computed(() => ({ status: this.statusChipTemplate(), result: this.resultChipTemplate() }));

  /** The rows the table currently renders. */
  protected readonly items: Signal<readonly InspectionOutput[]> = computed<
    readonly InspectionOutput[]
  >(() => this.store.inspections());

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalInspections() / this.pageSize())),
  );

  /**
   * Property canCreate
   * @readonly
   * @description Whether the member may open new inspections.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canCreate: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );

  /** Where a row's link, and the "New inspection" button, point. */
  protected readonly listRouteBase: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'inspections',
  ]);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New inspection" button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   *
   * @description
   * Wires the search round-trip and the load effect, the same shape
   * `EquipmentsPage` uses: a settled (debounced) search resets the page
   * synchronously with the query navigation so the load effect fires once,
   * already on the first page of the new result set. Re-runs on every
   * filter, sort, page or page-size change. Also registers {@link pageActions}.
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
          this.navigateQuery({ q: term === '' ? null : term, page: null });
        }
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const page: number = this.currentPage();
      const pageSize: number = this.pageSize();
      const options: InspectionListOptions = this.buildListOptions();

      untracked((): void => {
        this.store.load({
          organizationId,
          options: { ...options, page, itemsPerPage: pageSize },
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method applyFilter
   * @description Replaces one narrowing, which reloads the list from the first page.
   * @access protected
   * @since 1.0.0
   * @param {Partial<{ status: InspectionStatus | null; result: InspectionResult | null }>} patch - The field to change.
   * @returns {void}
   */
  protected applyFilter(
    patch: Partial<{
      readonly status: InspectionStatus | null;
      readonly result: InspectionResult | null;
    }>,
  ): void {
    this.filters.update((current) => ({ ...current, ...patch }));
    this.navigateQuery({ page: null });
  }

  /**
   * Method clearFilters
   * @description Drops every narrowing at once, including the search term.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.filters.set({ status: null, result: null });
    this.clearSearch();
  }

  /**
   * Method onSearchQueryChanged
   * @description Records a keystroke into the draft term the debounce watches.
   * @access protected
   * @since 1.4.0
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
   * @since 1.4.0
   * @returns {void}
   */
  protected clearSearch(): void {
    this.draftSearch.set('');
    this.navigateQuery({ q: null, page: null });
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
    this.openFilterKey.set(key as 'status' | 'result');
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
    this.applyFilter(key === 'status' ? { status: null } : { result: null });
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
   * @param {'status' | 'result'} key - The field to read.
   * @returns {BrnOverlayState} `'open'` or `'closed'`.
   */
  protected fieldPopoverState(key: 'status' | 'result'): BrnOverlayState {
    return this.openFilterKey() === key ? 'open' : 'closed';
  }

  /**
   * Method onFieldPopoverStateChanged
   * @description Keeps {@link openFilterKey} in sync with a field's own value control.
   * @access protected
   * @since 1.3.0
   * @param {'status' | 'result'} key - The field whose selector changed.
   * @param {BrnOverlayState} state - Its next state.
   * @returns {void}
   */
  protected onFieldPopoverStateChanged(key: 'status' | 'result', state: BrnOverlayState): void {
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
    this.pageSize.set(size);
    this.navigateQuery({ page: null });
  }

  /**
   * Method goToPage
   * @description Moves to a page within bounds, round-tripped through `?page=`.
   * @access protected
   * @since 1.0.0
   * @param {number} target - The requested page.
   * @returns {void}
   */
  protected goToPage(target: number): void {
    const bounded: number = Math.min(Math.max(1, target), this.pageCount());

    this.navigateQuery({ page: bounded === 1 ? null : String(bounded) });
  }

  /**
   * Method applySortField
   *
   * @description
   * Orders by a column head. Re-picking the active field reverses it, which
   * is what a second click on a sorted column means everywhere else. Also
   * persists the choice to the preferences cookie.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {InspectionSortField} field - The column's field.
   *
   * @returns {void}
   */
  protected applySortField(field: InspectionSortField): void {
    this.sortOrder.update((current: InspectionListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.preferences.writeSort(this.sortOrder());
    this.navigateQuery({ page: null });
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
        ...this.buildListOptions(),
        page: this.currentPage(),
        itemsPerPage: this.pageSize(),
      },
    });
  }

  /**
   * Method buildListOptions
   *
   * @description
   * Folds the active search, narrowing and ordering into the typed options
   * the collection receives. A filter left unset is omitted, never sent
   * empty — the API treats an empty `status`/`result` as a value, not as
   * "any". `search` and `sort` are the typed `RequestOptions` fields
   * `HydraApiService.buildParams` serializes natively.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {InspectionListOptions} The options to send alongside pagination.
   */
  private buildListOptions(): InspectionListOptions {
    const filters = this.filters();
    const search: string = this.searchTerm();

    return {
      status: filters.status ?? undefined,
      result: filters.result ?? undefined,
      search: search === '' ? undefined : search,
      sort: this.sortOrder(),
    };
  }

  /**
   * Method navigateQuery
   * @description Round-trips a patch of query params without disturbing the rest of the URL.
   * @access private
   * @since 1.4.0
   * @param {Record<string, string | null>} patch - The params to set, `null` removing one.
   * @returns {void}
   */
  private navigateQuery(patch: Readonly<Record<string, string | null>>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  //#endregion
}
