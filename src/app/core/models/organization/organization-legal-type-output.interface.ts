import type { HydraItem } from '@core/models/api';

/**
 * Interface OrganizationLegalFieldRequirement
 * @interface OrganizationLegalFieldRequirement
 *
 * @description
 * Requirement definition for one legal-profile field.
 */
export interface OrganizationLegalFieldRequirement {
  //#region Properties
  /** @type {boolean} */
  readonly required: boolean;
  /** @type {string | null} */
  readonly label: string | null;
  /** @type {string | null} */
  readonly pattern: string | null;
  /** @type {string | null} */
  readonly example: string | null;
  //#endregion
}

/**
 * Interface OrganizationLegalProfileRequirements
 * @interface OrganizationLegalProfileRequirements
 *
 * @description
 * Aggregated legal-profile field requirements for
 * a given organization legal type.
 */
export interface OrganizationLegalProfileRequirements {
  //#region Properties
  /** @type {OrganizationLegalFieldRequirement} */
  readonly registrationNumber: OrganizationLegalFieldRequirement;
  /** @type {OrganizationLegalFieldRequirement} */
  readonly vatNumber: OrganizationLegalFieldRequirement;
  //#endregion
}

/**
 * Interface OrganizationLegalTypeOutput
 * @interface OrganizationLegalTypeOutput
 *
 * @description
 * Legal type option returned by the organization API.
 */
export interface OrganizationLegalTypeOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly countryCode: string;
  /** @type {string} */
  readonly value: string;
  /** @type {string} */
  readonly label: string;
  /** @type {OrganizationLegalProfileRequirements} */
  readonly requirements: OrganizationLegalProfileRequirements;
  //#endregion
}
