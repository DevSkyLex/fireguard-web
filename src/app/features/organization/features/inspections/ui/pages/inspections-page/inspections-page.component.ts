import { isPlatformBrowser } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  lucideChartColumn,
  lucideCircleAlert,
  lucideCircleDot,
  lucideClipboardCheck,
  lucideDownload,
  lucideGauge,
  lucideListFilter,
  lucideLock,
  lucidePlus,
  lucideSearch,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { debounceTime, distinctUntilChanged, take } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { ChecklistStore } from '@features/organization/features/checklists/state';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  CreateInspectionInput,
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
import { InspectionCreationOptionsStore } from '@features/organization/features/inspections/state/inspection-creation-options';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { buildCsvExportFilename, resolveCsvExportErrorDetail } from '@features/organization/utils';
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
import { HlmSpinner } from '@shared/ui/spinner';
import { InspectionStatusTag } from '../../components/inspection-status-tag';
import { InspectionCreateSheet } from '../../sheets/inspection-create-sheet';
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
    InspectionCreateSheet,
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
    HlmSpinner,
  ],
  providers: [
    ChecklistStore,
    InspectionCreationOptionsStore,
    provideIcons({
      lucideLock,
      lucideChartColumn,
      lucideCircleAlert,
      lucideCircleDot,
      lucideClipboardCheck,
      lucideDownload,
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
   * Property create
   * @readonly
   * @description `?create=1` asks the page to open the creation sheet on arrival — the deep link the `/create` redirect and the in-app links use. Consumed once, then stripped from the URL.
   * @access public
   * @since 1.6.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly create: InputSignal<string | undefined> = input<string | undefined>(undefined);

  /**
   * Property equipment
   * @readonly
   * @description The equipment the caller pre-picked, bound from `?equipment=`, so a record created from a site lands in it. Consumed with `create`.
   * @access public
   * @since 1.6.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly equipment: InputSignal<string | undefined> = input<string | undefined>(undefined);

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
  /** Whether the last list read was refused for lack of permission, which a retry cannot fix. */
  protected readonly listForbidden: Signal<boolean> = computed<boolean>(
    () => this.store.listCallState().error?.code === 403,
  );

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

  /** Transport used directly for the one-shot CSV export — a download, not list state. */
  private readonly inspectionService: InspectionService = inject(InspectionService);

  /** Hands the export blob to the browser as a file download. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Global toast feedback for the export's warn and error paths. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes an in-flight export when the page is destroyed. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether a CSV export is currently in flight. */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the export button should be inert: nothing loaded yet, nothing to export, or an export already in flight. */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean =>
      this.store.isLoadingInspections() || this.exportBusy() || this.store.totalInspections() === 0,
  );

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
   * @description The equipment a `?equipment=` deep link pre-picked for the sheet, cleared when it closes.
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
   * Property creationOptions
   * @readonly
   * @description The equipment the sheet's combobox offers, loaded on first open.
   * @access protected
   * @since 1.6.0
   * @type {InspectionCreationOptionsStore}
   */
  protected readonly creationOptions: InspectionCreationOptionsStore = inject(
    InspectionCreationOptionsStore,
  );

  /**
   * Property checklistStore
   * @readonly
   * @description The active checklist templates the sheet's optional picker offers — the checklists subfeature's documented cross-feature consumer.
   * @access protected
   * @since 1.6.0
   * @type {ChecklistStore}
   */
  protected readonly checklistStore: ChecklistStore = inject<ChecklistStore>(ChecklistStore);

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
      const requested: boolean = this.create() === '1';
      const scope: string | undefined = this.equipment();

      untracked((): void => {
        if (!requested || !isPlatformBrowser(this.platformId)) return;

        if (this.canCreate()) {
          this.pendingScopeId.set(scope ?? null);
          this.openCreate();
        }
        this.navigateQuery({ create: null, equipment: null });
      });
    });

    effect((): void => {
      const state: CallState<InspectionOutput | null> = this.store.createCallState();

      untracked((): void => {
        if (state.status !== 'success' || !state.data) return;

        const created: InspectionOutput = state.data;
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
   * Method exportCsv
   *
   * @description
   * Downloads the organization's inspections as CSV
   * (`InspectionService.exportCsv`), forwarding the screen's `status` and
   * `result` narrowing — both of which the export endpoint accepts. The
   * free-text search is not part of the export's contract, so when one is
   * active the export is wider than the screen — announced through a warn
   * toast before the download starts.
   *
   * @access protected
   * @since 1.7.0
   * @returns {void}
   */
  protected exportCsv(): void {
    if (this.store.totalInspections() === 0) return;

    if (this.searchTerm() !== '') {
      this.feedback.warn(
        $localize`:@@inspection.list.exportFiltersDropped:Some active filters aren't supported by the export and were left out.`,
      );
    }

    const filters = this.filters();

    this.exportBusy.set(true);

    this.inspectionService
      .exportCsv(this.organizationId(), {
        status: filters.status ?? undefined,
        result: filters.result ?? undefined,
      })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.exportBusy.set(false);
          this.browserDownload.trigger(
            blob,
            buildCsvExportFilename('inspections', this.organizationId()),
          );
        },
        error: (error: HttpErrorResponse): void => {
          this.exportBusy.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ?? $localize`:@@inspection.list.exportFailed:Couldn't export inspections.`,
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
   * Method openCreate
   * @method openCreate
   * @description Opens the creation sheet, loading its options the first time — browser only, they are secondary UI data.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected openCreate(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.creationOptions.loadEquipmentOptions(this.organizationId());
      this.checklistStore.ensureInspectionCreateOptionsLoaded(this.organizationId());
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
   * @param {CreateInspectionInput} payload - The validated payload.
   * @returns {void}
   */
  protected onCreateSubmitted(payload: CreateInspectionInput): void {
    if (this.store.isCreating()) return;

    this.store.create({ organizationId: this.organizationId(), input: payload });
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
