import type { HydraItem } from '@core/models/api';

export interface OrganizationLegalFieldRequirement {
  readonly required: boolean;
  readonly label: string | null;
  readonly pattern: string | null;
  readonly example: string | null;
}

export interface OrganizationLegalProfileRequirements {
  readonly registrationNumber: OrganizationLegalFieldRequirement;
  readonly vatNumber: OrganizationLegalFieldRequirement;
}

export interface OrganizationLegalProfileOutput extends HydraItem {
  readonly organizationId: string;
  readonly countryCode: string;
  readonly legalType: string;
  readonly legalName: string | null;
  readonly registrationNumber: string | null;
  readonly vatNumber: string | null;
  readonly address: string | null;
  readonly requirements: OrganizationLegalProfileRequirements;
}
