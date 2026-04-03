import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { Card } from '@shared/components';

/**
 * Type OrganizationDashboardMetricCardComparison
 *
 * @description
 * Scalar delta shown below the KPI value when a previous-period
 * comparison is available. Combines the human-readable formatted
 * value (e.g. `"+3"`) with the direction indicator returned by
 * the backend (`"up"` | `"down"`).
 */
export type OrganizationDashboardMetricCardComparison = {
  readonly value: string | number | null;
  readonly direction: string | number | null;
};

/**
 * Component OrganizationDashboardMetricCard
 * @class OrganizationDashboardMetricCard
 *
 * @description
 * Reusable KPI metric card for the organization dashboard.
 * Displays a title, description, a KPI value and an optional
 * comparison delta badge (up/down arrow + formatted difference).
 * Shows a skeleton while loading.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-metric-card',
  templateUrl: './organization-dashboard-metric-card.component.html',
  imports: [Card, SkeletonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardMetricCard {
  //#region Inputs
  /**
   * Input title
   *
   * @description
   * Card heading displayed in the PrimeNG card header.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> =
    input.required<string>();

  /**
   * Input description
   *
   * @description
   * Subtitle shown below the card heading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly description: InputSignal<string> =
    input.required<string>();

  /**
   * Input value
   *
   * @description
   * KPI value to display. Rendered as `—` when null.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | number | null>}
   */
  public readonly value: InputSignal<string | number | null> =
    input.required<string | number | null>();

  /**
   * Input loading
   *
   * @description
   * When true, a skeleton placeholder is
   * shown instead of the value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> =
    input<boolean>(false);

  /**
   * Input comparison
   *
   * @description
   * Optional previous-period comparison delta. When non-null, an
   * up/down badge is rendered next to the KPI value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<OrganizationDashboardMetricCardComparison | null>}
   */
  public readonly comparison: InputSignal<OrganizationDashboardMetricCardComparison | null> =
    input<OrganizationDashboardMetricCardComparison | null>(null);
  //#endregion
}
