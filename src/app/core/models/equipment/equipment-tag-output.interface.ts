import type { HydraItem } from '@core/models/api';

export interface EquipmentTagOutput extends HydraItem {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
}
