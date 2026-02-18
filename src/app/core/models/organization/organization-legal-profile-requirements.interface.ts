import type { OrganizationLegalFieldRequirement } from './organization-legal-field-requirement.interface';

/**
 * Interface OrganizationLegalProfileRequirements
 * @interface OrganizationLegalProfileRequirements
 *
 * @description
 * Field requirements for organization legal profile data.
 *
 * @version 1.0.0
 */
export interface OrganizationLegalProfileRequirements {
  /**
   * Property registrationNumber
   * @readonly
   *
   * @description
   * Registration number field requirement.
   *
   * @type {OrganizationLegalFieldRequirement}
   */
  readonly registrationNumber: OrganizationLegalFieldRequirement;

  /**
   * Property vatNumber
   * @readonly
   *
   * @description
   * VAT number field requirement.
   *
   * @type {OrganizationLegalFieldRequirement}
   */
  readonly vatNumber: OrganizationLegalFieldRequirement;
}

