/**
 * Interface OnboardingWizardActionState
 * @interface OnboardingWizardActionState
 *
 * @description
 * Local pending/error pair for the page's own two-phase confirmation: create
 * the resource through `@features/organization/setup`, then confirm the step
 * through the store. Neither service returns a `CallState` the page can
 * reuse, so it tracks this phase itself.
 *
 * @since 1.0.0
 */
export interface OnboardingWizardActionState {
  /** Whether the resource-creation call is in flight. */
  readonly pending: boolean;

  /** Whatever the resource-creation call failed with, or `null`. */
  readonly error: unknown;
}
