import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
} from '@angular/core';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import { MetricCard } from '@shared/components';

/**
 * Component FacilitySubSitesMetric
 * @class FacilitySubSitesMetric
 *
 * @description
 * Metric card wrapper displaying the number of root facilities that contain
 * at least one sub-site, derived from the loaded items in the page-scoped
 * {@link FacilityStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-sub-sites-metric',
  templateUrl: './facility-sub-sites-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilitySubSitesMetric {
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
   * Count of loaded root facilities that have at least one child facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () =>
      this.store.rootFacilities().filter((facility: FacilityOutput) => facility.hasChildren).length,
  );
  //#endregion
}
