import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { MetricCard } from '@shared/components';

/**
 * Component EquipmentCountMetric
 * @class EquipmentCountMetric
 *
 * @description
 * Metric card wrapper displaying the total number of tracked equipment
 * assets, read from the server-reported total in the page-scoped
 * {@link EquipmentStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-count-metric',
  templateUrl: './equipment-count-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentCountMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped EquipmentStore providing the equipment totals.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);
  //#endregion
}
