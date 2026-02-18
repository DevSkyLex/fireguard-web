import type { OrganizationLegalType } from './organization-legal-type.type';

/**
 * Interface UpsertOrganizationLegalProfileInput
 * @interface UpsertOrganizationLegalProfileInput
 *
 * @description
 * Payload for:
 * `PUT /api/organizations/{organizationId}/legal-profile`.
 *
 * @version 1.0.0
 */
export interface UpsertOrganizationLegalProfileInput {
  /**
   * Property legalType
   * @readonly
   *
   * @description
   * Legal entity type.
   *
   * @type {OrganizationLegalType}
   */
  readonly legalType: OrganizationLegalType;

  /**
   * Property legalName
   * @readonly
   *
   * @description
   * Legal name of the entity.
   *
   * @type {string}
   */
  readonly legalName: string;

  /**
   * Property registrationNumber
   * @readonly
   *
   * @description
   * Optional registration number.
   * Required by backend for `company` and `non_profit`.
   *
   * @type {string | null | undefined}
   */
  readonly registrationNumber?: string | null;

  /**
   * Property vatNumber
   * @readonly
   *
   * @description
   * Optional VAT number.
   *
   * @type {string | null | undefined}
   */
  readonly vatNumber?: string | null;
}

