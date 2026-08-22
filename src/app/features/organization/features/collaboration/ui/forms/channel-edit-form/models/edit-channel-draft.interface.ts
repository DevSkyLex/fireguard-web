/**
 * Interface ChannelEditDraft
 *
 * @description
 * What {@link ChannelEditForm} emits once the form is valid: the channel's
 * name and its parent, both as the page last seeded them or as the member
 * changed them.
 *
 * @since 1.0.0
 */
export interface ChannelEditDraft {
  readonly name: string;
  /** Bare parent channel UUID, or `null` for a root channel. */
  readonly parentChannelId: string | null;
}
