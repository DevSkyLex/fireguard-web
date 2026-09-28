import type { WebhookDeliveryStatusTagSeverity } from './webhook-delivery-status-tag-severity.type';

/**
 * Interface WebhookDeliveryStatusTagDescriptor
 *
 * @description
 * How one `WebhookDeliveryOutput['status']` value looks, wherever it
 * appears. `label` and `icon` both always render, so a value is legible
 * without its colour; `severity` only tints what the other two already say.
 *
 * @since 1.0.0
 */
export interface WebhookDeliveryStatusTagDescriptor {
  /** Localized human label. @type {string} */
  readonly label: string;
  /** Presentation weight the render site maps to a variant and a tint. @type {WebhookDeliveryStatusTagSeverity} */
  readonly severity: WebhookDeliveryStatusTagSeverity;
  /** Registered `@ng-icons/lucide` name. @type {string} */
  readonly icon: string;
}
