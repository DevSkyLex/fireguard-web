/**
 * Interface WebhookSubscriptionInput
 * @interface WebhookSubscriptionInput
 * @description Editable endpoint fields; partial updates send only changed fields.
 * @since 1.0.0
 */
export interface WebhookSubscriptionInput {
  /**
   * Property url
   * @description HTTPS destination.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  url: string;
  /**
   * Property description
   * @description Optional description, empty to clear.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  description: string;
  /**
   * Property eventTypes
   * @description Selected public event values.
   * @access public
   * @since 1.0.0
   * @type {string[]}
   */
  eventTypes: string[];
  /**
   * Property isActive
   * @description Active flag, only accepted by updates.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  isActive?: boolean;
}
