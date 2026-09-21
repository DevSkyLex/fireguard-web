import type { CalendarSourceKey } from './calendar-source-key.type';

/**
 * Interface CalendarFeedSourceOutput
 * @interface CalendarFeedSourceOutput
 * @description Availability and truncation for an authorized calendar contributor.
 * @since 1.0.0
 */
export interface CalendarFeedSourceOutput {
  /**
   * Property sourceKey
   * @readonly
   * @description Authorized contributor identity.
   * @access public
   * @since 1.0.0
   * @type {CalendarSourceKey}
   */
  readonly sourceKey: CalendarSourceKey;
  /**
   * Property available
   * @readonly
   * @description Whether this source's read succeeded.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly available: boolean;
  /**
   * Property truncated
   * @readonly
   * @description Whether the server found more entries than its bounded response includes.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly truncated: boolean;
}
