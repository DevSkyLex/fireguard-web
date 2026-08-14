import type { Signal } from '@angular/core';
import type { StoreError } from '@core/request-state';

/**
 * Interface SubmissionGate
 * @interface SubmissionGate
 *
 * @description
 * One surface's claim on a store that multiplexes several mutations through a
 * single shared `CallState`: busy and error are reported only for a write this
 * surface actually submitted, never for a stale or sibling mutation's result.
 *
 * @since 1.0.0
 */
export interface SubmissionGate {
  //#region Properties

  /**
   * Property isSubmitted
   *
   * @description
   * Whether this surface submitted a write in the current session. Cleared
   * automatically once that write succeeds.
   *
   * @type {Signal<boolean>}
   */
  readonly isSubmitted: Signal<boolean>;

  /**
   * Property isBusy
   *
   * @description
   * Whether this surface's own write is in flight — the flag a confirm dialog
   * busy-disables its footer and blocks dismissal on.
   *
   * @type {Signal<boolean>}
   */
  readonly isBusy: Signal<boolean>;

  /**
   * Property error
   *
   * @description
   * The failure of this surface's own write, or `null` when it did not fail.
   *
   * @type {Signal<StoreError | null>}
   */
  readonly error: Signal<StoreError | null>;

  //#endregion

  //#region Methods

  /**
   * Method submit
   *
   * @description
   * Claims the next mutation result. Call immediately before handing the write
   * to the store.
   *
   * @returns {void}
   */
  submit(): void;

  /**
   * Method reset
   *
   * @description
   * Drops the claim, so a result already in state stops being attributed here.
   * Call when the surface opens or is dismissed.
   *
   * @returns {void}
   */
  reset(): void;

  //#endregion
}
