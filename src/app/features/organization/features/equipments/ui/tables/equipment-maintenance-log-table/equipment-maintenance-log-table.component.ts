import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { EquipmentMaintenanceLogOutput } from '@features/organization/features/equipments/models';
import { EmptyState } from '@shared/empty-state';
import { TABLE_CARD_SHELL_PT, TABLE_CARD_SHELL_STYLE_CLASS } from '@shared/table-card-shell';
import { type TagDescriptor } from '@shared/tag';

/**
 * Read-only table presenting equipment maintenance log entries.
 */
@Component({
  selector: 'app-equipment-maintenance-log-table',
  imports: [CardModule, DatePipe, EmptyState, SkeletonModule, TableModule, TagModule],
  templateUrl: './equipment-maintenance-log-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentMaintenanceLogTable {
  /** Maintenance log entries to display. */
  public readonly logs: InputSignal<readonly EquipmentMaintenanceLogOutput[]> = input.required();
  /** Whether maintenance log entries are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
  /** Shared card-shell `styleClass` so this table reads like every other carded table. */
  protected readonly cardStyleClass: string = TABLE_CARD_SHELL_STYLE_CLASS;
  /** Shared card-shell pass-through options (flush body, bordered header row). */
  protected readonly cardPt: CardPassThroughOptions = TABLE_CARD_SHELL_PT;
  /** Badge descriptor for a completed maintenance event. */
  protected readonly completedDescriptor: TagDescriptor = {
    label: $localize`:@@equipment.maint.completed:Completed`,
    severity: 'success',
    icon: 'pi pi-check-circle',
  };
  /** Badge descriptor for an in-progress maintenance event. */
  protected readonly activeDescriptor: TagDescriptor = {
    label: $localize`:@@equipment.maint.active:Active`,
    severity: 'warn',
    icon: 'pi pi-wrench',
  };
}
