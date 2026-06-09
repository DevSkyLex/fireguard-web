import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import { MetricCard } from '@shared/components';

/**
 * Component OrganizationMembersMetric
 * @class OrganizationMembersMetric
 *
 * @description
 * Metric card wrapper displaying the cumulative member count across the loaded
 * organizations in the page-scoped {@link OrganizationStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-members-metric',
  templateUrl: './organization-members-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMembersMetric {
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
   * Sum of member counts across all loaded organizations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(() =>
    this.store
      .organizations()
      .reduce(
        (total: number, organization: OrganizationOutput) => total + organization.memberCount,
        0,
      ),
  );
  //#endregion
}
