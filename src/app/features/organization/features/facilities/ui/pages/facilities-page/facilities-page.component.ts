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
  lucideCircleAlert,
  lucideLayoutGrid,
  lucideList,
  lucideListFilter,
  lucideNetwork,
  lucidePlus,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  FacilityStore,
  type FacilityStoreType,
} from '@features/organization/features/facilities/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ListPagination } from '@features/organization/ui/components';
import { ErrorState } from '@shared/error-state';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmInputGroupImports } from '@shared/ui/input-group';
import { HlmLabel } from '@shared/ui/label';
import { HlmPopoverImports } from '@shared/ui/popover';
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
 * archived" filter popover above a list/grid layout toggle, paginated
 * server-side (`FEATURE.md` "Facility Listing (Roots-Only DataView)").
 *
 * The list is **roots-only** — hierarchy navigation lives on the facility
 * detail page's Overview tab, not here — and the `?page=` query param is
 * synced so a reload or a shared link lands back on the same page. Row
 * actions are limited to Archive and Restore: every other property is
 * edited on the record itself (`FEATURE.md` "The record is the edit
 * surface"), so this page has no row menu beyond those two and no bulk
 * actions.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-page',
  imports: [
    RouterLink,
    NgIcon,
    ErrorState,
    FacilityGrid,
    FacilityTable,
    ListPagination,
    HlmBadge,
    HlmButton,
    HlmCheckbox,
    HlmLabel,
    ...HlmEmptyImports,
    ...HlmInputGroupImports,
    ...HlmPopoverImports,
    ...HlmToggleGroupImports,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideLayoutGrid,
      lucideList,
      lucideListFilter,
      lucideNetwork,
      lucidePlus,
      lucideSearch,
      lucideX,
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

  /** Whether the roots render as a table or as cards. Not URL-synced — a per-visit preference. */
  protected readonly layout: WritableSignal<FacilityLayout> = signal<FacilityLayout>('list');

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
          this.navigateQuery({ q: term === '' ? null : term, page: null });
        }
      });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const page: number = this.currentPage();
      const pageSize: number = this.pageSize();
      const search: string = this.searchTerm();
      const includeArchived: boolean = this.includeArchived();

      untracked((): void => {
        this.store.loadRootFacilities({
          organizationId,
          options: {
            page,
            itemsPerPage: pageSize,
            search: search === '' ? undefined : search,
            includeArchived: includeArchived || undefined,
          },
        });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onLayoutChanged
   * @description Narrows `hlm-toggle-group`'s single/multi-select payload before writing {@link layout}.
   * @access protected
   * @since 1.0.0
   * @param {string | readonly string[] | null | undefined} value - The toggle group's new value.
   * @returns {void}
   */
  protected onLayoutChanged(value: string | readonly string[] | null | undefined): void {
    this.layout.set(value === 'grid' ? 'grid' : 'list');
  }

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
      },
    });
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
