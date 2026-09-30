import type { ThreadSubjectType } from './thread-subject-type.type';

/**
 * Interface GetOrCreateConversationInput
 * @interface GetOrCreateConversationInput
 *
 * @description
 * Payload for `POST /api/conversations`, which opens the thread attached to a
 * record or returns the existing one.
 * The response is `201` in both cases — it does not tell you whether anything
 * was created.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface GetOrCreateConversationInput {
  /**
   * Property organization
   * @readonly
   *
   * @description
   * Organization IRI or bare UUID — both accepted.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property subjectType
   * @readonly
   *
   * @description
   * Identifies the subject category for this get or create conversation.
   *
   * @access public
   *
   * @type {ThreadSubjectType}
   */
  readonly subjectType: ThreadSubjectType;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Subject IRI or bare id — both accepted.
   *
   * @access public
   *
   * @type {string}
   */
  readonly subject: string;
}
