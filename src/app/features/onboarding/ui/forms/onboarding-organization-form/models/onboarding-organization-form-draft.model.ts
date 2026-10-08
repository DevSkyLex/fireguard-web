/**
 * Interface OnboardingOrganizationFormDraft
 * @interface OnboardingOrganizationFormDraft
 *
 * @description
 * The Signal Forms model the `create_organization` step edits. `name` starts
 * blank so the required rule has something to reject. The server owns slug generation.
 *
 * @since 1.0.0
 */
export interface OnboardingOrganizationFormDraft {
  /**
   * Property name
   *
   * @description
   * Display name of the organization to create.
   *
   * @property name
   */
  readonly name: string;
  /**
   * Property operatingProfile
   *
   * @description
   * Operator or service-provider operational defaults.
   *
   * @property operatingProfile
   */
  readonly operatingProfile: 'operator' | 'service_provider';
}
