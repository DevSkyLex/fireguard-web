import type { BoardColumn } from './board-column.interface';

/**
 * Type BoardColumnHeaderContext
 * @type BoardColumnHeaderContext
 *
 * @description
 * Typed column exposed to a caller-provided heading template.
 *
 * @template T - The caller-owned card data.
 * @template K - The column identifier type.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type BoardColumnHeaderContext<T, K extends string = string> = {
  /**
   * Property $implicit
   * @readonly
   *
   * @description
   * The column whose heading is being rendered.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {BoardColumn<T, K>}
   */
  readonly $implicit: BoardColumn<T, K>;
};
