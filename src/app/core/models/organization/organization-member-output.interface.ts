import type { HydraItem } from '@core/models/api';

export interface OrganizationMemberOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly userId: string;
  readonly isActive: boolean;
  readonly joinedAt: string;
  readonly roleIds: ReadonlyArray<string>;
}
