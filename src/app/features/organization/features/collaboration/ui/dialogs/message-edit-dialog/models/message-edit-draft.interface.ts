/**
 * Interface MessageEditDraft
 * @interface MessageEditDraft
 *
 * @description
 * The edit dialog's form model — the body in composer text form, mentions as
 * readable `@Name` labels.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageEditDraft {
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
