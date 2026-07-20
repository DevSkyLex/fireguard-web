import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import { buildSparklinePath, type MetricComparison } from '@shared/components';

/**
 * Component DashboardMetricCell
 * @class DashboardMetricCell
 *
 * @description
 * Single KPI cell projected inside {@link DashboardMetricStrip}.
 * Renders an icon + label line, a large tabular value and an optional
 * period-over-period comparison delta. Shows skeletons while loading.
 * The host itself paints the panel surface so the strip's 1px-gap grid
 * reads as internal dividers.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-metric-cell',
  templateUrl: './dashboard-metric-cell.component.html',
  imports: [SkeletonModule],
  host: { class: 'block min-w-0 bg-surface-0 p-5 dark:bg-surface-900' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMetricCell {
  //#region Inputs

  /**
   * Property title
   * @readonly
   *
   * @description
   * Short metric label displayed next to the icon.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class (e.g. `pi pi-building`) rendered before the label.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly icon: InputSignal<string> = input.required<string>();

  /**
   * Property value
   * @readonly
   *
   * @description
   * KPI value to display. Rendered as `—` when null.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | number | null>}
   */
  public readonly value: InputSignal<string | number | null> = input<string | number | null>(null);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Swaps the value and delta for skeleton placeholders while the
   * dashboard query is in flight.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Optional period-over-period delta (value + direction) shown under
   * the KPI value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MetricComparison | null>}
   */
  public readonly comparison: InputSignal<MetricComparison | null> = input<MetricComparison | null>(
    null,
  );

  /**
   * Property points
   * @readonly
   *
   * @description
   * Ordered series values rendered as a small sparkline under the
   * delta row. Hidden when null or holding fewer than two points.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<readonly number[] | null>}
   */
  public readonly points: InputSignal<readonly number[] | null> = input<readonly number[] | null>(
    null,
  );

  //#endregion

  //#region Properties

  /**
   * Property deltaClass
   * @readonly
   *
   * @description
   * Text-color classes for the delta row derived from the comparison
   * direction: green when up, red when down, muted otherwise.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deltaClass: Signal<string> = computed<string>(() => {
    switch (this.comparison()?.direction) {
      case 'up':
        return 'text-green-700 dark:text-green-300';
      case 'down':
        return 'text-red-700 dark:text-red-300';
      default:
        return 'text-surface-600 dark:text-surface-400';
    }
  });

  /**
   * Property sparklinePath
   * @readonly
   *
   * @description
   * SVG path of the sparkline built from {@link points}, or null when
   * there is not enough data to draw a line.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly sparklinePath: Signal<string | null> = computed<string | null>(() => {
    const points = this.points();
    return points ? buildSparklinePath(points) : null;
  });

  //#endregion
}
