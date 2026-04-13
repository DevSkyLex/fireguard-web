import type { HydraItem } from '@core/models/api';

export interface OrganizationLegalFieldRequirementOutput {
  readonly required: boolean;
  readonly label: string | null;
  readonly pattern: string | null;
  readonly example: string | null;
}

export interface OrganizationLegalProfileRequirementsOutput {
  readonly registrationNumber: OrganizationLegalFieldRequirementOutput;
  readonly vatNumber: OrganizationLegalFieldRequirementOutput;
}

/**
 * Interface OrganizationLegalProfileOutput
 *
 * @description
 * Read model returned by organization legal profile endpoints.
 */
export interface OrganizationLegalProfileOutput extends HydraItem {
  readonly organizationId: string;
  readonly countryCode: string;
  readonly legalType: string;
  readonly legalName: string;
  readonly registrationNumber?: string | null;
  readonly vatNumber?: string | null;
  readonly requirements: OrganizationLegalProfileRequirementsOutput;
  readonly createdAt: string;
  readonly updatedAt: string;
}
