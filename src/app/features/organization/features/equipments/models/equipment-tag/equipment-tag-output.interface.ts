import type { HydraItem } from '@core/models/api';

/**
 * Interface EquipmentTagOutput
 * @interface EquipmentTagOutput
 *
 * @description
 * Tag resource associated with equipment entries.
 */
export interface EquipmentTagOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the tag.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Human-readable tag name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifier of the organization owning the tag.
   *
   * @type {string}
   */
  readonly organizationId: string;
  //#endregion
}
