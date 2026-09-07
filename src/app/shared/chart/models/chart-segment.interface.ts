import type { ChartColorToken } from './chart-color-token.type';

/**
 * Interface ChartSegment
 * @interface ChartSegment
 * @description A named share of a total, with a stable identity and semantic theme color.
 * @since 1.0.0
 */
export interface ChartSegment {
  /**
   * Property id
   * @readonly
   * @description Stable identity of this segment.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly id: string;
  /**
   * Property label
   * @readonly
   * @description Human-readable segment name, also used by assistive technology.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly label: string;
  /**
   * Property value
   * @readonly
   * @description Finite non-negative count contributing to the total.
   * @access public
   * @since 1.0.0
   * @type {number}
   */
  readonly value: number;
  /**
   * Property colorToken
   * @readonly
   * @description Semantic theme token, without the CSS variable prefix.
   * @access public
   * @since 1.0.0
   * @type {ChartColorToken}
   */
  readonly colorToken: ChartColorToken;
}
