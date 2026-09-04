import type { BoardColumn } from './board-column.interface';
import type { BoardItem } from './board-item.interface';

/**
 * Type BoardCardContext
 * @type BoardCardContext
 *
 * @description
 * Typed card slot with a move callback shared by pointer and keyboard controls.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type BoardCardContext<T, K extends string = string> = {
  /**
   * Property $implicit
   * @readonly
   *
   * @description
   * The rendered card and its pending state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {BoardItem<T>}
   */
  readonly $implicit: BoardItem<T>;

  /**
   * Property column
   * @readonly
   *
   * @description
   * The card’s current column.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {BoardColumn<T, K>}
   */
  readonly column: BoardColumn<T, K>;

  /**
   * Property move
   * @readonly
   *
   * @description
   * Requests a move through the same validation as pointer drops.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {(columnId: K) => void}
   */
  readonly move: (columnId: K) => void;
};
