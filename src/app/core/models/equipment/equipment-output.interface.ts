import type { HydraItem } from '@core/models/api';
import type { EquipmentTagOutput } from './equipment-tag-output.interface';

export type EquipmentStatus = 'in_stock' | 'commissioned' | 'decommissioned' | 'under_maintenance';

export interface EquipmentOutput extends HydraItem {
  readonly id: string;
  readonly organizationId: string;
  readonly facilityId: string | null;
  readonly type: string;
  readonly subType: string | null;
  readonly brand: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly locationLabel: string | null;
  readonly status: EquipmentStatus;
  readonly installedAt: string | null;
  readonly commissionedAt: string | null;
  readonly tags: ReadonlyArray<EquipmentTagOutput>;
  readonly createdAt: string;
  readonly updatedAt: string;
}
