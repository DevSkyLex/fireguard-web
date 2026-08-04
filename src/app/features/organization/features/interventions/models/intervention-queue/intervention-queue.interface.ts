import type { InterventionOutput } from '../intervention/intervention-output.interface';
import type { InterventionQueueKey } from './intervention-queue-key.type';

/**
 * Interface InterventionQueue
 * @interface InterventionQueue
 *
 * @description
 * A resolved named question: how many interventions answer it organization-wide,
 * and the first few of them.
 *
 * `total` is the organization-wide count from the Hydra envelope, not
 * `items.length`: the queue shows a handful and says how many there are.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionQueue {
  //#region Properties
  /** Which question this answers. */
  readonly key: InterventionQueueKey;

  /** Organization-wide count, from `totalItems`. */
  readonly total: number;

  /** The first few interventions, in the order the API returned them. */
  readonly items: readonly InterventionOutput[];
  //#endregion
}
