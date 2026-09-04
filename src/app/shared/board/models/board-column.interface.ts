import type { BoardItem } from './board-item.interface';

/**
 * Interface BoardColumn
 * @interface BoardColumn
 *
 * @description
 * One ordered column; grouping and card order belong to the caller.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface BoardColumn<T, K extends string = string> {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable column identifier used for move destinations.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {K}
   */
  readonly id: K;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Visible heading and accessible column name.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property items
   * @readonly
   *
   * @description
   * Ordered cards currently assigned to the column.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly BoardItem<T>[]}
   */
  readonly items: readonly BoardItem<T>[];
}
