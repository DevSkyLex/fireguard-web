import type { HydraItem } from '@core/api/models';

/**
 * Interface WebhookPingOutput
 * @interface WebhookPingOutput
 * @description Accepted queue receipt, not confirmation of delivery.
 * @since 1.0.0
 */
export interface WebhookPingOutput extends HydraItem {
  /**
   * Property deliveryId
   * @description Queued delivery identity.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  deliveryId: string;
  /**
   * Property subscriptionId
   * @description Endpoint identity.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  subscriptionId: string;
  /**
   * Property status
   * @description Accepted state.
   * @access public
   * @since 1.0.0
   * @type {'queued'}
   */
  status: 'queued';
}
