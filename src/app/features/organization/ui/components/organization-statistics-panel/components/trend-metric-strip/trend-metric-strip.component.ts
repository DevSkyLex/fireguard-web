import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import type { DashboardSummaryMetric } from '../../models';

/**
 * Component TrendMetricStrip
 * @class TrendMetricStrip
 *
 * @description
 * Metrics band rendered above a dashboard trend chart: one cell per metric with
 * its value and optional period-over-period delta. The delta pairs its arrow
 * with `sr-only` text so the direction is never conveyed by colour alone.
 *
 * @example
 * ```html
 * <app-trend-metric-strip [metrics]="summaryMetrics()" [loading]="isLoading()" />
 * ```
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-trend-metric-strip',
  imports: [SkeletonModule],
  templateUrl: './trend-metric-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendMetricStrip {
  //#region Inputs
  /**
   * Property metrics
   * @readonly
   *
   * @description
   * Metrics to render, in display order. An empty list hides the strip unless
   * {@link loading} is set.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly DashboardSummaryMetric[]>}
   */
  public readonly metrics: InputSignal<readonly DashboardSummaryMetric[]> = input<
    readonly DashboardSummaryMetric[]
  >([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether to render placeholder cells instead of the resolved metrics.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion
}
