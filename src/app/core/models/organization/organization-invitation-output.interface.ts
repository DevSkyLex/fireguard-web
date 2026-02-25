import type { HydraItem } from '@core/models/api';

export interface OrganizationInvitationOutput extends HydraItem {
  readonly id: string;
  readonly email: string;
  readonly roleKey: string;
  readonly status: string;
  readonly createdAt: string;
  readonly expiresAt: string | null;
}
