import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { MetricCard } from '@shared/components';

/**
 * Type InterventionMetricVariant
 * @typedef InterventionMetricVariant
 *
 * @description
 * Which pipeline lane a metric strip card summarizes. Purely an identity hook
 * (drives `[attr.data-variant]` for stable e2e/test targeting now that the four
 * former single-purpose components share one selector); it carries no visual
 * weight of its own so the strip stays restrained rather than color-coding
 * informational counts.
 *
 * @since 4.0.0
 */
export type InterventionMetricVariant = 'planned' | 'in_progress' | 'review' | 'published';

/**
 * Component InterventionMetric
 * @class InterventionMetric
 *
 * @description
 * Single parameterized metric-strip card replacing the four former
 * near-identical wrappers (`intervention-{in-progress,in-review,planned,
 * published}-metric`). A thin presentational shell over the shared
 * {@link MetricCard}: the parent page reads the per-lane server totals from
 * {@link InterventionBoardStore} and supplies the value, label, description and
 * icon per variant, so this component injects no store and performs no
 * transport, matching the presentational contract of every other board widget.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-metric
 *   variant="in_progress"
 *   title="In progress"
 *   description="Field work underway"
 *   icon="pi pi-wrench"
 *   [value]="inProgressTotal()"
 *   [loading]="boardStore.countsLoading()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-metric',
  templateUrl: './intervention-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-variant]': 'variant()' },
})
export class InterventionMetric {
  //#region Inputs
  /**
   * Property variant
   * @readonly
   *
   * @description
   * Pipeline lane this card summarizes. Reflected as `[data-variant]` on the
   * host for stable targeting; does not drive any color of its own so lane
   * identity is not decorated into the metric strip (orange stays the only
   * accent, reserved for primary actions and active state).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionMetricVariant>}
   */
  public readonly variant: InputSignal<InterventionMetricVariant> =
    input.required<InterventionMetricVariant>();

  /**
   * Property title
   * @readonly
   *
   * @description
   * Localized card heading (e.g. `"In progress"`), forwarded to {@link MetricCard}.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Localized supporting subtitle (e.g. `"Field work underway"`).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> = input<string>();

  /**
   * Property icon
   * @readonly
   *
   * @description
   * PrimeIcons class rendered in the card's icon slot (e.g. `"pi pi-wrench"`).
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
   * Server-reported total for this lane.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<number | null>}
   */
  public readonly value: InputSignal<number | null> = input.required<number | null>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the backing board data is still loading; shows a skeleton in place
   * of the value.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion
}
