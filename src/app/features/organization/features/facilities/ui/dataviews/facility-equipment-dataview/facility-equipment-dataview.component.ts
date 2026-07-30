import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DataViewModule, type DataViewPassThroughOptions } from 'primeng/dataview';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DATAVIEW_CARD_PT } from '@features/organization/constants';
import {
  resolveEquipmentTag,
  type EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import { EmptyState } from '@shared/empty-state';
import { type TagDescriptor } from '@shared/tag';

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
  imports: [CardModule, DataViewModule, EmptyState, SkeletonModule, TagModule],
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
    ...DATAVIEW_CARD_PT,
    root: {
      class:
        'h-full flex flex-col border border-surface-200 bg-surface-0 dark:border-surface-800 dark:bg-surface-900',
    },
  };

  protected readonly dataviewPt: DataViewPassThroughOptions = {
    root: { class: 'flex min-h-0 flex-1 flex-col bg-surface-0 dark:bg-surface-900' },
    content: { class: 'flex-1 bg-surface-0 dark:bg-surface-900' },
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
