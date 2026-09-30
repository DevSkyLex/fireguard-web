/**
 * Interface ChannelEditDraft
 * @interface
 *
 * @description
 * What {@link ChannelEditForm} emits once the form is valid: the channel's
 * name and its parent, both as the page last seeded them or as the member
 * changed them.
 *
 * @since 1.0.0
 */
export interface ChannelEditDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this channel edit.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property parentChannelId
   * @readonly
   *
   * @description
   * Bare parent channel UUID, or `null` for a root channel.
   *
   * @access public
   *
   * @type {string | null}
   */
  readonly parentChannelId: string | null;
}
