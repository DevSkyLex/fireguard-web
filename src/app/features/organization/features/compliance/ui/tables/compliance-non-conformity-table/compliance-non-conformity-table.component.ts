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
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule, type TableLazyLoadEvent } from 'primeng/table';
import {
  inspectionTagOptions,
  resolveInspectionTag,
  type NonConformityOutput,
  type OrganizationNonConformitySortField,
} from '@features/organization/features/inspections/models';
import { EmptyState, Tag, type TagDescriptor, type TagOption } from '@shared/components';

/**
 * Filter, sort, and pagination request emitted by the table. Only one
 * `order` field wins server-side, matching the API's `order[field]`
 * contract.
 *
 * @since 1.0.0
 */
export interface ComplianceNonConformityTableQuery {
  readonly page: number;
  readonly itemsPerPage: number;
  readonly severity?: NonConformityOutput['severity'];
  readonly status?: NonConformityOutput['status'];
  readonly search?: string;
  readonly order?: Readonly<Partial<Record<OrganizationNonConformitySortField, 'asc' | 'desc'>>>;
}

/**
 * Component ComplianceNonConformityTable
 * @class ComplianceNonConformityTable
 *
 * @description
 * Server-paginated table for the Compliance page's Non-conformities tab,
 * across every inspection of the organization. Presentational — filter, sort
 * and page requests are emitted for the page's store to fulfil
 * (ARCHITECTURE §9.3).
 *
 * `Ref` has no dedicated reference-code field on `NonConformityOutput`: it
 * renders a shortened, uppercased id instead — the documented fallback,
 * distinct from the `Equipment` column's serial number.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-compliance-non-conformity-table
 *   [rows]="store.queryData()?.member ?? []"
 *   [total]="store.queryData()?.totalItems ?? 0"
 *   [loading]="store.isQueryLoading()"
 *   (queryChange)="onNonConformitiesQueryChange($event)"
 *   (view)="openInspection($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-compliance-non-conformity-table',
  imports: [
    EmptyState,
    FormsModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    Tag,
  ],
  templateUrl: './compliance-non-conformity-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComplianceNonConformityTable {
  //#region Inputs
  /** Non-conformity rows for the current page. */
  public readonly rows: InputSignal<readonly NonConformityOutput[]> = input.required();

  /** Total non-conformities matching the current query. */
  public readonly total: InputSignal<number> = input.required<number>();

  /** Whether the current page is loading. */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /** Emits normalized filter, sort, and pagination requests. */
  public readonly queryChange: OutputEmitterRef<ComplianceNonConformityTableQuery> =
    output<ComplianceNonConformityTableQuery>();

  /** Requests navigation to the parent inspection's detail page. */
  public readonly view: OutputEmitterRef<NonConformityOutput> = output<NonConformityOutput>();
  //#endregion

  //#region Properties
  /** Rows per page. */
  protected readonly pageSize: number = 10;

  /** Placeholder rows rendered while the first page loads. */
  protected readonly skeletonItems: undefined[] = Array(this.pageSize);

  /** A mutable copy for `p-table`, whose `value` input is not readonly. */
  protected readonly mutableRows: Signal<NonConformityOutput[]> = computed(() => [...this.rows()]);

  /** Severity filter options, resolved from the shared inspection tag registry. */
  protected readonly severityOptions: TagOption[] = inspectionTagOptions('nonConformitySeverity');

  /** Status filter options, resolved from the shared inspection tag registry. */
  protected readonly statusOptions: TagOption[] = inspectionTagOptions('nonConformityStatus');

  /** Draft severity filter value. */
  protected readonly severity: WritableSignal<NonConformityOutput['severity'] | null> = signal<
    NonConformityOutput['severity'] | null
  >(null);

  /** Draft status filter value. */
  protected readonly status: WritableSignal<NonConformityOutput['status'] | null> = signal<
    NonConformityOutput['status'] | null
  >(null);

  /** Draft free-text search value. */
  protected readonly search: WritableSignal<string> = signal<string>('');

  /** Last lazy-load event, replayed when a filter changes. */
  private lastEvent: TableLazyLoadEvent = { first: 0, rows: this.pageSize };
  //#endregion

  //#region Methods
  /** Resolves the severity badge descriptor for a non-conformity. */
  protected severityDescriptor(severity: string): TagDescriptor {
    return resolveInspectionTag('nonConformitySeverity', severity);
  }

  /** Resolves the status badge descriptor for a non-conformity. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInspectionTag('nonConformityStatus', status);
  }

  /** Shortened, uppercased id fallback shown as `Ref` — see class docblock. */
  protected shortRef(row: NonConformityOutput): string {
    return `#${row.id.slice(0, 8).toUpperCase()}`;
  }

  /** Re-runs the query on the first page with the current filters. */
  protected onFilterChange(): void {
    this.emitQuery({ ...this.lastEvent, first: 0 });
  }

  /** Translates a PrimeNG lazy-load event into a filter/sort/page request. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.emitQuery(event);
  }

  /** Builds and emits {@link ComplianceNonConformityTableQuery} from a lazy-load event. */
  private emitQuery(event: TableLazyLoadEvent): void {
    this.lastEvent = event;

    const first: number = event.first ?? 0;
    const itemsPerPage: number = event.rows ?? this.pageSize;
    const page: number = Math.floor(first / itemsPerPage) + 1;
    const sortField: string | null | undefined = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;

    const order: Partial<Record<OrganizationNonConformitySortField, 'asc' | 'desc'>> | undefined =
      sortField && event.sortOrder
        ? {
            [sortField as OrganizationNonConformitySortField]:
              event.sortOrder === 1 ? 'asc' : 'desc',
          }
        : undefined;

    const trimmedSearch: string = this.search().trim();

    this.queryChange.emit({
      page,
      itemsPerPage,
      severity: this.severity() ?? undefined,
      status: this.status() ?? undefined,
      search: trimmedSearch === '' ? undefined : trimmedSearch,
      order,
    });
  }
  //#endregion
}
