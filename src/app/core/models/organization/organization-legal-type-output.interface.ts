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

export interface OrganizationLegalTypeOutput extends HydraItem {
  readonly countryCode: string;
  readonly value: string;
  readonly label: string;
  readonly requirements: OrganizationLegalProfileRequirements;
}
