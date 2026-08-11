import type { HydraItem } from '@core/api/models';
import type { EquipmentTagOutput } from '../equipment-tag/equipment-tag-output.interface';
import type { EquipmentMaintenanceDueStatus } from './equipment-maintenance-due-status.type';

/**
 * Type EquipmentStatus
 *
 * @description
 * Supported lifecycle statuses for an equipment
 * resource.
 */
export type EquipmentStatus = 'in_stock' | 'operational' | 'decommissioned' | 'under_maintenance';

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
   * Property facilityName
   * @readonly
   *
   * @description
   * Display name of the assigned facility, resolved server-side through the
   * Facility module. `null` when unassigned, or when the name could not be
   * resolved — an unresolved name is not a blank name.
   *
   * @type {string | null}
   */
  readonly facilityName: string | null;

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
   * Property maintenanceDueStatus
   * @readonly
   *
   * @description
   * How close the next scheduled maintenance is, resolved cross-module from
   * the Maintenance module; `unscheduled` when the equipment has no
   * maintenance schedule.
   *
   * @type {EquipmentMaintenanceDueStatus}
   */
  readonly maintenanceDueStatus: EquipmentMaintenanceDueStatus;

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
