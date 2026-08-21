/**
 * Interface NewChannelFormDraft
 *
 * @description
 * `ChannelCreateForm`'s own field shape: a plain string for the parent
 * select, the empty string standing in for "no parent" so Signal Forms has
 * something to bind, converted to {@link ChannelCreateDraft} on submit.
 *
 * @since 1.0.0
 */
export interface NewChannelFormDraft {
  readonly name: string;
  readonly parentChannelId: string;
}
