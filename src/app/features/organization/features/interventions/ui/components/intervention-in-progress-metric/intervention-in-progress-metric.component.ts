import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import {
  InterventionBoardStore,
  type InterventionBoardStoreType,
} from '@features/organization/features/interventions/state/intervention-board';
import { MetricCard } from '@shared/components';

/**
 * Component InterventionInProgressMetric
 * @class InterventionInProgressMetric
 *
 * @description
 * Metric card wrapper displaying the number of interventions currently in the
 * `in_progress` pipeline lane (field work underway), read from the
 * server-reported lane total in the page-scoped {@link InterventionBoardStore}.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-in-progress-metric',
  templateUrl: './intervention-in-progress-metric.component.html',
  imports: [MetricCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionInProgressMetric {
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
   * Server-reported total of interventions in the `in_progress` lane.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly value: Signal<number> = computed<number>(
    () => this.store.columns().find((column) => column.id === 'in_progress')?.total ?? 0,
  );
  //#endregion
}
