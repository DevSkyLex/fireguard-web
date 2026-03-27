import type { HydraItem } from '@core/models/api';

/**
 * Interface EquipmentMaintenanceLogOutput
 *
 * @description
 * Read model returned by equipment maintenance log endpoints.
 */
export interface EquipmentMaintenanceLogOutput extends HydraItem {
  readonly id: string;
  readonly equipmentId: string;
  readonly organizationId: string;
  readonly startedAt: string;
  readonly completedAt?: string | null;
}
