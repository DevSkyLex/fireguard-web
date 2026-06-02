import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MetricCard } from '@shared/components';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';

/**
 * Component FacilityOverdueInspectionsMetric
 * @class FacilityOverdueInspectionsMetric
 *
 * @description
 * KPI metric card displaying the number of inspections past their due
 * date for the active facility. Reads from the component-scoped
 * {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-overdue-inspections-metric',
  imports: [MetricCard],
  templateUrl: './facility-overdue-inspections-metric.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityOverdueInspectionsMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing the overdue count.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityOverviewStore}
   */
  protected readonly store: InstanceType<typeof FacilityOverviewStore> =
    inject(FacilityOverviewStore);
  //#endregion
}
