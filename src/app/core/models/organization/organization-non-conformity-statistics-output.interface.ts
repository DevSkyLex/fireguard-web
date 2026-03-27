import type { HydraItem } from '@core/models/api';

export interface OrganizationNonConformityStatisticsOutput extends HydraItem {
  readonly totalCount: number;
  readonly openCount: number;
  readonly inProgressCount: number;
  readonly doneCount: number;
  readonly waivedCount: number;
  readonly lowSeverityCount: number;
  readonly mediumSeverityCount: number;
  readonly highSeverityCount: number;
  readonly criticalSeverityCount: number;
}
