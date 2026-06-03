import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
} from '@angular/core';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { MetricCard } from '@shared/components';

/**
 * Component EquipmentCommissionedMetric
 * @class EquipmentCommissionedMetric
 *
 * @description
 * Metric card wrapper displaying the number of operational equipment items,
 * derived from the loaded items in the page-scoped {@link EquipmentStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-commissioned-metric',
  templateUrl: './equipment-commissioned-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCommissionedMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped EquipmentStore providing the loaded equipment items.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Count of loaded equipment whose status is `operational`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () =>
      this.store
        .equipmentList()
        .filter((equipment: EquipmentOutput) => equipment.status === 'operational').length,
  );
  //#endregion
}
