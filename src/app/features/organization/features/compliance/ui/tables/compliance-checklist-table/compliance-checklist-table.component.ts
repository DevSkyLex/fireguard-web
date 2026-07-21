import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import type {
  ChecklistOutput,
  ChecklistStatus,
} from '@features/organization/features/checklists/models';
import { EmptyState } from '@shared/components';
import { CHECKLIST_STATUS_OPTIONS } from './options';

/** Sort field the checklist listing endpoint accepts for `Checklist` column sorting. */
export type ComplianceChecklistSortField = 'name';

/**
 * Sort and pagination request emitted by the table.
 *
 * @since 1.0.0
 */
export interface ComplianceChecklistTableQuery {
  readonly page: number;
  readonly itemsPerPage: number;
  readonly status?: ChecklistStatus;
  readonly order?: Readonly<Partial<Record<ComplianceChecklistSortField, 'asc' | 'desc'>>>;
}

/**
 * Component ComplianceChecklistTable
 * @class ComplianceChecklistTable
 *
 * @description
 * Server-paginated table for the Compliance page's Checklists tab.
 * Presentational — page/sort requests are emitted for the page's store to
 * fulfil (ARCHITECTURE §9.3).
 *
 * Only the `Checklist` (name) column is server-sortable: the backend's
 * checklist listing accepts `order[name|version|status|createdAt]`, none of
 * which is `updatedAt` or `itemCount`, so `Items` and `Last updated` render
 * without a sort affordance.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-compliance-checklist-table
 *   [rows]="store.queryData()?.member ?? []"
 *   [total]="store.queryData()?.totalItems ?? 0"
 *   [loading]="store.isQueryLoading()"
 *   (queryChange)="onChecklistsQueryChange($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance-checklist-table',
  imports: [DatePipe, EmptyState, FormsModule, SelectModule, SkeletonModule, TableModule],
  templateUrl: './compliance-checklist-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceChecklistTable {
  //#region Inputs
  /** Checklist rows for the current page. */
  public readonly rows: InputSignal<readonly ChecklistOutput[]> = input.required();

  /** Total checklists matching the current query. */
  public readonly total: InputSignal<number> = input.required<number>();

  /** Whether the current page is loading. */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** Emits normalized pagination and sort requests. */
  public readonly queryChange: OutputEmitterRef<ComplianceChecklistTableQuery> =
    output<ComplianceChecklistTableQuery>();
  //#endregion

  //#region Properties
  /** Rows per page. */
  protected readonly pageSize: number = 10;

  /** Placeholder rows rendered while the first page loads. */
  protected readonly skeletonItems: undefined[] = Array(this.pageSize);

  /** A mutable copy for `p-table`, whose `value` input is not readonly. */
  protected readonly mutableRows: Signal<ChecklistOutput[]> = computed(() => [...this.rows()]);

  /**
   * Status filter options — a mutable copy of {@link CHECKLIST_STATUS_OPTIONS},
   * because `p-select`'s `options` input is not readonly (same reason as
   * {@link mutableRows}).
   */
  protected readonly statusOptions: { readonly label: string; readonly value: ChecklistStatus }[] =
    [...CHECKLIST_STATUS_OPTIONS];

  /** Draft status filter value. */
  protected readonly status: WritableSignal<ChecklistStatus | null> =
    signal<ChecklistStatus | null>(null);

  /** Last lazy-load event, replayed when the status filter changes. */
  private lastEvent: TableLazyLoadEvent = { first: 0, rows: this.pageSize };
  //#endregion

  //#region Methods
  /** Ref fallback for checklists created before `referenceCode` existed. */
  protected shortRef(row: ChecklistOutput): string {
    return row.referenceCode ?? `#${row.id.slice(0, 8).toUpperCase()}`;
  }

  /** Re-runs the query on the first page with the current status filter. */
  protected onFilterChange(): void {
    this.emitQuery({ ...this.lastEvent, first: 0 });
  }

  /** Translates a PrimeNG lazy-load event into a page + single-field sort request. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.emitQuery(event);
  }

  /** Builds and emits {@link ComplianceChecklistTableQuery} from a lazy-load event. */
  private emitQuery(event: TableLazyLoadEvent): void {
    this.lastEvent = event;

    const first: number = event.first ?? 0;
    const itemsPerPage: number = event.rows ?? this.pageSize;
    const page: number = Math.floor(first / itemsPerPage) + 1;
    const sortField: string | null | undefined = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;

    const order: Partial<Record<ComplianceChecklistSortField, 'asc' | 'desc'>> | undefined =
      sortField === 'name' && event.sortOrder
        ? { name: event.sortOrder === 1 ? 'asc' : 'desc' }
        : undefined;

    this.queryChange.emit({ page, itemsPerPage, status: this.status() ?? undefined, order });
  }
  //#endregion
}
