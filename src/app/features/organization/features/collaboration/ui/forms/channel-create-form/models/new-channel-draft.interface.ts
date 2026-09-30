/**
 * Interface ChannelCreateDraft
 * @interface
 *
 * @description
 * What {@link ChannelCreateForm} emits once the form is valid: a name and an
 * optional parent to nest the new channel under.
 *
 * @since 1.0.0
 */
export interface ChannelCreateDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this channel create.
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
