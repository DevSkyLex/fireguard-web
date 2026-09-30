import type { HydraItem } from '@core/api/models';

/**
 * Interface ConversationSignalOutput
 * @interface
 *
 * @description
 * Acknowledgement of a typing or delivery signal.
 */
export interface ConversationSignalOutput extends HydraItem {
  /**
   * Property accepted
   * @readonly
   *
   * @description
   * Indicates whether the server accepted the conversation signal.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly accepted: boolean;
}
