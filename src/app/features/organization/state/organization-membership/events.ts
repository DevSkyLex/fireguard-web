import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
/**
 * Constant organizationMembershipEvents
 * @description Signals server-confirmed admission independently of invitation tokens.
 * @since 1.0.0
 */
export const organizationMembershipEvents = eventGroup({
  source: 'Organization Membership',
  events: { joined: type<{ organizationId: string }>() },
});
