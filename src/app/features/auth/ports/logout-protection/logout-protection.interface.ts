/**
 * Interface LogoutPendingWork
 * @interface LogoutPendingWork
 *
 * @description
 * A feature-owned durable queue that must be reviewed before voluntary logout.
 */
export interface LogoutPendingWork {
  /**
   * Property hasUnsyncedWork
   * @readonly
   *
   * @description
   * Tracks every local operation requiring attention, including failed or conflicted work.
   *
   * @access public
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  readonly hasUnsyncedWork: Signal<boolean>;

  /**
   * Method count
   *
   * @description
   * Reads the persisted queue, including failed and conflicted operations.
   *
   * @returns {Promise<number>} Number of local operations still requiring attention.
   */
  count(): Promise<number>;
  /**
   * Method synchronize
   *
   * @description
   * Attempts replay without discarding failed operations or resolving conflicts automatically.
   *
   * @returns {Promise<void>} Replay completion.
   */
  synchronize(): Promise<void>;
}

/**
 * Interface LogoutProtectionPort
 * @interface LogoutProtectionPort
 *
 * @description
 * Registers durable local work without coupling auth to a feature implementation.
 */
export interface LogoutProtectionPort {
  /**
   * Property hasUnsyncedWork
   * @readonly
   *
   * @description
   * Reactively combines registered queues; callers must inspect persisted work before reloading.
   *
   * @access public
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  readonly hasUnsyncedWork: Signal<boolean>;

  /**
   * Method countPendingWork
   * @method countPendingWork
   *
   * @description
   * Reads all registered durable queues, including operations requiring human resolution.
   * Storage failures reject rather than reporting an empty queue.
   *
   * @access public
   * @since unreleased
   *
   * @returns {Promise<number>} Total operations still requiring attention.
   */
  countPendingWork(): Promise<number>;

  /**
   * Method register
   *
   * @description
   * Registers a queue for the lifetime of its owning feature service.
   *
   * @param {LogoutPendingWork} work - Durable queue operations.
   *
   * @returns {() => void} Registration cleanup.
   */
  register(work: LogoutPendingWork): () => void;
}
import type { Signal } from '@angular/core';
