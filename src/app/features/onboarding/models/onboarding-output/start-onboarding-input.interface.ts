/**
 * Interface StartOnboardingInput
 * @interface StartOnboardingInput
 *
 * @description
 * Payload used to initialize or restart an
 * onboarding flow.
 */
export interface StartOnboardingInput {
  //#region Properties
  /**
   * Property reset
   * @readonly
   *
   * @description
   * Whether the current onboarding state should be
   * reset before starting again.
   *
   * @type {boolean}
   */
  readonly reset?: boolean;
  /**
   * Property intent
   * @readonly
   * @description Explicit creation choice; never inferred from visiting discovery.
   * @access public
   * @since 1.0.0
   * @type {'create' | undefined}
   */
  readonly intent?: 'create';
  //#endregion
}
