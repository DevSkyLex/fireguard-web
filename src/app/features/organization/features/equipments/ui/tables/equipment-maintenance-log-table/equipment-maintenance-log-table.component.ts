import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import type { EquipmentMaintenanceLogOutput } from '@features/organization/features/equipments/models';

/**
 * Read-only table presenting equipment maintenance log entries.
 */
@Component({
  selector: 'app-equipment-maintenance-log-table',
  imports: [DatePipe, SkeletonModule, TableModule, TagModule],
  templateUrl: './equipment-maintenance-log-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentMaintenanceLogTable {
  /** Maintenance log entries to display. */
  public readonly logs: InputSignal<readonly EquipmentMaintenanceLogOutput[]> = input.required();
  /** Whether maintenance log entries are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(4);
}
