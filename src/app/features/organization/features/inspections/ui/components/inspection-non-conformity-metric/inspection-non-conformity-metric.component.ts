import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { MetricCard } from '@shared/components';

/**
 * Component InspectionNonConformityMetric
 * @class InspectionNonConformityMetric
 *
 * @description
 * Metric card wrapper displaying the total number of open non-conformities,
 * read from the server-reported total in the page-scoped
 * {@link InspectionStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-non-conformity-metric',
  templateUrl: './inspection-non-conformity-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionNonConformityMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped InspectionStore providing the non-conformity totals.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);
  //#endregion
}
