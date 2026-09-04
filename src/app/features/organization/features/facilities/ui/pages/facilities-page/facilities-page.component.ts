import { isPlatformBrowser } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
  untracked,
  viewChild,
  PLATFORM_ID,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArchive,
  lucideCircleAlert,
  lucideDownload,
  lucideLayoutGrid,
  lucideList,
  lucideLock,
  lucideMap,
  lucideNetwork,
  lucidePlus,
  lucideSearch,
} from '@ng-icons/lucide';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  FacilityGeocodeOutput,
  CreateFacilityInput,
  FacilityListSort,
  FacilityOutput,
  FacilitySortField,
} from '@features/organization/features/facilities/models';
import { FacilityListPreferencesService } from '@features/organization/features/facilities/services';
import { FacilityOptionsStore } from '@features/organization/features/facilities/state';
import {
  FacilityStore,
  type FacilityStoreType,
} from '@features/organization/features/facilities/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { buildCsvExportFilename, resolveCsvExportErrorDetail } from '@features/organization/utils';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSearchBox, CollectionToolbar } from '@shared/collection-toolbar';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmLabel } from '@shared/ui/label';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { FacilityGrid } from '../../dataviews/facility-grid';
import { FacilityCreateSheet } from '../../sheets/facility-create-sheet';
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
 * Picking "archived" from the "+ Filter" menu moves real focus onto its own
 * checkbox once rendered ({@link focusArchivedCheckbox}) — the boolean
 * chip's equivalent of the `state`/`stateChanged` open-on-pick contract the
 * bar's other, popover-backed value controls use.
 *
 * @version 1.5.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facilities-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    RouterLink,
    FacilityCreateSheet,
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
    HlmSpinner,
    ...HlmToggleGroupImports,
  ],
  providers: [
    FacilityOptionsStore,
    provideIcons({
      lucideLock,
      lucideArchive,
      lucideCircleAlert,
      lucideDownload,
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
   * Property create
   * @readonly
   * @description `?create=1` asks the page to open the creation sheet on arrival — the deep link the `/create` redirect and the in-app links use. Consumed once, then stripped from the URL.
   * @access public
   * @since 1.6.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property parent
   * @readonly
   * @description The parent facility the caller pre-picked, bound from `?parent=`, so a record created from a site lands in it. Consumed with `create`.
   * @access public
   * @since 1.6.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly parent: InputSignal<string | undefined> = input<string | undefined>(undefined);

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
  /** Whether the last list read was refused for lack of permission, which a retry cannot fix. */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(
    () => this.store.rootListCallState().error?.code === 403,
  );

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

  /** Transport used directly for the one-shot CSV export — a download, not list state. */
  private readonly facilityService: FacilityService = inject(FacilityService);

  /** Hands the export blob to the browser as a file download. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Global toast feedback for the export's error path. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes an in-flight export when the page is destroyed. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether a CSV export is currently in flight. */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the export button should be inert: nothing loaded yet, nothing to export, or an export already in flight. */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean =>
      this.store.isLoadingRootFacilities() ||
      this.exportBusy() ||
      this.store.totalRootFacilities() === 0,
  );

  /** The filter bar's field catalog — a single "show archived" toggle. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'archived',
      fieldLabel: $localize`:@@facility.list.filterArchived:Show archived facilities`,
      icon: 'lucideArchive',
      operators: ['equals'],
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
   * Property archivedCheckboxHost
   * @readonly
   * @description The "archived" chip's own `hlm-checkbox` host element, so {@link focusArchivedCheckbox} can reach its rendered `[role="checkbox"]` node. `undefined` until the chip mounts.
   * @access private
   * @since 1.5.0
   * @type {Signal<ElementRef<HTMLElement> | undefined>}
   */
  private readonly archivedCheckboxHost: Signal<ElementRef<HTMLElement> | undefined> = viewChild(
    'archivedCheckboxHost',
    { read: ElementRef },
  );

  /**
   * Property injector
   * @readonly
   * @description This page's own injector, passed to the `afterNextRender` call in {@link focusArchivedCheckbox} — required since that call happens from an event handler, outside a reactive/DI context.
   * @access private
   * @since 1.5.0
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

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

  /**
   * Property createSheetVisible
   * @readonly
   * @description Whether the creation sheet is open. The page owns it; the sheet derives its state from it.
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly createSheetVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property pendingScopeId
   * @readonly
   * @description The parent facility a `?parent=` deep link pre-picked for the sheet, cleared when it closes.
   * @access protected
   * @since 1.6.0
   * @type {WritableSignal<string | null>}
   */
  protected readonly pendingScopeId: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property platformId
   * @readonly
   * @description Distinguishes browser from server: the sheet, its options and the `?create=1` handshake are browser-only.
   * @access private
   * @since 1.6.0
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Property facilityOptionsStore
   * @readonly
   * @description The organization's facilities as parent candidates for the sheet, loaded on first open.
   * @access protected
   * @since 1.6.0
   * @type {FacilityOptionsStore}
   */
  protected readonly facilityOptionsStore: FacilityOptionsStore =
    inject<FacilityOptionsStore>(FacilityOptionsStore);

  /** Whether the sheet's "Locate address" lookup is in flight. */
  protected readonly geocodePending: WritableSignal<boolean> = signal<boolean>(false);

  /** The latest successful lookup, handed to the sheet. */
  protected readonly geocodeResult: WritableSignal<FacilityGeocodeOutput | null> =
    signal<FacilityGeocodeOutput | null>(null);

  /** Whether the latest lookup answered `404` — the form's non-blocking inline message. */
  protected readonly geocodeNotFound: WritableSignal<boolean> = signal<boolean>(false);

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
      const requested: boolean = this.create() === '1';
      const scope: string | undefined = this.parent();

      untracked((): void => {
        if (!requested || !isPlatformBrowser(this.platformId)) return;

        if (this.canCreate()) {
          this.pendingScopeId.set(scope ?? null);
          this.openCreate();
        }
        this.navigateQuery({ create: null, parent: null });
      });
    });

    effect((): void => {
      const state: CallState<FacilityOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (state.status !== 'success' || !state.data) return;

        const created: FacilityOutput = state.data;
        this.createSheetVisible.set(false);
        void this.router
          .navigate([...this.listRouteBase(), created.id])
          .then((): void => this.store.resetCreateOperation());
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
   * Narrows `hlm-toggle-group`'s single/multi-select payload onto
   * {@link layout}. The group holds `list` and `grid` alone — the two
   * renderings this page actually owns, a display preference in the sense
   * `DESIGN.md` §Collections gives the word. Map is a dedicated route
   * (`FEATURE.md`) and therefore a link beside the group, not a third value:
   * a segment that navigates while its neighbours set state is a control
   * lying about what it is.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {string | readonly string[] | null | undefined} value - The toggle group's new value.
   *
   * @returns {void}
   */
  protected onLayoutChanged(value: string | readonly string[] | null | undefined): void {
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
   * @description Reacts to the filter bar's `fieldPicked` output by rendering the "archived" chip before its checkbox is checked, then moving focus onto that checkbox — see {@link focusArchivedCheckbox}.
   * @access protected
   * @since 1.5.0
   * @param {string} key - The field key the bar's "+ Filter" menu just picked.
   * @returns {void}
   */
  protected onFieldPicked(key: string): void {
    this.openFilterKey.set(key as 'archived');
    this.focusArchivedCheckbox();
  }

  /**
   * Method focusArchivedCheckbox
   *
   * @description
   * Moves real DOM focus to the "archived" chip's own checkbox once the
   * "+ Filter" pick has actually rendered it. A boolean field opens no
   * popover to receive focus the way the bar's other value controls do
   * (`organization/FEATURE.md` — "opening a selector" has no meaning for a
   * boolean), so without this the chip appears with focus left behind in the
   * menu that just closed. Deferred through `afterNextRender` rather than a
   * `setTimeout`, since the app is zoneless — the same idiom
   * `CollectionFilterBar.focusAfterRemoval` (`@shared/collection-filters`)
   * uses for its own post-render focus move. Queries the rendered
   * `[role="checkbox"]` node rather than reaching into `HlmCheckbox`
   * (`@shared/ui/checkbox`) itself, which exposes no focus seam of its own
   * and whose host renders as `display: contents`.
   *
   * @access private
   * @since 1.5.0
   *
   * @returns {void}
   */
  private focusArchivedCheckbox(): void {
    afterNextRender(
      {
        write: (): void => {
          this.archivedCheckboxHost()
            ?.nativeElement.querySelector<HTMLElement>('[role="checkbox"]')
            ?.focus();
        },
      },
      { injector: this.injector },
    );
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
   * Method exportCsv
   *
   * @description
   * Downloads the organization's facilities as CSV
   * (`FacilityService.exportCsv`), forwarding the screen's active narrowing
   * — free-text search and "show archived" — both of which the export
   * endpoint accepts, so the file always matches what the operator is
   * looking at (the whole tree, not only the visible roots).
   *
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected exportCsv(): void {
    if (this.store.totalRootFacilities() === 0) return;

    const search: string = this.searchTerm();

    this.exportBusy.set(true);

    this.facilityService
      .exportCsv(this.organizationId(), {
        search: search === '' ? undefined : search,
        includeArchived: this.includeArchived() || undefined,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.exportBusy.set(false);
          this.browserDownload.trigger(
            blob,
            buildCsvExportFilename('facilities', this.organizationId()),
          );
        },
        error: (error: HttpErrorResponse): void => {
          this.exportBusy.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ?? $localize`:@@facility.list.exportFailed:Couldn't export facilities.`,
            );
          });
        },
      });
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
   * Method openCreate
   * @method openCreate
   * @description Opens the creation sheet, loading its options the first time — browser only, they are secondary UI data.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected openCreate(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.facilityOptionsStore.ensureLoaded(this.organizationId());
    }
    this.createSheetVisible.set(true);
  }

  /**
   * Method onCreateSheetVisibleChange
   * @method onCreateSheetVisibleChange
   * @description Relays the sheet's open/closed state and, on close, drops the pre-picked scope.
   * @access protected
   * @since 1.6.0
   * @param {boolean} visible - Whether the sheet is open.
   * @returns {void}
   */
  protected onCreateSheetVisibleChange(visible: boolean): void {
    this.createSheetVisible.set(visible);

    if (!visible) this.pendingScopeId.set(null);
  }

  /**
   * Method onCreateSubmitted
   * @method onCreateSubmitted
   * @description Sends the sheet's payload to the store, ignoring re-entries while a create is in flight. The sheet closes and the page navigates once the store reports the new record.
   * @access protected
   * @since 1.6.0
   * @param {CreateFacilityInput} payload - The validated payload.
   * @returns {void}
   */
  protected onCreateSubmitted(payload: CreateFacilityInput): void {
    if (this.store.isCreating()) return;

    this.store.create({ organizationId: this.organizationId(), input: payload });
  }

  /**
   * Method onGeocodeRequested
   * @method onGeocodeRequested
   * @description
   * Resolves the sheet's address draft to coordinates (`FacilityService.geocode`)
   * and answers through the sheet's `geocodeResult` / `geocodeNotFound` inputs.
   * A `404` renders inline and never blocks the form; any other refusal — the
   * endpoint's `429` rate limit, a `400` — surfaces its RFC 7807 `detail` as an
   * error toast.
   * @access protected
   * @since 1.6.0
   * @param {string} address - The trimmed address the form asked to locate.
   * @returns {void}
   */
  protected onGeocodeRequested(address: string): void {
    if (this.geocodePending()) return;

    this.geocodePending.set(true);
    this.geocodeResult.set(null);
    this.geocodeNotFound.set(false);

    this.facilityService
      .geocode(this.organizationId(), address)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (match: FacilityGeocodeOutput): void => {
          this.geocodePending.set(false);
          this.geocodeResult.set(match);
        },
        error: (error: unknown): void => {
          this.geocodePending.set(false);

          if (isApiError(error) && error.status === 404) {
            this.geocodeNotFound.set(true);
            return;
          }

          this.feedback.error(
            isApiError(error)
              ? error.detail
              : $localize`:@@facility.form.locateFailed:Couldn't locate the address.`,
          );
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
