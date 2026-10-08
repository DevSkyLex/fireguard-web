import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant maintenanceExportStoreEvents
 *
 * @description
 * Same-session acknowledged operations drive editor dismissal and scoped collection refresh.
 */
export const maintenanceExportStoreEvents = eventGroup({
  source: 'MaintenanceExportStore',
  events: {
    acknowledged: type<{
      readonly organizationId: string;
      readonly sessionRevision: number;
      readonly kind: 'create' | 'adjust' | 'confirm' | 'reference';
      readonly id: string;
    }>(),
  },
});
