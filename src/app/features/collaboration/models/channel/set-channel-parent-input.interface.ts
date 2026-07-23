/**
 * Interface SetChannelParentInput
 * @interface SetChannelParentInput
 *
 * @description
 * Payload for `PATCH /api/channels/{id}/parent`. Rejected with `409` on a
 * cycle or a depth violation, `422` on a non-channel or cross-organization
 * parent.
 *
 * Required and explicitly nullable for the same reason as
 * {@link BindChannelTeamInput}: `null` means "detach".
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface SetChannelParentInput {
  /** Bare parent channel UUID, or `null` to detach. */
  readonly parentChannelId: string | null;
}
