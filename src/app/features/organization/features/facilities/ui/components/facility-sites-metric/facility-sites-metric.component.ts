import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilitySitesMetric
 * @class FacilitySitesMetric
 *
 * @description
 * Metric card wrapper displaying the total number of top-level facilities
 * (sites) for the current organization. Reads the server-reported total
 * directly from the page-scoped {@link FacilityStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-sites-metric',
  templateUrl: './facility-sites-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitySitesMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped FacilityStore providing the root facility totals.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore = inject<FacilityStore>(FacilityStore);
  //#endregion
}
