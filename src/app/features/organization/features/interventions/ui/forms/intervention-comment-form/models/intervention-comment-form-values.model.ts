/**
 * Interface InterventionCommentFormValues
 * @interface InterventionCommentFormValues
 *
 * @description
 * Holds the text entered for a conversation comment before it is posted.
 */
export interface InterventionCommentFormValues {
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
