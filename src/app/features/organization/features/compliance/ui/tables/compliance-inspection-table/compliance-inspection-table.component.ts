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
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import {
  resolveInspectionTag,
  type InspectionOutput,
  type InspectionSortField,
} from '@features/organization/features/inspections/models';
import { EmptyState, Tag, type TagDescriptor } from '@shared/components';

/**
 * Sort request emitted alongside pagination — mirrors the API's
 * single-field `order[field]` contract (only one field wins server-side).
 *
 * @since 1.0.0
 */
export interface ComplianceInspectionTableQuery {
  readonly page: number;
  readonly itemsPerPage: number;
  readonly search?: string;
  readonly order?: Readonly<Partial<Record<InspectionSortField, 'asc' | 'desc'>>>;
}

/**
 * Component ComplianceInspectionTable
 * @class ComplianceInspectionTable
 *
 * @description
 * Server-paginated table for the Compliance page's Inspections tab.
 * Presentational — page/sort requests are emitted for the page's store to
 * fulfil (ARCHITECTURE §9.3).
 *
 * `Ref` has no backend reference-code field on `InspectionOutput`: it renders
 * a shortened id instead, matching the same fallback used on the
 * Non-conformities tab.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-compliance-inspection-table
 *   [rows]="store.queryData()?.member ?? []"
 *   [total]="store.queryData()?.totalItems ?? 0"
 *   [loading]="store.isQueryLoading()"
 *   (queryChange)="onInspectionsQueryChange($event)"
 *   (view)="openInspection($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance-inspection-table',
  imports: [DatePipe, EmptyState, FormsModule, InputTextModule, SkeletonModule, TableModule, Tag],
  templateUrl: './compliance-inspection-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceInspectionTable {
  //#region Inputs
  /** Inspection rows for the current page. */
  public readonly rows: InputSignal<readonly InspectionOutput[]> = input.required();

  /** Total inspections matching the current query. */
  public readonly total: InputSignal<number> = input.required<number>();

  /** Whether the current page is loading. */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** Emits normalized pagination and sort requests. */
  public readonly queryChange: OutputEmitterRef<ComplianceInspectionTableQuery> =
    output<ComplianceInspectionTableQuery>();

  /** Requests navigation to the activated inspection's detail page. */
  public readonly view: OutputEmitterRef<InspectionOutput> = output<InspectionOutput>();
  //#endregion

  //#region Properties
  /** Rows per page. */
  protected readonly pageSize: number = 10;

  /** Placeholder rows rendered while the first page loads. */
  protected readonly skeletonItems: undefined[] = Array(this.pageSize);

  /** A mutable copy for `p-table`, whose `value` input is not readonly. */
  protected readonly mutableRows: Signal<InspectionOutput[]> = computed(() => [...this.rows()]);

  /** Draft free-text search value. */
  protected readonly search: WritableSignal<string> = signal<string>('');

  /** Last lazy-load event, replayed when the search filter changes. */
  private lastEvent: TableLazyLoadEvent = { first: 0, rows: this.pageSize };
  //#endregion

  //#region Methods
  /** Resolves the status badge descriptor for an inspection. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInspectionTag('status', status);
  }

  /** Shortened, uppercased id fallback shown as `Ref` — see class docblock. */
  protected shortRef(id: string): string {
    return `#${id.slice(0, 8).toUpperCase()}`;
  }

  /** Re-runs the query on the first page with the current search value. */
  protected onFilterChange(): void {
    this.emitQuery({ ...this.lastEvent, first: 0 });
  }

  /** Translates a PrimeNG lazy-load event into a page + single-field sort request. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.emitQuery(event);
  }

  /** Builds and emits {@link ComplianceInspectionTableQuery} from a lazy-load event. */
  private emitQuery(event: TableLazyLoadEvent): void {
    this.lastEvent = event;

    const first: number = event.first ?? 0;
    const itemsPerPage: number = event.rows ?? this.pageSize;
    const page: number = Math.floor(first / itemsPerPage) + 1;
    const sortField: string | null | undefined = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;

    const order: Partial<Record<InspectionSortField, 'asc' | 'desc'>> | undefined =
      sortField && event.sortOrder
        ? { [sortField as InspectionSortField]: event.sortOrder === 1 ? 'asc' : 'desc' }
        : undefined;

    const trimmedSearch: string = this.search().trim();

    this.queryChange.emit({
      page,
      itemsPerPage,
      search: trimmedSearch === '' ? undefined : trimmedSearch,
      order,
    });
  }
  //#endregion
}
