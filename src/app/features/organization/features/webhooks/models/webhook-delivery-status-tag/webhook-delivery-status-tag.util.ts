import type { WebhookDeliveryOutput } from '../delivery/webhook-delivery-output.interface';
import type { WebhookDeliveryStatusTagDescriptor } from './webhook-delivery-status-tag-descriptor.interface';

/** Status descriptors for every `WebhookDeliveryOutput['status']` value. */
const WEBHOOK_DELIVERY_STATUS: Record<
  WebhookDeliveryOutput['status'],
  WebhookDeliveryStatusTagDescriptor
> = {
  pending: {
    label: $localize`:@@webhooks.delivery.status.pending:Pending`,
    severity: 'neutral',
    icon: 'lucideClock',
  },
  delivered: {
    label: $localize`:@@webhooks.delivery.status.delivered:Delivered`,
    severity: 'success',
    icon: 'lucideCircleCheck',
  },
  failed: {
    label: $localize`:@@webhooks.delivery.status.failed:Failed`,
    severity: 'danger',
    icon: 'lucideCircleX',
  },
};

/**
 * Function resolveWebhookDeliveryStatusTag
 *
 * @description
 * Resolves the presentation descriptor for a delivery's status value. Falls
 * back to a neutral, humanised descriptor for an unknown value so the UI
 * degrades to a readable label instead of rendering nothing.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} value - Raw status value.
 *
 * @returns {WebhookDeliveryStatusTagDescriptor} The matching descriptor, or a humanised fallback.
 */
export function resolveWebhookDeliveryStatusTag(value: string): WebhookDeliveryStatusTagDescriptor {
  return (
    WEBHOOK_DELIVERY_STATUS[value as WebhookDeliveryOutput['status']] ?? {
      label: value.replaceAll('_', ' '),
      severity: 'neutral',
      icon: 'lucideTag',
    }
  );
}
