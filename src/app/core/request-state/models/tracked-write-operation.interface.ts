import type { WriteOperation } from './write-operation.interface';

/**
 * Interface TrackedWriteOperation
 * @interface TrackedWriteOperation
 *
 * @description
 * Private caller-tracker snapshot, never persisted, transferred or logged.
 */
export interface TrackedWriteOperation {
  /**
   * Property scope
   *
   * @description
   * Owner/session revision captured for the intention.
   *
   * @type {number}
   */
  readonly scope: number;

  /**
   * Property payload
   *
   * @description
   * Canonical JSON snapshot compared only inside the caller's tracker.
   *
   * @type {string | undefined}
   */
  readonly payload: string | undefined;

  /**
   * Property operation
   *
   * @description
   * Immutable receipt identity retained with this snapshot.
   *
   * @type {WriteOperation}
   */
  readonly operation: WriteOperation;
}
