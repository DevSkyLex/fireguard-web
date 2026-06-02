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
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import type { RequestOptions } from '@core/services/hydra-api';
import type {
  EquipmentOutput,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';

interface EquipmentStatusOption {
  readonly label: string;
  readonly value: EquipmentStatus;
}

/**
 * Table view for equipment collections.
 */
@Component({
  selector: 'app-equipment-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './equipment-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentTable implements OnInit {
  public readonly equipments: InputSignal<readonly EquipmentOutput[]> =
    input.required<readonly EquipmentOutput[]>();

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

  protected readonly statusOptions: EquipmentStatusOption[] = [
    { label: 'In Stock', value: 'in_stock' },
    { label: 'Commissioned', value: 'commissioned' },
    { label: 'Maintenance', value: 'under_maintenance' },
    { label: 'Decommissioned', value: 'decommissioned' },
  ];

  protected readonly searchControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  protected readonly statusControl: FormControl<EquipmentStatus | null> =
    new FormControl<EquipmentStatus | null>(null);

  protected readonly typeControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

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
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());

    this.typeControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.reload());

    this.statusControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.reload());

    effect(() => {
      if (this.loading()) {
        this.searchControl.disable({ emitEvent: false });
        this.statusControl.disable({ emitEvent: false });
        this.typeControl.disable({ emitEvent: false });
      } else {
        this.searchControl.enable({ emitEvent: false });
        this.statusControl.enable({ emitEvent: false });
        this.typeControl.enable({ emitEvent: false });
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
    const search: string = this.searchControl.value.trim();
    const type: string = this.typeControl.value.trim();
    const status: EquipmentStatus | null = this.statusControl.value;

    if (search) params['search'] = search;
    if (type) params['type'] = type;
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
    this.searchControl.setValue('', { emitEvent: false });
    this.statusControl.setValue(null, { emitEvent: false });
    this.typeControl.setValue('', { emitEvent: false });
    this.reload();
  }

  protected getEquipmentTitle(equipment: EquipmentOutput): string {
    const typeLabel: string = this.toDisplayLabel(equipment.type);
    const subTypeLabel: string = this.toDisplayLabel(equipment.subType);

    return subTypeLabel ? `${typeLabel} / ${subTypeLabel}` : typeLabel;
  }

  protected getReference(equipment: EquipmentOutput): string {
    return [equipment.brand, equipment.model].filter(Boolean).join(' ').trim() || 'No reference';
  }

  protected getStatusLabel(status: EquipmentStatus): string {
    return this.toDisplayLabel(status);
  }

  protected getStatusSeverity(
    status: EquipmentStatus,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    switch (status) {
      case 'commissioned':
        return 'success';
      case 'in_stock':
        return 'info';
      case 'under_maintenance':
        return 'warn';
      case 'decommissioned':
        return 'danger';
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
