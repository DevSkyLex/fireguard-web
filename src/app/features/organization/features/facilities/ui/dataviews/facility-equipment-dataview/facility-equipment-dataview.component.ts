import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DataViewModule, type DataViewPassThroughOptions } from 'primeng/dataview';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import type { EquipmentOutput, EquipmentStatus } from '@features/organization/features/equipments/models';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';

/**
 * Component FacilityEquipmentDataview
 * @class FacilityEquipmentDataview
 *
 * @description
 * Facility overview equipment list rendered with PrimeNG DataView.
 * Reads compact overview data from the component-scoped FacilityOverviewStore.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-equipment-dataview',
  imports: [CardModule, DataViewModule, SkeletonModule, TagModule],
  templateUrl: './facility-equipment-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentDataview {
  //#region Properties
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject(FacilityOverviewStore);

  protected readonly equipment: Signal<ReadonlyArray<EquipmentOutput>> = computed<
    ReadonlyArray<EquipmentOutput>
  >(() => this.store.equipment());

  protected readonly cardPt: CardPassThroughOptions = {
    root: {
      class:
        'h-full flex flex-col border border-surface-200 dark:border-surface-800 bg-surface-0 dark:bg-surface-950 shadow-none!',
    },
    body: {
      class: 'p-0! flex flex-col flex-1',
    },
    footer: {
      class:
        'border-t border-surface-200 dark:border-surface-800 bg-surface-50/10 dark:bg-surface-900/10 rounded-b-md',
    },
  };

  protected readonly dataviewPt: DataViewPassThroughOptions = {
    root: { class: 'flex min-h-0 flex-1 flex-col bg-surface-0 dark:bg-surface-950' },
    content: { class: 'flex-1 bg-surface-0 dark:bg-surface-950' },
    emptyMessage: { class: 'hidden' },
  };

  private readonly statusSeverities: Record<EquipmentStatus, 'secondary' | 'success' | 'warn' | 'danger'> = {
    in_stock: 'secondary',
    operational: 'success',
    under_maintenance: 'warn',
    decommissioned: 'danger',
  };

  private readonly statusLabels: Record<EquipmentStatus, string> = {
    in_stock: 'In stock',
    operational: 'Operational',
    under_maintenance: 'Maintenance',
    decommissioned: 'Decommissioned',
  };
  //#endregion

  //#region Methods
  protected getStatusLabel(status: EquipmentStatus): string {
    return this.statusLabels[status];
  }

  protected getStatusSeverity(
    status: EquipmentStatus,
  ): 'secondary' | 'success' | 'warn' | 'danger' {
    return this.statusSeverities[status];
  }
  //#endregion
}
