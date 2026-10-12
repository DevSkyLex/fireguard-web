import type { WriteOperation } from './write-operation.interface';

/**
 * Interface WriteOperationTracker
 * @interface WriteOperationTracker
 *
 * @description
 * Caller-owned in-memory identities for JSON write intentions. Clear on session loss and store
 * destruction; complete after an acknowledged success. Uploads retain an explicit WriteOperation.
 */
export interface WriteOperationTracker {
  /**
   * Method options
   * @method options
   *
   * @description
   * Retains the previous identity only while action, JSON transport payload and owner scope match.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} action - Caller-local mutation name.
   * @param {unknown} payload - JSON-serializable transport input; never a Blob or FormData.
   * @param {number} scope - Session revision or another monotonically invalidated owner scope.
   *
   * @returns {WriteOperation} Stable request options for this unchanged intention.
   */
  options(action: string, payload: unknown, scope: number): WriteOperation;

  /**
   * Method complete
   * @method complete
   *
   * @description
   * Discards an acknowledged intention so the next submission receives a new identity.
   *
   * @access public
   * @since unreleased
   *
   * @param {string} action - Acknowledged caller-local mutation name.
   *
   * @returns {void}
   */
  complete(action: string): void;

  /**
   * Method clear
   * @method clear
   *
   * @description
   * Discards every in-memory snapshot owned by this tracker.
   *
   * @access public
   * @since unreleased
   *
   * @returns {void}
   */
  clear(): void;
}
