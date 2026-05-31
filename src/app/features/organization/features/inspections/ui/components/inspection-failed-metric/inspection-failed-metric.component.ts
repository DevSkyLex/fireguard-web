import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
} from '@angular/core';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { MetricCard } from '@shared/components';

/**
 * Component InspectionFailedMetric
 * @class InspectionFailedMetric
 *
 * @description
 * Metric card wrapper displaying the number of inspections with a failing
 * result, derived from the loaded items in the page-scoped
 * {@link InspectionStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-failed-metric',
  templateUrl: './inspection-failed-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionFailedMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped InspectionStore providing the loaded inspections.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Count of loaded inspections whose result is `fail`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () =>
      this.store
        .inspections()
        .filter((inspection: InspectionOutput) => inspection.result === 'fail').length,
  );
  //#endregion
}
