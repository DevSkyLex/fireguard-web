/**
 * Interface NewChannelDraft
 *
 * @description
 * What {@link ChannelCreateForm} emits once the form is valid: a name and an
 * optional parent to nest the new channel under.
 *
 * @since 1.0.0
 */
export interface NewChannelDraft {
  readonly name: string;
  /** Bare parent channel UUID, or `null` for a root channel. */
  readonly parentChannelId: string | null;
}
