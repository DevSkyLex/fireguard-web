import type { OrganizationFacilityType } from './organization-facility-type.type';

/**
 * Type FirstFacilityMetadata
 * @type FirstFacilityMetadata
 *
 * @description
 * Optional metadata for first facility onboarding creation.
 *
 * @version 1.0.0
 */
export type FirstFacilityMetadata = Record<string, unknown>;

/**
 * Interface CreateFirstFacilityOnboardingInput
 * @interface CreateFirstFacilityOnboardingInput
 *
 * @description
 * Payload for:
 * `POST /api/organizations/{organizationId}/onboarding/first-facility`.
 *
 * @version 1.0.0
 */
export interface CreateFirstFacilityOnboardingInput {
  /**
   * Property type
   * @readonly
   *
   * @description
   * Facility type.
   *
   * @type {OrganizationFacilityType}
   */
  readonly type: OrganizationFacilityType;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Facility display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Optional facility code.
   *
   * @type {string | null | undefined}
   */
  readonly code?: string | null;

  /**
   * Property address
   * @readonly
   *
   * @description
   * Optional facility address.
   *
   * @type {string | null | undefined}
   */
  readonly address?: string | null;

  /**
   * Property metadata
   * @readonly
   *
   * @description
   * Optional facility metadata.
   *
   * @type {FirstFacilityMetadata | null | undefined}
   */
  readonly metadata?: FirstFacilityMetadata | null;
}
