import type { MessageView } from './message-view.interface';

/**
 * Type MessageThreadEntry
 *
 * @description
 * One thing a thread draws, in render order: either a date rule or a message.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @type
 * @type MessageThreadEntry
 */
export type MessageThreadEntry = MessageDayEntry | MessageRowEntry;

/**
 * Interface MessageDayEntry
 * @interface MessageDayEntry
 *
 * @description
 * The rule marking where the calendar day changes.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageDayEntry {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the message day entry variant represented by this value.
   *
   * @access public
   *
   * @type {'day'}
   */
  readonly kind: 'day';

  /**
   * Property day
   * @readonly
   *
   * @description
   * Local `YYYY-MM-DD`. A tracking key, never a display value.
   *
   * @access public
   *
   * @type {string}
   */
  readonly day: string;

  /**
   * Property at
   * @readonly
   *
   * @description
   * The day's first message instant — what actually gets formatted.
   *
   * @access public
   *
   * @type {string}
   */
  readonly at: string;
}

/**
 * Interface MessageRowEntry
 * @interface MessageRowEntry
 *
 * @description
 * A message, plus whether it carries on the previous author's run.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageRowEntry {
  /**
   * Property kind
   * @readonly
   *
   * @description
   * Distinguishes the message row entry variant represented by this value.
   *
   * @access public
   *
   * @type {'message'}
   */
  readonly kind: 'message';

  /**
   * Property message
   * @readonly
   *
   * @description
   * Contains the message rendered by this conversation row.
   *
   * @access public
   *
   * @type {MessageView}
   */
  readonly message: MessageView;

  /**
   * Property continuation
   * @readonly
   *
   * @description
   * Indicates that this row continues the preceding message run.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly continuation: boolean;
}
