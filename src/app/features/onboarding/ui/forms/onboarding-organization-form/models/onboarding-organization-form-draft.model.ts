/**
 * Interface OnboardingOrganizationFormDraft
 * @interface OnboardingOrganizationFormDraft
 *
 * @description
 * The Signal Forms model the `create_organization` step edits. `name` starts
 * blank so the required rule has something to reject; `slug` is free text
 * with no backend enum of its own.
 *
 * @since 1.0.0
 */
export interface OnboardingOrganizationFormDraft {
  /** Display name of the organization to create. */
  readonly name: string;

  /** Optional custom URL slug. */
  readonly slug: string;
}
