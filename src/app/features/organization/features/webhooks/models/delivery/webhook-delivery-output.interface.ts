import type { HydraItem } from '@core/api/models';

/**
 * Interface WebhookDeliveryOutput
 * @interface WebhookDeliveryOutput
 * @description Durable delivery outcome without payloads or sensitive diagnostics.
 * @since 1.0.0
 */
export interface WebhookDeliveryOutput extends HydraItem {
  /**
   * Property id
   * @description Stable delivery identity reused during redelivery.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  id: string;
  /**
   * Property subscriptionId
   * @description Owning endpoint.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  subscriptionId: string;
  /**
   * Property eventType
   * @description Public event value.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  eventType: string;
  /**
   * Property status
   * @description Server delivery state.
   * @access public
   * @since 1.0.0
   * @type {'pending' | 'delivered' | 'failed'}
   */
  status: 'pending' | 'delivered' | 'failed';
  /**
   * Property attempts
   * @description Confirmed delivery attempts.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  attempts: number;
  /**
   * Property httpStatus
   * @description Last HTTP response status.
   * @access public
   * @since 1.0.0
   * @type {number | null}
   */
  httpStatus?: number | null;
  /**
   * Property errorCode
   * @description Stable public failure category.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  errorCode?: string | null;
  /**
   * Property nextRetryAt
   * @description Estimated automatic retry time.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  nextRetryAt?: string | null;
  /**
   * Property deliveredAt
   * @description Confirmed success time.
   * @access public
   * @since 1.0.0
   * @type {string | null}
   */
  deliveredAt?: string | null;
  /**
   * Property createdAt
   * @description Initial queue time.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  createdAt: string;
}
