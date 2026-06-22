import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilityEquipmentsMetric
 * @class FacilityEquipmentsMetric
 *
 * @description
 * KPI metric card displaying the total equipment count for the active
 * facility, with the number of items needing attention as subtitle.
 * Reads from the component-scoped {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-equipments-metric',
  imports: [MetricCard],
  templateUrl: './facility-equipments-metric.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityEquipmentsMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing the equipment metrics.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityOverviewStore}
   */
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject<FacilityOverviewStore>(FacilityOverviewStore);
  //#endregion
}
