import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type Signal,
} from '@angular/core';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { MetricCard } from '@shared/components';

/**
 * Component OrganizationActiveMetric
 * @class OrganizationActiveMetric
 *
 * @description
 * Metric card wrapper displaying the number of currently active organizations,
 * derived from the loaded items in the page-scoped {@link OrganizationStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-active-metric',
  templateUrl: './organization-active-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationActiveMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped OrganizationStore providing the loaded organizations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {OrganizationStore}
   */
  protected readonly store: OrganizationStore = inject<OrganizationStore>(OrganizationStore);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Count of loaded organizations that are currently active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () =>
      this.store
        .organizations()
        .filter((organization: OrganizationOutput) => organization.isActive).length,
  );
  //#endregion
}
