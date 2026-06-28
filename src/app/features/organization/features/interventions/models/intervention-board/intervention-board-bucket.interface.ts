import type { InterventionOutput } from '../intervention/intervention-output.interface';
import type { InterventionBoardColumnId } from './intervention-board-column-id.type';

/**
 * Interface InterventionBoardBucket
 *
 * @description
 * Render-ready contents of one pipeline-board lane: the lane identifier, the
 * interventions currently grouped under it, and the server-reported total for
 * the lane (which may exceed `items.length` since each lane is loaded with a
 * bounded page size).
 *
 * @since 1.0.0
 */
export interface InterventionBoardBucket {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Lane identifier.
   *
   * @type {InterventionBoardColumnId}
   */
  readonly id: InterventionBoardColumnId;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Interventions grouped under the lane.
   *
   * @type {readonly InterventionOutput[]}
   */
  readonly items: readonly InterventionOutput[];

  /**
   * Property total
   * @readonly
   *
   * @description
   * Server-reported number of interventions in the lane.
   *
   * @type {number}
   */
  readonly total: number;
}
