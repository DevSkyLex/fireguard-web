/**
 * Interface SubmissionGateOptions
 * @interface SubmissionGateOptions
 *
 * @description
 * What a surface wants done when the write it claimed succeeds, beyond the
 * gate dropping its own claim.
 *
 * @since 1.0.0
 */
export interface SubmissionGateOptions {
  //#region Properties

  /**
   * Property onSuccess
   *
   * @description
   * Ran once the claimed write reports success — closing the dialog, clearing
   * the pending target. Omitted when the surface reacts to a store event
   * instead.
   *
   * @type {(() => void) | undefined}
   */
  readonly onSuccess?: () => void;

  //#endregion
}
