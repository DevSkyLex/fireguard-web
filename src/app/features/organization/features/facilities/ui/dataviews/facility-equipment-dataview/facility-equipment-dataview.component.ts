import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DataViewModule, type DataViewPassThroughOptions } from 'primeng/dataview';
import { SkeletonModule } from 'primeng/skeleton';
import {
  resolveEquipmentTag,
  type EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import { Tag, type TagDescriptor } from '@shared/components';

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
  imports: [CardModule, DataViewModule, SkeletonModule, Tag],
  templateUrl: './facility-equipment-dataview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentDataview {
  //#region Properties
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject<FacilityOverviewStore>(FacilityOverviewStore);

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

  //#endregion

  //#region Methods
  /**
   * Resolves the status badge descriptor for an equipment row.
   *
   * @param {string} status - Equipment lifecycle status.
   * @returns {TagDescriptor} Matching status descriptor.
   */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveEquipmentTag('status', status);
  }
  //#endregion
}
