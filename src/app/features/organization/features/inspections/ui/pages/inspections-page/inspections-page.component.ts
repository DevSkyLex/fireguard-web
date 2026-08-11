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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronLeft,
  lucideChevronRight,
  lucideChevronsLeft,
  lucideChevronsRight,
  lucideCircleAlert,
  lucideClipboardCheck,
  lucideListFilter,
  lucidePlus,
  lucideX,
} from '@ng-icons/lucide';
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
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmLabel } from '@shared/ui/label';
import { HlmPopoverImports } from '@shared/ui/popover';
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
 * Route entry page for the organization's inspections: a status/result
 * filter popover above the grid, in its bordered shell, and a footer
 * carrying the row count, the page size and the pager — the same shell
 * `EquipmentsPage` draws. Inspections carry no searchable text field, so
 * unlike its siblings this page offers no search box.
 *
 * It owns the query the table renders — filters and paging — and the "New
 * inspection" affordance; the record itself is where every property is
 * edited (`FEATURE.md` "The record is the edit surface"), so this page has
 * no row menu and no bulk actions to orchestrate.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspections-page',
  imports: [
    RouterLink,
    NgIcon,
    InspectionStatusTag,
    InspectionTable,
    HlmBadge,
    HlmButton,
    HlmLabel,
    ...HlmEmptyImports,
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
      lucideClipboardCheck,
      lucideListFilter,
      lucidePlus,
      lucideX,
    }),
  ],
  templateUrl: './inspections-page.component.html',
  host: { class: 'block' },
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

  /** The page sizes offered under the table. */
  protected readonly pageSizes: readonly number[] = PAGE_SIZES;

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

    return (filters.status !== null ? 1 : 0) + (filters.result !== null ? 1 : 0);
  });

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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Wires the load effect, re-running on every filter, page or page-size change.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
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
