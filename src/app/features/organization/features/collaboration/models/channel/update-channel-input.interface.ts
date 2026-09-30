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
  /**
   * Property name
   * @readonly
   *
   * @description
   * Sets the channel name supplied by this update.
   *
   * @access public
   *
   * @type {string}
   */
  readonly name?: string;

  /**
   * Property isArchived
   * @readonly
   *
   * @description
   * Includes or excludes archived update channel records according to this filter.
   *
   * @access public
   *
   * @type {boolean}
   */
  readonly isArchived?: boolean;
}
