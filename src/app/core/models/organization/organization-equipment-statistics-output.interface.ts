import type { HydraItem } from '@core/models/api';

export interface OrganizationEquipmentStatisticsOutput extends HydraItem {
  readonly totalCount: number;
  readonly inStockCount: number;
  readonly operationalCount: number;
  readonly underMaintenanceCount: number;
  readonly decommissionedCount: number;
  readonly countsByType: Readonly<Record<string, number>>;
}
