/**
 * Interface CreateOnboardingOrganizationInput
 * @interface CreateOnboardingOrganizationInput
 *
 * @description
 * Payload for:
 * `POST /api/organizations/onboarding/organization`.
 *
 * @version 1.0.0
 */
export interface CreateOnboardingOrganizationInput {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Organization display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Optional custom slug (lowercase, numbers, dashes).
   *
   * @type {string | null | undefined}
   */
  readonly slug?: string | null;
}
