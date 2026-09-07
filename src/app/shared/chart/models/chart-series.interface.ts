import type { ChartColorToken } from './chart-color-token.type';
import type { ChartPoint } from './chart-point.interface';

/**
 * Interface ChartSeries
 * @interface ChartSeries
 *
 * @description
 * One named line or area — the shape every `shared/chart` component
 * accepts, so a caller never has to build the chart renderer's dataset shape
 * directly.
 *
 * @since 1.0.0
 */
export interface ChartSeries {
  /**
   * Property name
   * @readonly
   *
   * @description Human-readable series name used by legends and tooltips.
   * @access public
   * @since 1.0.0
   * @type {string}
   */
  readonly name: string;

  /**
   * Property points
   * @readonly
   *
   * @description Ordered category samples, including explicit unavailable gaps.
   * @access public
   * @since 1.0.0
   * @type {readonly ChartPoint[]}
   */
  readonly points: readonly ChartPoint[];

  /**
   * Property colorToken
   * @readonly
   *
   * @description Optional semantic color; the chart palette supplies the default.
   * @access public
   * @since 1.0.0
   * @type {ChartColorToken | undefined}
   */
  readonly colorToken?: ChartColorToken;
}
