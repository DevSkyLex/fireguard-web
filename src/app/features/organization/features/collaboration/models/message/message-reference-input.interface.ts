import type { MessageReferenceType } from './message-reference-type.type';

/**
 * Interface MessageReferenceInput
 * @interface MessageReferenceInput
 *
 * @description
 * A structured reference attached when posting or editing. At most five per
 * message; the server resolves each target inside the conversation's
 * organization before persisting.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface MessageReferenceInput {
  readonly type: MessageReferenceType;
  /** Bare record UUID, at most 36 characters. */
  readonly id: string;
  readonly label?: string;
  readonly code?: string;
}
