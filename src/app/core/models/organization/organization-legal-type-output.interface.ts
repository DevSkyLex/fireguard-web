import type { HydraItem } from '@core/models/api';
import type { OrganizationLegalProfileRequirements } from './organization-legal-profile-output.interface';

export interface OrganizationLegalTypeOutput extends HydraItem {
  readonly countryCode: string;
  readonly value: string;
  readonly label: string;
  readonly requirements: OrganizationLegalProfileRequirements;
}
