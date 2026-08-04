import type { InterventionOutput } from '../intervention/intervention-output.interface';

/**
 * Interface InterventionUnsyncedEntry
 * @interface InterventionUnsyncedEntry
 *
 * @description
 * One locally persisted intervention that still has queued outbox operations,
 * with how many of them are waiting.
 *
 * It is not an {@link InterventionQueue}: the collection cannot answer this
 * question. The intervention comes from the local workspace cache and the count
 * from the outbox, so both are readable offline and neither has a
 * `totalItems` to report.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionUnsyncedEntry {
  //#region Properties
  /** The intervention as last cached locally. */
  readonly intervention: InterventionOutput;

  /** How many operations are still queued for it. */
  readonly pendingCount: number;
  //#endregion
}
