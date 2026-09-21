import type { HydraItem } from '@core/api/models';

/**
 * Interface WebhookSubscriptionOutput
 * @interface WebhookSubscriptionOutput
 * @description An organization endpoint without its signing secret.
 * @since 1.0.0
 */
export interface WebhookSubscriptionOutput extends HydraItem {
  /**
   * Property id
   * @description Subscription identity.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  id: string;
  /**
   * Property organizationId
   * @description Owning organization.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  organizationId: string;
  /**
   * Property url
   * @description Authorized HTTPS destination.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  url: string;
  /**
   * Property description
   * @description Operator description.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  description: string;
  /**
   * Property eventTypes
   * @description Subscribed catalog values.
   * @access public
   * @since 1.0.0
   * @type {string[]}
   */
  eventTypes: string[];
  /**
   * Property isActive
   * @description Whether business events are dispatched.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  isActive: boolean;
  /**
   * Property createdAt
   * @description Creation timestamp.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  createdAt: string;
  /**
   * Property updatedAt
   * @description Last update timestamp.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  updatedAt: string;
}
