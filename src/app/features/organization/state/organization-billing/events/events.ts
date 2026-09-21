import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';

/**
 * Constant organizationBillingStoreEvents
 * @const organizationBillingStoreEvents
 * @description Announces server confirmation so consumers refresh organization data and access.
 * @since 1.0.0
 */
export const organizationBillingStoreEvents = eventGroup({
  source: 'Organization Billing Store',
  events: {
    checkoutReconciled: type<{ organizationId: string }>(),
  },
});
