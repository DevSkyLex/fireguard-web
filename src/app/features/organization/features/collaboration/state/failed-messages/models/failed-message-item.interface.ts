/**
 * Interface FailedMessageItem
 * @interface FailedMessageItem
 *
 * @description
 * A locally failed send whose conversation is still readable in the selected organization.
 *
 * @since 1.0.0
 */
export interface FailedMessageItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Uniquely identifies this failed message item.
   *
   * @access public
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Contains the message text shown in the conversation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly body: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Records when this failed message item was created.
   *
   * @access public
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property conversationLabel
   * @readonly
   *
   * @description
   * Provides the neutral conversation label shown for this failed message.
   *
   * @access public
   *
   * @type {string}
   */
  readonly conversationLabel: string;

  /**
   * Property link
   * @readonly
   *
   * @description
   * Lists local links associated with this failed message.
   *
   * @access public
   *
   * @type {readonly string[]}
   */
  readonly link: readonly string[];
}
