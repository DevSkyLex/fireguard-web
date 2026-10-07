import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';

/**
 * Interface InterventionEquipmentCatalogSnapshot
 * @interface InterventionEquipmentCatalogSnapshot
 *
 * @description
 * Complete authorized equipment catalogue persisted with an account-scoped field workspace.
 */
export interface InterventionEquipmentCatalogSnapshot {
  /**
   * Property version
   * @readonly
   *
   * @description
   * Snapshot format version used to validate persisted metadata.
   *
   * @access public
   *
   * @type {1}
   */
  readonly version: 1;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Account that was authorized to read this catalogue.
   *
   * @access public
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization whose equipment type codes and labels the catalogue describes.
   *
   * @access public
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property capturedAt
   * @readonly
   *
   * @description
   * Capture instant of the complete authorized catalogue, independent of task execution dates.
   *
   * @access public
   *
   * @type {string}
   */
  readonly capturedAt: string;

  /**
   * Property entries
   * @readonly
   *
   * @description
   * Complete server catalogue, including archived types needed to read historical equipment.
   *
   * @access public
   *
   * @type {readonly EquipmentTypeOutput[]}
   */
  readonly entries: readonly EquipmentTypeOutput[];
}
