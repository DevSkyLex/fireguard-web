/**
 * Interface PresencePreferenceInput
 * @interface PresencePreferenceInput
 * @description Global preference accepted by the authenticated account endpoint.
 * @since 1.0.0
 */
export interface PresencePreferenceInput {
  /**
   * Property doNotDisturb
   * @readonly
   * @description Explicit desired preference, including false to disable NPD.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly doNotDisturb: boolean;
  /** Whether the account appears offline to other members across all devices. */
  readonly invisible: boolean;
}
