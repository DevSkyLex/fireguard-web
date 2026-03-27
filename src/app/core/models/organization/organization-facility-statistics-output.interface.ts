import type { HydraItem } from '@core/models/api';

export interface OrganizationFacilityStatisticsOutput extends HydraItem {
  readonly totalCount: number;
  readonly activeCount: number;
  readonly archivedCount: number;
  readonly countsByType: Readonly<Record<string, number>>;
}
