import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { WebhookMutation } from '@features/organization/features/webhooks/models';

/**
 * Constant webhookSubscriptionsEvents
 * @const webhookSubscriptionsEvents
 * @description Ephemeral command feedback. Secret values must be consumed only by the current dialog.
 * @since 1.0.0
 */
export const webhookSubscriptionsEvents = eventGroup({
  source: 'Organization Webhooks',
  events: {
    completed: type<{
      organizationId: string;
      kind: WebhookMutation['kind'];
      subscriptionId: string | null;
      secret?: string;
    }>(),
  },
});
