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
  lucideArchive,
  lucideCircleAlert,
  lucideLayoutGrid,
  lucideList,
  lucideMap,
  lucideNetwork,
  lucidePlus,
  lucideSearch,
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityListSort,
  FacilityOutput,
  FacilitySortField,
} from '@features/organization/features/facilities/models';
import { FacilityListPreferencesService } from '@features/organization/features/facilities/services';
import {
  FacilityStore,
  type FacilityStoreType,
} from '@features/organization/features/facilities/state';
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
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmLabel } from '@shared/ui/label';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { FacilityGrid } from '../../dataviews/facility-grid';
import { FacilityTable } from '../../tables/facility-table';

/** How long typing settles before the search reaches the wire. */
const SEARCH_DEBOUNCE_MS: number = 300;

/** The page sizes offered under the list. */
const PAGE_SIZES: readonly [number, number, number] = [30, 60, 100];

/** The two ways the roots-only collection can be rendered. */
type FacilityLayout = 'list' | 'grid';

/**
 * Component FacilitiesPage
 * @class FacilitiesPage
 *
 * @description
 * Route entry page for the organization's root facilities
 * (`/organizations/:organizationId/facilities`): a search box and a "show
 * archived" filter chip (`app-collection-filter-bar`,
 * `@shared/collection-filters`) above a list/grid/map layout toggle, paginated
 * server-side (`FEATURE.md` "Facility Listing (Roots-Only DataView)"). `map`
 * is not a rendering mode of this page — it navigates to the dedicated
 * `facilities/map` route, since an interactive map is a heavier surface than
 * a per-visit view-state toggle should carry in-page.
 *
 * The list is **roots-only** — hierarchy navigation lives on the facility
 * detail page's Overview tab, not here — and the `?page=` query param is
 * synced so a reload or a shared link lands back on the same page. Row
 * actions are limited to Archive and Restore: every other property is
 * edited on the record itself (`FEATURE.md` "The record is the edit
 * surface"), so this page has no row menu beyond those two and no bulk
 * actions.
 *
 * Its title lives in the shell breadcrumb; "New facility" registers on the
 * shell header through `PageActionsService`.
 *
 * @version 1.4.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-page',
  imports: [
    RouterLink,
    NgIcon,
    EmptyState,
    ErrorState,
    FacilityGrid,
    FacilityTable,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionSearchBox,
    CollectionToolbar,
    HlmButton,
    HlmCheckbox,
    HlmLabel,
    ...HlmToggleGroupImports,
  ],
  providers: [
    provideIcons({
      lucideArchive,
      lucideCircleAlert,
      lucideLayoutGrid,
      lucideList,
      lucideMap,
      lucideNetwork,
      lucidePlus,
      lucideSearch,
    }),
  ],
  templateUrl: './facilities-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitiesPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose root facilities are listed, bound from the route.
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

  /**
   * Property page
   * @readonly
   * @description The page number the URL carries (`FEATURE.md` "the `?page=` query param is synced for roots").
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly page: InputSignal<string | undefined> = input<string | undefined>(undefined);
  //#endregion

  //#region Properties
  /** The list dataset, provided by this route. */
  protected readonly store: FacilityStoreType = inject<FacilityStoreType>(FacilityStore);

  /** Organization permission checks gating the "New facility" action and the row actions. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Router used to round-trip `?q=` and `?page=`. */
  private readonly router: Router = inject(Router);

  /** Current route, anchoring the relative query-param navigation. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** The cookie-backed memory of how this list was left ordered. */
  private readonly preferences: FacilityListPreferencesService =
    inject<FacilityListPreferencesService>(FacilityListPreferencesService);

  /** Whether the roots render as a table or as cards. Not URL-synced — a per-visit preference. */
  protected readonly layout: WritableSignal<FacilityLayout> = signal<FacilityLayout>('list');

  /**
   * Property sortOrder
   * @readonly
   * @description The active ordering, restored from the preferences cookie. Applies to the shared dataset — the grid dataview reflects it, and sorting controls live only in the table's heads (`FEATURE.md`).
   * @access protected
   * @since 1.4.0
   * @type {WritableSignal<FacilityListSort>}
   */
  protected readonly sortOrder: WritableSignal<FacilityListSort> = signal<FacilityListSort>(
    this.preferences.readSort(),
  );

  /** Whether archived facilities are included in the current page. */
  protected readonly includeArchived: WritableSignal<boolean> = signal<boolean>(false);

  /** What the search box holds, before the debounce settles. */
  protected readonly draftSearch: WritableSignal<string> = signal<string>('');

  /** How many rows a page holds. Not URL-synced, only the page number is. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

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
   * Property currentPage
   * @readonly
   * @description The URL's `?page=` as a bounded positive integer, defaulting to the first page.
   * @access protected
   * @since 1.0.0
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
  protected readonly hasSearchOrFilters: Signal<boolean> = computed<boolean>(
    () => this.searchTerm() !== '' || this.includeArchived(),
  );

  /** The filter bar's field catalog — a single "show archived" toggle. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'archived',
      fieldLabel: $localize`:@@facility.list.filterArchived:Show archived facilities`,
      icon: 'lucideArchive',
    },
  ];

  /**
   * Property activeFilterKeys
   * @readonly
   * @description The `archived` field, when {@link includeArchived} is set — the bar's `activeKeys` input.
   * @access protected
   * @since 1.3.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly activeFilterKeys: Signal<readonly string[]> = computed<readonly string[]>(
    () => (this.includeArchived() ? ['archived'] : []),
  );

  /** Which field the filter bar currently renders mid-pick, before its checkbox is checked — `null` when none is. */
  protected readonly openFilterKey: WritableSignal<'archived' | null> = signal<'archived' | null>(
    null,
  );

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

  /** The "Show archived facilities" chip's checkbox, projected into the filter bar. */
  private readonly archivedChipTemplate = viewChild<TemplateRef<unknown>>('archivedChip');

  /**
   * Property chipTemplates
   * @readonly
   * @description The `archived` field's value-control `TemplateRef`, for `app-collection-filter-bar`'s `templates` input.
   * @access protected
   * @since 1.3.0
   * @type {Signal<Readonly<Record<string, TemplateRef<unknown> | undefined>>>}
   */
  protected readonly chipTemplates: Signal<
    Readonly<Record<string, TemplateRef<unknown> | undefined>>
  > = computed(() => ({ archived: this.archivedChipTemplate() }));

  /** The rows the current view currently renders. */
  protected readonly items: Signal<readonly FacilityOutput[]> = computed<readonly FacilityOutput[]>(
    () => this.store.rootFacilities(),
  );

  /**
   * Property pageCount
   * @readonly
   * @description How many pages the current total spans, at least one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount: Signal<number> = computed<number>(() =>
    Math.max(1, Math.ceil(this.store.totalRootFacilities() / this.pageSize())),
  );

  /**
   * Property canCreate
   * @readonly
   * @description Whether the member may register a new facility.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canCreate: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member may archive or restore a row.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /** Where a row's link, and the "New facility" button, point. */
  protected readonly listRouteBase: Signal<readonly string[]> = computed<readonly string[]>(() => [
    '/organizations',
    this.organizationId(),
    'facilities',
  ]);

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New facility" button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Wires the search round-trip and the load effect: a settled (debounced)
   * search resets the page synchronously with the query navigation so the
   * load effect fires once, already on the first page of the new result set.
   * Also registers {@link pageActions}.
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
      const search: string = this.searchTerm();
      const includeArchived: boolean = this.includeArchived();
      const sort: FacilityListSort = this.sortOrder();

      untracked((): void => {
        this.store.loadRootFacilities({
          organizationId,
          options: {
            page,
            itemsPerPage: pageSize,
            search: search === '' ? undefined : search,
            includeArchived: includeArchived || undefined,
            sort,
          },
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onLayoutChanged
   *
   * @description
   * Narrows `hlm-toggle-group`'s single/multi-select payload. `list`/`grid`
   * are page-local view state (`layout`); `map` is not a rendering mode of
   * this page but a dedicated route (`FEATURE.md`), so it navigates there
   * instead of writing {@link layout}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's new value.
   *
   * @returns {void}
   */
  protected onLayoutChanged(value: string | readonly string[] | null | undefined): void {
    if (value === 'map') {
      void this.router.navigate([...this.listRouteBase(), 'map']);

      return;
    }

    this.layout.set(value === 'grid' ? 'grid' : 'list');
  }

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
   * @description Drops the search from the URL and returns to the first page.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearSearch(): void {
    this.draftSearch.set('');
    this.navigateQuery({ q: null, page: null });
  }

  /**
   * Method toggleIncludeArchived
   * @description Flips whether archived facilities are shown, returning to the first page.
   * @access protected
   * @since 1.0.0
   * @param {boolean} checked - The checkbox's new state.
   * @returns {void}
   */
  protected toggleIncludeArchived(checked: boolean): void {
    this.includeArchived.set(checked);
    if (checked && this.openFilterKey() === 'archived') this.openFilterKey.set(null);
    this.navigateQuery({ page: null });
  }

  /**
   * Method onFieldPicked
   * @description Reacts to the filter bar's `fieldPicked` output by rendering the "archived" chip before its checkbox is checked.
   * @access protected
   * @since 1.3.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as 'archived');
  }

  /**
   * Method onFieldRemoved
   * @description Reacts to the filter bar's `fieldRemoved` output by turning "show archived" back off.
   * @access protected
   * @since 1.3.0
   * @returns {void}
   */
  protected onFieldRemoved(): void {
    this.toggleIncludeArchived(false);
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
   * Method clearFilters
   * @description Drops every narrowing at once, including the search term.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.includeArchived.set(false);
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
   * Method onArchiveRequested
   * @description Archives a row's facility.
   * @access protected
   * @since 1.0.0
   * @param {FacilityOutput} facility - The facility to archive.
   * @returns {void}
   */
  protected onArchiveRequested(facility: FacilityOutput): void {
    this.store.archive({ organizationId: this.organizationId(), facilityId: facility.id });
  }

  /**
   * Method onRestoreRequested
   * @description Restores a row's archived facility.
   * @access protected
   * @since 1.0.0
   * @param {FacilityOutput} facility - The facility to restore.
   * @returns {void}
   */
  protected onRestoreRequested(facility: FacilityOutput): void {
    this.store.restore({ organizationId: this.organizationId(), facilityId: facility.id });
  }

  /**
   * Method reload
   * @description Re-runs the current query, for the error state's retry.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected reload(): void {
    this.store.loadRootFacilities({
      organizationId: this.organizationId(),
      options: {
        page: this.currentPage(),
        itemsPerPage: this.pageSize(),
        search: this.searchTerm() === '' ? undefined : this.searchTerm(),
        includeArchived: this.includeArchived() || undefined,
        sort: this.sortOrder(),
      },
    });
  }

  /**
   * Method applySortField
   * @description Orders by a column head. Re-picking the active field reverses it, which is what a second click on a sorted column means everywhere else. Resets to the first page like every other narrowing change.
   * @access protected
   * @since 1.4.0
   * @param {FacilitySortField} field - The column's field.
   * @returns {void}
   */
  protected applySortField(field: FacilitySortField): void {
    this.sortOrder.update((current: FacilityListSort) =>
      current.field === field
        ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: current.direction },
    );
    this.preferences.write(this.sortOrder());
    this.navigateQuery({ page: null });
  }

  /**
   * Method navigateQuery
   * @description Round-trips a patch of query params without disturbing the rest of the URL.
   * @access private
   * @since 1.0.0
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
