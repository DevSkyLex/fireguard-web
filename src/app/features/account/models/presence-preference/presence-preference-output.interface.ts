import type { HydraItem } from '@core/api/models';

/**
 * Interface PresencePreferenceOutput
 * @interface PresencePreferenceOutput
 * @description Confirmed global availability preference and its monotonic server revision.
 * @since 1.0.0
 */
export interface PresencePreferenceOutput extends HydraItem {
  /**
   * Property doNotDisturb
   * @readonly
   * @description Whether the account prefers silent availability across all devices.
   * @access public
   * @since 1.0.0
   * @type {boolean}
   */
  readonly doNotDisturb: boolean;
  /** Whether the account appears offline to other members across all devices. */
  readonly invisible?: boolean;
  /**
   * Property revision
   * @readonly
   * @description Monotonically increasing version of the persisted preference.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly revision: number;
}
