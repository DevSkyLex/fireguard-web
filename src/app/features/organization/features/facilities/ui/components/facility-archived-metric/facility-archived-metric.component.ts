import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilityArchivedMetric
 * @class FacilityArchivedMetric
 *
 * @description
 * Metric card wrapper displaying the number of archived root facilities,
 * derived from the loaded items in the page-scoped {@link FacilityStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-archived-metric',
  templateUrl: './facility-archived-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityArchivedMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped FacilityStore providing the loaded root facilities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore = inject<FacilityStore>(FacilityStore);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Count of loaded root facilities whose status is `archived`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () =>
      this.store
        .rootFacilities()
        .filter((facility: FacilityOutput) => facility.status === 'archived').length,
  );
  //#endregion
}
