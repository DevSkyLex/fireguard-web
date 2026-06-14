import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
  output,
  signal,
  viewChild,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { Menu, MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule, type TableLazyLoadEvent, type TablePassThroughOptions } from 'primeng/table';
import type {
  ChecklistListOptions,
  ChecklistOutput,
  ChecklistStatus,
} from '@features/organization/features/checklists/models';
import { EmptyState } from '@shared/components';

/**
 * Paginated checklist table with status filtering and contextual actions.
 */
@Component({
  selector: 'app-checklist-table',
  imports: [
    ButtonModule,
    CardModule,
    DatePipe,
    EmptyState,
    MenuModule,
    ReactiveFormsModule,
    SelectModule,
    SkeletonModule,
    SplitButtonModule,
    TableModule,
  ],
  templateUrl: './checklist-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistTable {
  /** Checklist rows to display. */
  public readonly checklists: InputSignal<readonly ChecklistOutput[]> = input.required();
  /** Server-reported checklist count. */
  public readonly total: InputSignal<number> = input.required();
  /** Whether checklist rows are loading. */
  public readonly loading: InputSignal<boolean> = input.required();
  /** Whether the current checklist query is empty. */
  public readonly empty: InputSignal<boolean> = input.required();
  /** Whether the active member can manage checklists. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Initial page bound from the route query parameter. */
  public readonly initialPage: InputSignalWithTransform<number, unknown> = input(1, {
    transform: (value: unknown): number => Math.max(1, numberAttribute(value, 1)),
  });

  /** Emits checklist list requests. */
  public readonly load: OutputEmitterRef<ChecklistListOptions> = output();
  /** Emits user-driven page changes. */
  public readonly pageChange: OutputEmitterRef<number> = output();
  /** Emits checklist creation requests. */
  public readonly add: OutputEmitterRef<void> = output();
  /** Emits a checklist selected for detail display. */
  public readonly view: OutputEmitterRef<ChecklistOutput> = output();
  /** Emits a checklist selected for archival. */
  public readonly archive: OutputEmitterRef<ChecklistOutput> = output();

  /** Number of rows rendered per page. */
  protected readonly rows = 12;
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(this.rows);
  /** Offset of the first displayed checklist. */
  protected readonly first: WritableSignal<number> = signal(0);
  /** Active checklist status filter. */
  protected readonly statusControl = new FormControl<ChecklistStatus | null>(null);
  /** Supported checklist status filter options. */
  protected readonly statusOptions = [
    { label: 'Active', value: 'active' as const, icon: PrimeIcons.CHECK_CIRCLE, color: '#22c55e' },
    { label: 'Archived', value: 'archived' as const, icon: PrimeIcons.BOX, color: '#64748b' },
  ];
  /** PrimeNG pass-through configuration for the table card. */
  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class: 'h-full flex flex-col border border-surface-200 dark:border-surface-800 shadow-none',
    },
    body: { class: 'p-0 flex flex-col flex-1 min-h-0' },
  };
  /** PrimeNG pass-through configuration for the table. */
  protected readonly tablePt: Signal<TablePassThroughOptions> = computed(
    (): TablePassThroughOptions => ({
      root: { class: 'flex min-h-0 flex-1 flex-col' },
      tableContainer: { class: 'flex-1 min-h-0 rounded-b-xl overflow-hidden' },
      table: { class: 'text-sm' },
      header: { class: 'border-0 p-0' },
      pcPaginator: {
        root: {
          class:
            'mt-auto rounded-t-none rounded-b-2xl bg-surface-0 dark:bg-surface-900 justify-end' +
            (this.total() === 0 ? ' hidden' : ''),
        },
      },
    }),
  );
  /** Read-only toolbar actions. */
  protected readonly toolbarActions: Signal<MenuItem[]> = computed(() => [
    { label: 'Refresh', icon: PrimeIcons.REFRESH, command: () => this.reload() },
    { label: 'Clear filters', icon: PrimeIcons.FILTER_SLASH, command: () => this.clearFilters() },
  ]);
  /** Contextual actions for the selected checklist. */
  protected readonly actionMenuItems: Signal<MenuItem[]> = computed(() => {
    const checklist = this.selectedChecklist();
    if (!checklist) return [];
    return [
      { label: 'View', icon: PrimeIcons.EYE, command: () => this.view.emit(checklist) },
      ...(this.canManage() && checklist.status === 'active'
        ? [{ label: 'Archive', icon: PrimeIcons.BOX, command: () => this.archive.emit(checklist) }]
        : []),
    ];
  });

  /** PrimeNG action menu instance. */
  private readonly actionMenu: Signal<Menu> = viewChild.required<Menu>('actionMenu');
  /** Checklist selected for contextual actions. */
  private readonly selectedChecklist: WritableSignal<ChecklistOutput | null> = signal(null);
  /** Last lazy-load event used by refresh operations. */
  private readonly lastEvent: WritableSignal<TableLazyLoadEvent | null> = signal(null);
  /** Whether the table has processed its first lazy-load event. */
  private initialized = false;

  /** Reloads the table whenever the status filter changes. */
  public constructor() {
    this.statusControl.valueChanges.subscribe(() => this.reload());
  }

  /** Converts a PrimeNG lazy-load event into checklist list options. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    const first = event.first ?? 0;
    const rows = event.rows ?? this.rows;
    const page = Math.floor(first / rows) + 1;
    this.first.set(first);
    this.lastEvent.set(event);
    this.load.emit({
      page,
      itemsPerPage: rows,
      ...(this.statusControl.value ? { status: this.statusControl.value } : {}),
    });
    if (this.initialized) this.pageChange.emit(page);
    this.initialized = true;
  }

  /** Opens contextual actions for one checklist. */
  protected toggleActions(event: MouseEvent, checklist: ChecklistOutput): void {
    this.selectedChecklist.set(checklist);
    this.actionMenu().toggle(event);
  }

  /** Clears all checklist filters and reloads the first page. */
  protected clearFilters(): void {
    this.statusControl.setValue(null, { emitEvent: false });
    this.reload();
  }

  /** Reloads the first checklist page using the current filters. */
  protected reload(): void {
    this.first.set(0);
    this.onLazyLoad({ ...this.lastEvent(), first: 0, rows: this.rows });
  }
}
