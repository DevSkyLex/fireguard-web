import type { HydraItem } from '@core/models/api';

export interface OrganizationInvitationOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly email: string;
  readonly status: string;
  readonly invitedByUserId: string;
  readonly acceptedByUserId: string | null;
  readonly revokedByUserId: string | null;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly roleIds: ReadonlyArray<string>;
}
