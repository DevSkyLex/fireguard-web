/**
 * Interface BindChannelTeamInput
 * @interface BindChannelTeamInput
 *
 * @description
 * Payload for `PATCH /api/channels/{id}/team`.
 *
 * `teamId` is required and explicitly nullable rather than optional: `null`
 * means "unbind", and omitting the key entirely is not the same thing. The
 * type forces the caller to say which they mean.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface BindChannelTeamInput {
  /** Bare team UUID, or `null` to unbind. */
  readonly teamId: string | null;
}
