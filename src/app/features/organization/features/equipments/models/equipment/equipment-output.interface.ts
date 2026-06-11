import type { HydraItem } from '@core/models/api';
import type { EquipmentTagOutput } from '../equipment-tag/equipment-tag-output.interface';

/**
 * Type EquipmentStatus
 *
 * @description
 * Supported lifecycle statuses for an equipment
 * resource.
 */
export type EquipmentStatus = 'in_stock' | 'operational' | 'decommissioned' | 'under_maintenance';

/**
 * Interface EquipmentOutput
 * @interface EquipmentOutput
 *
 * @description
 * Equipment resource returned by the API.
 */
export interface EquipmentOutput extends HydraItem {
  /**
   * Optional mission IRI when equipment belongs to a mission-scoped workflow.
   */
  readonly mission?: string | null;
  /**
   * Record lifecycle state used by draft/publish mission workflows.
   */
  readonly recordStatus?: 'draft' | 'published';
  /**
   * Monotonic revision returned by backend for optimistic publication checks.
   */
  readonly revision?: number;
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the equipment.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifier of the organization owning the equipment.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Identifier of the facility the equipment is assigned to.
   *
   * @type {string | null}
   */
  readonly facilityId: string | null;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Main equipment type.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property subType
   * @readonly
   *
   * @description
   * Optional subtype refining the main equipment type.
   *
   * @type {string | null}
   */
  readonly subType: string | null;

  /**
   * Property brand
   * @readonly
   *
   * @description
   * Manufacturer brand of the equipment.
   *
   * @type {string | null}
   */
  readonly brand: string | null;

  /**
   * Property model
   * @readonly
   *
   * @description
   * Model reference of the equipment.
   *
   * @type {string | null}
   */
  readonly model: string | null;

  /**
   * Property serialNumber
   * @readonly
   *
   * @description
   * Manufacturer serial number of the equipment.
   *
   * @type {string | null}
   */
  readonly serialNumber: string | null;

  /**
   * Property locationLabel
   * @readonly
   *
   * @description
   * Human-readable location label inside the facility.
   *
   * @type {string | null}
   */
  readonly locationLabel: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current lifecycle status of the equipment.
   *
   * @type {EquipmentStatus}
   */
  readonly status: EquipmentStatus;

  /**
   * Property installedAt
   * @readonly
   *
   * @description
   * Installation timestamp of the equipment.
   *
   * @type {string | null}
   */
  readonly installedAt: string | null;

  /**
   * Property commissionedAt
   * @readonly
   *
   * @description
   * Commissioning timestamp of the equipment.
   *
   * @type {string | null}
   */
  readonly commissionedAt: string | null;

  /**
   * Property tags
   * @readonly
   *
   * @description
   * Tags associated with the equipment.
   *
   * @type {ReadonlyArray<EquipmentTagOutput>}
   */
  readonly tags: ReadonlyArray<EquipmentTagOutput>;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp of the equipment.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Last update timestamp of the equipment.
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
