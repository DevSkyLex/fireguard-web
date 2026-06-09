import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { MetricCard } from '@shared/components';

/**
 * Component EquipmentInStockMetric
 * @class EquipmentInStockMetric
 *
 * @description
 * Metric card wrapper displaying the number of equipment items currently held
 * in stock, derived from the loaded items in the page-scoped
 * {@link EquipmentStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-in-stock-metric',
  templateUrl: './equipment-in-stock-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentInStockMetric {
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
   * Count of loaded equipment whose status is `in_stock`.
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
        .filter((equipment: EquipmentOutput) => equipment.status === 'in_stock').length,
  );
  //#endregion
}
