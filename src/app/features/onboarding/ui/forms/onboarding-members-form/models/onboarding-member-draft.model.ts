/**
 * Interface OnboardingMemberDraft
 * @interface OnboardingMemberDraft
 *
 * @description
 * The Signal Forms model for the single invitation row currently being
 * edited before it is staged into the list the step ultimately submits.
 *
 * @since 1.0.0
 */
export interface OnboardingMemberDraft {
  /** Email address of the invitee. */
  readonly email: string;

  /** Picked role id, or an empty string to invite without one. */
  readonly roleId: string;
}
