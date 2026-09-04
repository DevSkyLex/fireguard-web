/**
 * Interface BoardMove
 * @interface BoardMove
 *
 * @description
 * A validated move request whose persistence and rollback belong to the caller.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface BoardMove<T, K extends string = string> {
  /**
   * Property item
   * @readonly
   *
   * @description
   * Caller-owned data of the card being moved.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {T}
   */
  readonly item: T;

  /**
   * Property columnId
   * @readonly
   *
   * @description
   * Requested destination column.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {K}
   */
  readonly columnId: K;
}
