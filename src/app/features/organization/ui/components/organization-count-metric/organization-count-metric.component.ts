import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OrganizationStore } from '@features/organization/state';
import { MetricCard } from '@shared/components';

/**
 * Component OrganizationCountMetric
 * @class OrganizationCountMetric
 *
 * @description
 * Metric card wrapper displaying the total number of accessible organizations,
 * read from the server-reported total in the page-scoped
 * {@link OrganizationStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-count-metric',
  templateUrl: './organization-count-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationCountMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped OrganizationStore providing the organization totals.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationStore}
   */
  protected readonly store: OrganizationStore = inject<OrganizationStore>(OrganizationStore);
  //#endregion
}
