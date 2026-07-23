/**
 * Interface UpdateChannelInput
 * @interface UpdateChannelInput
 *
 * @description
 * Merge payload for `PATCH /api/channels/{id}`. An omitted key leaves that
 * property untouched.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UpdateChannelInput {
  readonly name?: string;
  readonly isArchived?: boolean;
}
