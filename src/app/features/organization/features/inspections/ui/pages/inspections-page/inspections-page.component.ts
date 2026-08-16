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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleDot,
  lucideClipboardCheck,
  lucideGauge,
  lucideListFilter,
  lucidePlus,
} from '@ng-icons/lucide';
import type { BrnOverlayState } from '@spartan-ng/brain/overlay';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';
import {
  InspectionStore,
  type InspectionStoreType,
} from '@features/organization/features/inspections/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  CollectionFilterBar,
  CollectionFilterToggle,
  initialCollectionFilterBarVisibility,
  type CollectionFilterField,
} from '@shared/collection-filters';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionToolbar } from '@shared/collection-toolbar';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSelectImports } from '@shared/ui/select';
import { InspectionStatusTag } from '../../components/inspection-status-tag';
import { InspectionTable } from '../../tables/inspection-table';

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
 * Route entry page for the organization's inspections: a toolbar carrying
 * only the "Filters" toggle (`app-collection-filter-toggle`), an editable
 * status/result filter chip row (`app-collection-filter-bar`,
 * `@shared/collection-filters`) mounted below it once expanded, the grid in
 * its bordered shell, and a footer carrying the row count, the page size and
 * the pager — the same shell `EquipmentsPage` draws. Inspections carry no
 * searchable text field, so unlike its siblings this page's toolbar has no
 * search box.
 *
 * It owns the query the table renders — filters and paging — and the "New
 * inspection" affordance; the record itself is where every property is
 * edited (`FEATURE.md` "The record is the edit surface"), so this page has
 * no row menu and no bulk actions to orchestrate.
 *
 * Its title lives in the shell breadcrumb; "New inspection" registers on the
 * shell header through `PageActionsService`.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspections-page',
  imports: [
    RouterLink,
    NgIcon,
    ErrorState,
    InspectionStatusTag,
    InspectionTable,
    CollectionFilterBar,
    CollectionFilterToggle,
    CollectionPagination,
    CollectionToolbar,
    HlmButton,
    ...HlmEmptyImports,
    ...HlmSelectImports,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleDot,
      lucideClipboardCheck,
      lucideGauge,
      lucideListFilter,
      lucidePlus,
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
  //#endregion

  //#region Properties
  /** The list dataset, provided by this route. */
  protected readonly store: InspectionStoreType = inject<InspectionStoreType>(InspectionStore);

  /** Organization permission checks gating the "New inspection" action. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** The active narrowing. Questions asked now, so never persisted. */
  protected readonly filters: WritableSignal<{
    readonly status: InspectionStatus | null;
    readonly result: InspectionResult | null;
  }> = signal({ status: null, result: null });

  /** The page window, one-based. */
  protected readonly page: WritableSignal<number> = signal<number>(1);

  /** How many rows a page holds. */
  protected readonly pageSize: WritableSignal<number> = signal<number>(PAGE_SIZES[0]);

  /** Status choices offered in the filter bar. */
  protected readonly statusValues: readonly InspectionStatus[] = STATUS_VALUES;

  /** Result choices offered in the filter bar. */
  protected readonly resultValues: readonly InspectionResult[] = RESULT_VALUES;

  /**
   * Property hasFilters
   * @readonly
   * @description Whether the current view is narrowed at all, deciding what the empty state offers.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly hasFilters: Signal<boolean> = computed<boolean>(() => {
    const filters = this.filters();

    return filters.status !== null || filters.result !== null;
  });

  /** The filter bar's field catalog: status, then result. */
  protected readonly filterFields: readonly CollectionFilterField[] = [
    {
      key: 'status',
      fieldLabel: $localize`:@@inspection.list.filterStatus:Status`,
      icon: 'lucideCircleDot',
    },
    {
      key: 'result',
      fieldLabel: $localize`:@@inspection.list.filterResult:Result`,
      icon: 'lucideGauge',
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
   * @constructor
   * @description Wires the load effect, re-running on every filter, page or page-size change, and registers {@link pageActions}.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

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
    this.page.set(1);
    this.filters.update((current) => ({ ...current, ...patch }));
  }

  /**
   * Method clearFilters
   * @description Drops every narrowing at once.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected clearFilters(): void {
    this.page.set(1);
    this.filters.set({ status: null, result: null });
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
   * Folds the active narrowing into the query params the collection
   * receives. A filter left unset is omitted, never sent empty — the API
   * treats an empty `status`/`result` as a value, not as "any".
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {Record<string, string>} The params to send alongside pagination.
   */
  private buildListParams(): Record<string, string> {
    const filters = this.filters();
    const params: Record<string, string> = {};

    if (filters.status) params['status'] = filters.status;
    if (filters.result) params['result'] = filters.result;

    return params;
  }
  //#endregion
}
