/**
 * Interface OnboardingPlanDraft
 * @interface OnboardingPlanDraft
 *
 * @description
 * The Signal Forms model the `select_plan` step edits: a single radio
 * choice among the plan catalog's keys.
 *
 * @since 1.0.0
 */
export interface OnboardingPlanDraft {
  /** The chosen plan's key, or an empty string until one is picked. */
  readonly planKey: string;
}

/**
 * Interface OnboardingPlanSelection
 * @interface OnboardingPlanSelection
 *
 * @description
 * What the step emits: the chosen plan key, the billing cadence proposed
 * (always monthly — the wizard does not offer a yearly toggle; see
 * `FEATURE.md` "Deferred"), and whether the wizard page must start a Stripe
 * Checkout session before it may confirm the step.
 *
 * @since 1.0.0
 */
export interface OnboardingPlanSelection {
  /** The chosen plan's key. */
  readonly planKey: string;

  /** Billing cadence proposed. */
  readonly interval: 'month';

  /** `true` when the plan carries a non-zero monthly price. */
  readonly requiresPayment: boolean;
}
