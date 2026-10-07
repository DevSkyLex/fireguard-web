/**
 * Interface UpdateInventoryPartInput
 * @interface UpdateInventoryPartInput
 *
 * @description
 * Only mutable reference descriptions and archive state can be changed; code and kind stay
 * permanent.
 *
 * @since unreleased
 */
export interface UpdateInventoryPartInput {
  /**
   * Property label
   * @readonly
   *
   * @description
   * Optional replacement display name.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly label?: string;

  /**
   * Property unit
   * @readonly
   *
   * @description
   * Optional replacement declared stock unit.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | undefined}
   */
  readonly unit?: string;

  /**
   * Property archived
   * @readonly
   *
   * @description
   * Optional archive or restoration intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean | undefined}
   */
  readonly archived?: boolean;
}
