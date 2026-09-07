import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
/**
 * Constant organizationAccessAdminEvents
 * @const organizationAccessAdminEvents
 * @description Confirmed membership decisions invalidate roster and quota data outside this state slice.
 * @since 1.0.0
 */
export const organizationAccessAdminEvents = eventGroup({
  source: 'Organization Access Administration',
  events: { membershipApproved: type<{ organizationId: string }>() },
});
