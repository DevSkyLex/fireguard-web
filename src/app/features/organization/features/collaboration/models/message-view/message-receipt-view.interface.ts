/**
 * Interface MessageReceiptView
 * @interface
 *
 * @description
 * Delivery and read counts for a message in a direct conversation or channel.
 */
export interface MessageReceiptView {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the message receipt variant represented by this value.
   *
   * @access public
   *
   * @type {'direct' | 'channel'}
   */
  readonly kind: 'direct' | 'channel';

  /**
   * Property deliveredCount
   * @readonly
   *
   * @description
   * Counts members to whom this message has been delivered.
   *
   * @access public
   *
   * @type {number}
   */
  readonly deliveredCount: number;

  /**
   * Property readCount
   * @readonly
   *
   * @description
   * Counts members who have read this message.
   *
   * @access public
   *
   * @type {number}
   */
  readonly readCount: number;
}
