/**
 * Interface EditChannelFormDraft
 * @interface
 *
 * @description
 * `ChannelEditForm`'s own field shape: a plain string for the parent
 * select, the empty string standing in for "no parent" so Signal Forms has
 * something to bind, converted to {@link ChannelEditDraft} on submit.
 *
 * @since 1.0.0
 */
export interface EditChannelFormDraft {
  /**
   * Property name
   * @readonly
   *
   * @description
   * Provides the display name of this edit channel form.
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
   * Identifies the parent channel associated with this edit channel form.
   *
   * @access public
   *
   * @type {string}
   */
  readonly parentChannelId: string;
}
