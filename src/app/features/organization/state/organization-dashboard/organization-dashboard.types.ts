import type { OrganizationDashboardGranularity } from '@features/organization/models';

export type GranularityOption = {
  readonly label: string;
  readonly value: OrganizationDashboardGranularity;
};
