/**
 * Interface CreateInventoryPartInput
 * @interface CreateInventoryPartInput
 *
 * @description
 * Creates a quantitative reference, without registering an individual equipment.
 *
 * @since unreleased
 */
export interface CreateInventoryPartInput {
  /**
   * Property code
   * @readonly
   *
   * @description
   * Permanent unique organization code, limited to 100 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly code: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Display name, limited to 255 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property unit
   * @readonly
   *
   * @description
   * Declared stock unit, limited to 32 characters.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly unit: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Immutable quantitative reference category.
   *
   * @access public
   * @since unreleased
   *
   * @type {'part' | 'consumable'}
   */
  readonly kind: 'part' | 'consumable';
}
