import type { HydraItem } from '@core/models/api';

export type FacilityType = 'site' | 'building' | 'floor' | 'zone' | 'area';

export type FacilityStatus = 'active' | 'archived';

export interface FacilityOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly parentFacilityId: string | null;
  readonly type: FacilityType;
  readonly name: string;
  readonly code: string | null;
  readonly status: FacilityStatus;
  readonly address: string | null;
  readonly metadata: Readonly<Record<string, string | null>>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
