import type { HydraItem } from '@core/models/api';

export interface OrganizationStatisticsOutput extends HydraItem {
  readonly memberCount: number;
  readonly roleCount: number;
  readonly facilityCount: number;
  readonly pendingInvitationCount: number;
}
