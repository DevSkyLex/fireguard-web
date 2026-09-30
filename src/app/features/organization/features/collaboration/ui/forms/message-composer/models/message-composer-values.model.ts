/**
 * Interface MessageComposerValues
 * @interface MessageComposerValues
 *
 * @description
 * What the composer edits: one message body.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageComposerValues {
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
}
