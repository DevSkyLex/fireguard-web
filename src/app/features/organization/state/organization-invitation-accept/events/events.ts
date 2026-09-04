import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/** Membership changes that invalidate activation and organization caches. */
export const organizationInvitationAcceptStoreEvents = eventGroup({
  source: 'Organization Invitation Accept Store',
  events: {
    acceptSucceeded: type<{ organizationId: string }>(),
  },
});
