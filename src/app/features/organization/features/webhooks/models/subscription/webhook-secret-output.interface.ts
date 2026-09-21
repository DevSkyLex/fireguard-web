import type { WebhookSubscriptionOutput } from './webhook-subscription-output.interface';

/**
 * Interface WebhookSecretOutput
 * @interface WebhookSecretOutput
 * @description One-time response; never retain in the entity store, logs or browser storage.
 * @since 1.0.0
 */
export interface WebhookSecretOutput extends WebhookSubscriptionOutput {
  /**
   * Property secret
   * @description New signing secret; discard after dismissal.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  secret: string;
}
