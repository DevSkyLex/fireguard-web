import type { HydraItem } from '@core/models/api';

export interface OrganizationInspectionStatisticsOutput extends HydraItem {
  readonly totalCount: number;
  readonly draftCount: number;
  readonly submittedCount: number;
  readonly closedCount: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly partialCount: number;
  readonly countsByInspectorType: Readonly<Record<string, number>>;
  readonly performedLast7DaysCount: number;
  readonly performedLast30DaysCount: number;
}
