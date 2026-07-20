import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import type { MetricComparison } from '@shared/components/trend-card';
import type { MetricPolarity } from './models';
import { buildSparklinePath } from './utils';

/**
 * Component MetricCard
 * @class MetricCard
 *
 * @description
 * A headline KPI: icon and label, a large tabular value, a supporting line
 * ("2 overdue", "All sites") and an optional period-over-period delta with an
 * optional sparkline.
 *
 * Domain-agnostic by construction — every input is a scalar or a generic
 * comparison shape, so it holds a compliance rate as readily as an invoice
 * total.
 *
 * The delta is coloured by {@link MetricPolarity}, not by its direction: on a
 * count you want to shrink, a fall is an improvement, and painting "−4 open
 * non-conformities" red would report progress as a regression.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-metric-card
 *   icon="pi pi-exclamation-triangle"
 *   title="Open non-conformities"
 *   [value]="12"
 *   description="3 critical"
 *   polarity="lower"
 *   [comparison]="{ value: '−4', direction: 'down' }"
 *   comparisonLabel="vs last month"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-metric-card',
  imports: [SkeletonModule],
  templateUrl: './metric-card.component.html',
  host: {
    class:
      'flex min-w-0 flex-col rounded-xl border border-surface-200 bg-surface-0 p-4 dark:border-surface-800 dark:bg-surface-900',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MetricCard {
  //#region Inputs
  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class shown beside the label.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly icon: InputSignal<string> = input<string>('');

  /**
   * Property title
   * @readonly
   *
   * @description
   * The metric's label.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input<string>('');

  /**
   * Property value
   * @readonly
   *
   * @description
   * The headline value. `null` renders an em dash — a metric that could not be
   * measured must never read as zero.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | number | null>}
   */
  public readonly value: InputSignal<string | number | null> = input<string | number | null>(null);

  /**
   * Property description
   * @readonly
   *
   * @description
   * Supporting line under the value ("2 overdue", "Next 30 days").
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly description: InputSignal<string> = input<string>('');

  /**
   * Property comparison
   * @readonly
   *
   * @description
   * Period-over-period delta, or `null` when no comparison applies.
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
   * Property comparisonLabel
   * @readonly
   *
   * @description
   * What the delta is measured against ("vs last week"). Varies per card, so
   * it is an input rather than fixed copy.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly comparisonLabel: InputSignal<string> = input<string>('');

  /**
   * Property polarity
   * @readonly
   *
   * @description
   * Which direction of change is good — see {@link MetricPolarity}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<MetricPolarity>}
   */
  public readonly polarity: InputSignal<MetricPolarity> = input<MetricPolarity>('higher');

  /**
   * Property points
   * @readonly
   *
   * @description
   * Optional ordered series drawn as a sparkline under the delta.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly number[]>}
   */
  public readonly points: InputSignal<readonly number[]> = input<readonly number[]>([]);

  /**
   * Property loading
   * @readonly
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Computed
  /**
   * Property sparklinePath
   * @readonly
   *
   * @description
   * SVG path of the sparkline, or `null` with fewer than two points.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly sparklinePath: Signal<string | null> = computed((): string | null =>
    buildSparklinePath(this.points()),
  );

  /**
   * Property deltaClass
   * @readonly
   *
   * @description
   * Delta colour: green when the change goes the way this metric wants, red
   * when it goes against it, muted when the metric has no preferred
   * direction or the change is flat.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly deltaClass: Signal<string> = computed((): string => {
    const direction: string | null = this.comparison()?.direction ?? null;
    const polarity: MetricPolarity = this.polarity();

    if (polarity === 'neutral' || (direction !== 'up' && direction !== 'down')) {
      return 'text-surface-600 dark:text-surface-400';
    }

    const isGood: boolean = polarity === 'higher' ? direction === 'up' : direction === 'down';

    return isGood ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300';
  });
  //#endregion
}
