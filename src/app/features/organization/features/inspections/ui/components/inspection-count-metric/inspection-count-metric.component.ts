import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { MetricCard } from '@shared/components';

/**
 * Component InspectionCountMetric
 * @class InspectionCountMetric
 *
 * @description
 * Metric card wrapper displaying the total number of recorded inspections,
 * read from the server-reported total in the page-scoped
 * {@link InspectionStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-count-metric',
  templateUrl: './inspection-count-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionCountMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped InspectionStore providing the inspection totals.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);
  //#endregion
}
