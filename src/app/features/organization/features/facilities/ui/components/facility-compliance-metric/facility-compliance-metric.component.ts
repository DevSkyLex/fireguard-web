import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FacilityOverviewStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilityComplianceMetric
 * @class FacilityComplianceMetric
 *
 * @description
 * KPI metric card displaying the facility inspection compliance (pass)
 * rate. Reads derived metrics from the component-scoped
 * {@link FacilityOverviewStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-compliance-metric',
  imports: [MetricCard],
  templateUrl: './facility-compliance-metric.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityComplianceMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped overview store providing the compliance metric.
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
