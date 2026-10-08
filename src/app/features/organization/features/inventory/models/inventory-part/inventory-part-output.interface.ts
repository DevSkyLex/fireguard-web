import type { HydraItem } from '@core/api/models';

/**
 * Interface InventoryPartOutput
 * @interface InventoryPartOutput
 *
 * @description
 * An organization-owned quantitative part or consumable; complete equipment stays in the equipment
 * park.
 *
 * @since unreleased
 */
export interface InventoryPartOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable reference identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Permanent organization reference code.
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
   * Display name of the part or consumable.
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
   * Declared unit used for exact stock quantities.
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
   * Permanent quantitative reference category.
   *
   * @access public
   * @since unreleased
   *
   * @type {'part' | 'consumable'}
   */
  readonly kind: 'part' | 'consumable';

  /**
   * Property archived
   * @readonly
   *
   * @description
   * Archived references remain readable in histories.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly archived: boolean;
}
