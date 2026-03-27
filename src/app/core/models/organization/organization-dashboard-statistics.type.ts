import type { OrganizationEquipmentStatisticsOutput } from './organization-equipment-statistics-output.interface';
import type { OrganizationFacilityStatisticsOutput } from './organization-facility-statistics-output.interface';
import type { OrganizationInspectionStatisticsOutput } from './organization-inspection-statistics-output.interface';
import type { OrganizationMembershipStatisticsOutput } from './organization-membership-statistics-output.interface';
import type { OrganizationNonConformityStatisticsOutput } from './organization-non-conformity-statistics-output.interface';
import type { OrganizationStatisticsOutput } from './organization-statistics-output.interface';

export interface OrganizationDashboardStatistics {
  readonly overview: OrganizationStatisticsOutput;
  readonly equipment: OrganizationEquipmentStatisticsOutput;
  readonly facilities: OrganizationFacilityStatisticsOutput;
  readonly inspections: OrganizationInspectionStatisticsOutput;
  readonly membership: OrganizationMembershipStatisticsOutput;
  readonly nonConformities: OrganizationNonConformityStatisticsOutput;
}
