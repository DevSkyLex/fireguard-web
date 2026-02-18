import type { OrganizationLegalProfileRequirements } from './organization-legal-profile-requirements.interface';
import type { OrganizationLegalType } from './organization-legal-type.type';

/**
 * Interface OrganizationLegalTypeOption
 * @interface OrganizationLegalTypeOption
 *
 * @description
 * Legal type option returned by:
 * `GET /api/organizations/legal-types`.
 *
 * @version 1.0.0
 */
export interface OrganizationLegalTypeOption {
  /**
   * Property value
   * @readonly
   *
   * @description
   * Legal type technical value.
   *
   * @type {OrganizationLegalType}
   */
  readonly value: OrganizationLegalType;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Human-readable label.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property requirements
   * @readonly
   *
   * @description
   * Validation requirements for fields linked to this legal type.
   *
   * @type {OrganizationLegalProfileRequirements}
   */
  readonly requirements: OrganizationLegalProfileRequirements;
}

