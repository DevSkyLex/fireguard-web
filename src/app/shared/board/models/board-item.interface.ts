/**
 * Interface BoardItem
 * @interface BoardItem
 *
 * @description
 * An identified card carrying caller-owned data and an accessible name.
 *
 * @template T - The caller-owned card data.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface BoardItem<T> {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable identifier, unique across the board.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name used when announcing move requests.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property data
   * @readonly
   *
   * @description
   * Caller-owned content passed to the card template.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {T}
   */
  readonly data: T;

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Prevents moves while the card is locked or updating.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean | undefined}
   */
  readonly disabled?: boolean;
}
