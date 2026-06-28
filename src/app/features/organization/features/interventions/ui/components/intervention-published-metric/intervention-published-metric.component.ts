import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import {
  InterventionBoardStore,
  type InterventionBoardStoreType,
} from '@features/organization/features/interventions/state/intervention-board';
import { MetricCard } from '@shared/components';

/**
 * Component InterventionPublishedMetric
 * @class InterventionPublishedMetric
 *
 * @description
 * Metric card wrapper displaying the number of interventions in the terminal
 * `published` pipeline lane (completed throughput), read from the
 * server-reported lane total in the page-scoped {@link InterventionBoardStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-published-metric',
  templateUrl: './intervention-published-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPublishedMetric {
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
   * Server-reported total of interventions in the `published` lane.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () => this.store.columns().find((column) => column.id === 'published')?.total ?? 0,
  );
  //#endregion
}
