import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilityNextInspectionMetric
 * @class FacilityNextInspectionMetric
 *
 * @description
 * KPI metric card displaying the day countdown until the next upcoming
 * inspection for the active facility, with the target date as subtitle.
 * Reads from the component-scoped {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-next-inspection-metric',
  imports: [MetricCard, DatePipe],
  templateUrl: './facility-next-inspection-metric.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityNextInspectionMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing the next-inspection metric.
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
