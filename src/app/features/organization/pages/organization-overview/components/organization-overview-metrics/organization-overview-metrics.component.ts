import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
} from '@angular/core';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import type { OverviewHeadlineMetric } from '../../organization-overview.types';

/**
 * Component OrganizationOverviewMetricsComponent
 * @class OrganizationOverviewMetricsComponent
 *
 * @description
 * Presentational KPI strip for the organization overview page.
 * Displays either skeleton placeholders or the derived headline
 * metrics prepared by the parent smart component.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-metrics',
  host: {
    style: 'display: contents',
  },
  imports: [
    CardModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './organization-overview-metrics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewMetricsComponent {
  //#region Inputs
  /**
   * Input metrics
   * @readonly
   *
   * @description
   * KPI cards to display in the headline strip.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewHeadlineMetric[]>}
   */
  public readonly metrics: InputSignal<readonly OverviewHeadlineMetric[]> =
    input.required<readonly OverviewHeadlineMetric[]>();

  /**
   * Input showSkeleton
   * @readonly
   *
   * @description
   * Whether skeleton placeholders should be rendered instead of
   * the actual metric cards.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showSkeleton: InputSignal<boolean> =
    input<boolean>(false);
  //#endregion
}
