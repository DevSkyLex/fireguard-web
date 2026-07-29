/**
 * Interface CreateChannelInput
 * @interface CreateChannelInput
 *
 * @description
 * Payload for `POST /api/channels`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CreateChannelInput {
  /** Organization IRI or bare UUID — both are accepted here. */
  readonly organization: string;
  /** 2–80 characters, trimmed server-side, no control characters. */
  readonly name: string;
}
