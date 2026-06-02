import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  numberAttribute,
  OnInit,
  output,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { RequestOptions } from '@core/services/hydra-api';
import type {
  InspectionOutput,
  InspectionResult,
  InspectionStatus,
} from '@features/organization/features/inspections/models';

interface InspectionFilterOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

/**
 * Table view for inspection collections.
 */
@Component({
  selector: 'app-inspection-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './inspection-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionTable implements OnInit {
  public readonly inspections: InputSignal<readonly InspectionOutput[]> =
    input.required<readonly InspectionOutput[]>();

  public readonly total: InputSignal<number> = input.required<number>();

  public readonly loading: InputSignal<boolean> = input.required<boolean>();

  public readonly empty: InputSignal<boolean> = input.required<boolean>();

  public readonly initialPage: InputSignalWithTransform<number, unknown> = input<number, unknown>(
    1,
    { transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)) },
  );

  public readonly load: OutputEmitterRef<RequestOptions> = output<RequestOptions>();

  public readonly pageChange: OutputEmitterRef<number> = output<number>();

  public readonly add: OutputEmitterRef<void> = output<void>();

  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1 min-h-0',
    },
  };

  protected readonly tablePt: TablePassThroughOptions = {
    root: {
      class: 'flex min-h-0 flex-1 flex-col',
    },
    tableContainer: {
      class: 'flex-1 min-h-0',
    },
    table: {
      class: 'text-sm',
    },
    header: {
      class: 'border-0 p-0 bg-surface-0 dark:bg-surface-950',
    },
    pcPaginator: {
      root: {
        class:
          'mt-auto rounded-none border-t border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-950 justify-end',
      },
    },
  };

  protected readonly rows: number = 12;

  protected readonly skeletonItems: undefined[] = Array(this.rows);

  protected readonly resultOptions: InspectionFilterOption<InspectionResult>[] = [
    { label: 'Pass', value: 'pass' },
    { label: 'Partial', value: 'partial' },
    { label: 'Fail', value: 'fail' },
  ];

  protected readonly statusOptions: InspectionFilterOption<InspectionStatus>[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Closed', value: 'closed' },
  ];

  protected readonly resultControl: FormControl<InspectionResult | null> =
    new FormControl<InspectionResult | null>(null);

  protected readonly statusControl: FormControl<InspectionStatus | null> =
    new FormControl<InspectionStatus | null>(null);

  protected readonly toolbarActions: Signal<MenuItem[]> = computed((): MenuItem[] => [
    {
      label: 'Refresh',
      icon: PrimeIcons.REFRESH,
      command: (): void => this.onRefresh(),
    },
    {
      label: 'Clear filters',
      icon: PrimeIcons.FILTER_SLASH,
      command: (): void => this.onClearFilters(),
    },
  ]);

  protected firstPage: number = 0;

  private initialized: boolean = false;

  private readonly lastLazyEvent: WritableSignal<TableLazyLoadEvent | null> =
    signal<TableLazyLoadEvent | null>(null);

  public constructor() {
    this.resultControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());
    this.statusControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    effect(() => {
      if (this.loading()) {
        this.resultControl.disable({ emitEvent: false });
        this.statusControl.disable({ emitEvent: false });
      } else {
        this.resultControl.enable({ emitEvent: false });
        this.statusControl.enable({ emitEvent: false });
      }
    });
  }

  public ngOnInit(): void {
    this.firstPage = (this.initialPage() - 1) * this.rows;
  }

  public onLazyLoad(event: TableLazyLoadEvent): void {
    this.lastLazyEvent.set(event);

    const first: number = event.first ?? 0;
    const rowsPerPage: number = event.rows ?? this.rows;
    const page: number = Math.floor(first / rowsPerPage) + 1;
    const params: Record<string, string | number | boolean> = {};
    const result: InspectionResult | null = this.resultControl.value;
    const status: InspectionStatus | null = this.statusControl.value;

    if (result) params['result'] = result;
    if (status) params['status'] = status;
    this.appendSortParams(params, event);

    this.load.emit({
      page,
      itemsPerPage: rowsPerPage,
      params,
    });

    if (this.initialized) {
      this.pageChange.emit(page);
    }
    this.initialized = true;
  }

  protected onRefresh(): void {
    this.reload();
  }

  protected onClearFilters(): void {
    this.resultControl.setValue(null, { emitEvent: false });
    this.statusControl.setValue(null, { emitEvent: false });
    this.reload();
  }

  protected getInspectorContextLabel(inspection: InspectionOutput): string {
    const inspectorType: string = this.toDisplayLabel(inspection.inspectorType);

    return inspection.inspectorOrganizationName
      ? `${inspectorType} - ${inspection.inspectorOrganizationName}`
      : `${inspectorType} inspector`;
  }

  protected getResultLabel(result: InspectionResult): string {
    return this.toDisplayLabel(result);
  }

  protected getStatusLabel(status: InspectionStatus): string {
    return this.toDisplayLabel(status);
  }

  protected getFindingsLabel(count: number): string {
    return `${count} finding${count > 1 ? 's' : ''}`;
  }

  protected getResultSeverity(
    result: InspectionResult,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (result) {
      case 'pass':
        return 'success';
      case 'fail':
        return 'danger';
      case 'partial':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  protected getStatusSeverity(
    status: InspectionStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'draft':
        return 'info';
      case 'submitted':
        return 'warn';
      case 'closed':
        return 'secondary';
      default:
        return 'secondary';
    }
  }

  private reload(): void {
    const event: TableLazyLoadEvent = this.lastLazyEvent() ?? {
      first: 0,
      rows: this.rows,
    };

    this.onLazyLoad({
      ...event,
      first: 0,
      rows: event.rows ?? this.rows,
    });
  }

  private appendSortParams(
    params: Record<string, string | number | boolean>,
    event: TableLazyLoadEvent,
  ): void {
    const sortField: string | null | undefined = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField;

    if (!sortField || !event.sortOrder) {
      return;
    }

    params[`order[${sortField}]`] = event.sortOrder === 1 ? 'asc' : 'desc';
  }

  private toDisplayLabel(value: string | null | undefined): string {
    if (!value) return '';

    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((token: string) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }
}
