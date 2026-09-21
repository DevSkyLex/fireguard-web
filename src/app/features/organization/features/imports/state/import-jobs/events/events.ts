import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { ImportTemplateOutput } from '@features/organization/features/imports/models';

/**
 * Constant importJobsStoreEvents
 * @description Communicates accepted reports and requested downloads to the owning page.
 * @since 1.1.0
 */
export const importJobsStoreEvents = eventGroup({
  source: 'Import Jobs Store',
  events: {
    reportReady: type<{ organizationId: string; jobId: string }>(),
    templateReady: type<{ organizationId: string; template: ImportTemplateOutput }>(),
  },
});
