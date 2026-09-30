import type { HydraItem } from './hydra-item.interface';

/**
 * Interface OptionOutput
 * @interface OptionOutput
 *
 * @description
 * Generic value/label reference item returned by many catalog endpoints.
 */
export interface OptionOutput extends HydraItem {
  /**
   * Property value
   * @readonly
   *
   * @description
   * Machine value carried by this catalog option; `label` is its user-facing text.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly value: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * User-facing text paired with the option's machine value.
   *
   * @access public
   * @since 0.1.0
   *
   * @type {string}
   */
  readonly label: string;
}
