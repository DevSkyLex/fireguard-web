import type { HydraItem } from '@core/api/models';
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
 * Type EquipmentMaintenanceDueStatus
 *
 * @description
 * Where an equipment stands against its maintenance schedule.
 *
 * Orthogonal to {@link EquipmentStatus}: an `operational` asset can be
 * `overdue`, and a `decommissioned` one is simply `unscheduled`. The two must
 * never be collapsed into one column.
 */
export type EquipmentMaintenanceDueStatus = 'unscheduled' | 'up_to_date' | 'due_soon' | 'overdue';

/**
 * Type EquipmentType
 *
 * @description
 * Supported equipment types (mirrors the backend `EquipmentType` value
 * object). Used to constrain the type select in the create/edit form and
 * the type column filter, replacing free-text entry that produced a 400.
 */
export type EquipmentType =
  | 'fire_extinguisher'
  | 'smoke_detector'
  | 'heat_detector'
  | 'sprinkler'
  | 'fire_alarm_panel'
  | 'hydrant'
  | 'fire_door'
  | 'emergency_lighting'
  | 'access_control'
  | 'camera'
  | 'gas_detector'
  | 'other';

/**
 * Interface EquipmentOutput
 * @interface EquipmentOutput
 *
 * @description
 * Equipment resource returned by the API.
 */
export interface EquipmentOutput extends HydraItem {
  /**
   * Optional intervention IRI when equipment belongs to a intervention-scoped workflow.
   */
  readonly intervention?: string | null;
  /**
   * Record lifecycle state used by draft/publish intervention workflows.
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

  /**
   * Property maintenanceDueStatus
   * @readonly
   *
   * @description
   * Where the asset stands against its maintenance schedule. Resolved
   * cross-module by the backend, which defaults to `'unscheduled'` when no
   * schedule covers the equipment.
   *
   * @type {EquipmentMaintenanceDueStatus}
   */
  readonly maintenanceDueStatus: EquipmentMaintenanceDueStatus;
  //#endregion
}
