import type { OrganizationLegalType } from './organization-legal-type.type';
import type { OrganizationLegalProfileRequirements } from './organization-legal-profile-requirements.interface';

/**
 * Interface OrganizationLegalProfileOutput
 * @interface OrganizationLegalProfileOutput
 *
 * @description
 * Legal profile payload returned by backend.
 *
 * @version 1.0.0
 */
export interface OrganizationLegalProfileOutput {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization identifier.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property legalType
   * @readonly
   *
   * @description
   * Organization legal type.
   *
   * @type {OrganizationLegalType}
   */
  readonly legalType: OrganizationLegalType;

  /**
   * Property legalName
   * @readonly
   *
   * @description
   * Legal name.
   *
   * @type {string}
   */
  readonly legalName: string;

  /**
   * Property registrationNumber
   * @readonly
   *
   * @description
   * Registration number.
   *
   * @type {string | null | undefined}
   */
  readonly registrationNumber?: string | null;

  /**
   * Property vatNumber
   * @readonly
   *
   * @description
   * VAT number.
   *
   * @type {string | null | undefined}
   */
  readonly vatNumber?: string | null;

  /**
   * Property requirements
   * @readonly
   *
   * @description
   * Field requirements enforced for this organization legal profile.
   *
   * @type {OrganizationLegalProfileRequirements}
   */
  readonly requirements: OrganizationLegalProfileRequirements;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp (ISO string).
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Update timestamp (ISO string).
   *
   * @type {string}
   */
  readonly updatedAt: string;
}
