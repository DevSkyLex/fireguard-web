/**
 * Interface ZoneGeometryDraftRow
 * @interface ZoneGeometryDraftRow
 * @description Percent strings preserve blank coordinates during editing.
 * @since 1.4.0
 */
export interface ZoneGeometryDraftRow {
  /**
   * Property x
   * @readonly
   * @description Horizontal percent coordinate.
   * @access public
   * @since 1.4.0
   * @type {string}
   */
  readonly x: string;
  /**
   * Property y
   * @readonly
   * @description Vertical percent coordinate.
   * @access public
   * @since 1.4.0
   * @type {string}
   */
  readonly y: string;
}
