import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { ServiceRequestOutput } from '@features/organization/features/service-requests/models';
/**
 * Constant serviceRequestStoreEvents
 *
 * @description
 * Server-confirmed mutations report their producing organization, request and action once.
 *
 * @since unreleased
 */
export const serviceRequestStoreEvents = eventGroup({
  source: 'Service Request Store',
  events: {
    saved: type<{
      readonly organizationId: string;
      readonly request: ServiceRequestOutput;
      readonly kind: 'create' | 'update' | 'qualify' | 'reject' | 'cancel' | 'convert';
    }>(),
  },
});
