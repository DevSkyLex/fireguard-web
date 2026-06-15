import type { HydraItem } from '@core/models/api';

/**
 * Interface ReferencePackOutput
 * @interface ReferencePackOutput
 *
 * @description
 * Defines the regulatory reference pack output contract.
 */
export interface ReferencePackOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property country
   * @readonly
   *
   * @type {string}
   */
  readonly country: string;

  /**
   * Property regime
   * @readonly
   *
   * @type {string}
   */
  readonly regime: string;

  /**
   * Property name
   * @readonly
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property version
   * @readonly
   *
   * @type {string}
   */
  readonly version: string;

  /**
   * Property recommendedEquipmentTypes
   * @readonly
   *
   * @type {readonly string[]}
   */
  readonly recommendedEquipmentTypes: readonly string[];
}
