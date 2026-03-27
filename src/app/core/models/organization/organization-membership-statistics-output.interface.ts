import type { HydraItem } from '@core/models/api';

export interface OrganizationMembershipStatisticsOutput extends HydraItem {
  readonly memberCount: number;
  readonly activeMemberCount: number;
  readonly inactiveMemberCount: number;
  readonly roleCount: number;
  readonly systemRoleCount: number;
  readonly customRoleCount: number;
  readonly invitationCount: number;
  readonly pendingInvitationCount: number;
  readonly acceptedInvitationCount: number;
  readonly revokedInvitationCount: number;
  readonly expiredInvitationCount: number;
}
