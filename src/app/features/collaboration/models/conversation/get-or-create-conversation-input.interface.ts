import type { ThreadSubjectType } from './thread-subject-type.type';

/**
 * Interface GetOrCreateConversationInput
 * @interface GetOrCreateConversationInput
 *
 * @description
 * Payload for `POST /api/conversations`, which opens the thread attached to a
 * record or returns the existing one.
 *
 * The response is `201` in both cases — it does not tell you whether anything
 * was created.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface GetOrCreateConversationInput {
  /** Organization IRI or bare UUID — both accepted. */
  readonly organization: string;
  readonly subjectType: ThreadSubjectType;
  /** Subject IRI or bare id — both accepted. */
  readonly subject: string;
}
