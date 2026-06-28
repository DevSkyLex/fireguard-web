import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import {
  InterventionBoardStore,
  type InterventionBoardStoreType,
} from '@features/organization/features/interventions/state/intervention-board';
import { MetricCard } from '@shared/components';

/**
 * Component InterventionInReviewMetric
 * @class InterventionInReviewMetric
 *
 * @description
 * Metric card wrapper displaying the number of interventions waiting for a
 * reviewer (the `review` pipeline lane, fusing the `submitted` and
 * `changes_requested` statuses), read from the server-reported lane total in the
 * page-scoped {@link InterventionBoardStore}. Surfaces the manager bottleneck.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-in-review-metric',
  templateUrl: './intervention-in-review-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionInReviewMetric {
  //#region Properties
  /**
   * Property store
   * @readonly
   *
   * @description
   * Page-scoped pipeline board store exposing the per-lane server totals and the
   * board loading state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {InterventionBoardStoreType}
   */
  protected readonly store: InterventionBoardStoreType =
    inject<InterventionBoardStoreType>(InterventionBoardStore);

  /**
   * Property value
   * @readonly
   *
   * @description
   * Server-reported total of interventions in the `review` lane.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () => this.store.columns().find((column) => column.id === 'review')?.total ?? 0,
  );
  //#endregion
}
