import type { WebhookSubscriptionInput } from './webhook-subscription-input.interface';

/**
 * Type WebhookMutation
 * @type WebhookMutation
 * @description An explicit management action; redelivery keeps its original delivery identity.
 * @since 1.0.0
 */
export type WebhookMutation =
  | { kind: 'create'; input: WebhookSubscriptionInput }
  | { kind: 'update'; id: string; input: Partial<WebhookSubscriptionInput> }
  | { kind: 'rotate' | 'delete' | 'ping'; id: string }
  | { kind: 'redeliver'; id: string; deliveryId: string };
