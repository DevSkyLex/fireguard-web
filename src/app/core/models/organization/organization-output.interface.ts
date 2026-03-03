import type { HydraItem } from '@core/models/api';

export interface OrganizationOutput extends HydraItem {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly ownerUserId: string;
  readonly createdByUserId: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly memberCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
