import type { HydraItem } from '@core/api/models';
import type { EquipmentTagOutput } from '../equipment-tag/equipment-tag-output.interface';
import type { EquipmentMaintenanceDueStatus } from './equipment-maintenance-due-status.type';

/**
 * Type EquipmentStatus
 *
 * @description
 * Supported lifecycle statuses for an equipment
 * resource.
 *
 * @type {EquipmentStatus}
 */
export type EquipmentStatus = 'in_stock' | 'operational' | 'decommissioned' | 'under_maintenance';

/**
 * Type HistoricalEquipmentType
 *
 * @description
 * Historical equipment codes retained for compatibility and localized labels.
 *
 * @type {HistoricalEquipmentType}
 */
export type HistoricalEquipmentType =
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
 * Type EquipmentCriticality
 *
 * @description
 * Declared business impact when equipment is unavailable.
 *
 * @type {EquipmentCriticality}
 */
export type EquipmentCriticality = 'low' | 'medium' | 'high' | 'critical';

/**
 * Interface EquipmentTechnicalProperty
 * @interface EquipmentTechnicalProperty
 *
 * @description
 * Declarative characteristic; it never infers a regulatory obligation.
 */
export interface EquipmentTechnicalProperty {
  /**
   * Property key
   *
   * @description
   * Characteristic name, unique within the equipment.
   */
  readonly key: string;

  /**
   * Property value
   *
   * @description
   * Human-readable declared value.
   */
  readonly value: string;

  /**
   * Property unit
   *
   * @description
   * Optional unit associated with the declared value.
   */
  readonly unit?: string | null;
}

/**
 * Interface EquipmentPlanPosition
 * @interface EquipmentPlanPosition
 *
 * @description
 * The equipment's position pinned on one of its facility's floor-plan
 * attachments, with normalized 0–1 coordinates.
 */
export interface EquipmentPlanPosition {
  //#region Properties
  /**
   * Property attachmentId
   *
   * @description
   * Floor-plan attachment owning the normalized coordinate space.
   *
   * @type {string}
   */
  readonly attachmentId: string;
  /**
   * Property x
   *
   * @description
   * Horizontal coordinate normalized between zero and one.
   *
   * @type {number}
   */
  readonly x: number;
  /**
   * Property y
   *
   * @description
   * Vertical coordinate normalized between zero and one.
   *
   * @type {number}
   */
  readonly y: number;
  //#endregion
}

/**
 * Interface EquipmentOutput
 * @interface EquipmentOutput
 *
 * @description
 * Equipment resource returned by the API.
 */
export interface EquipmentOutput extends HydraItem {
  /**
   * Property controlDueStatus
   *
   * @description
   * Independent control operation due state; the historical maintenance status remains its alias.
   */
  readonly controlDueStatus?: EquipmentMaintenanceDueStatus;

  /**
   * Property serviceDueStatus
   *
   * @description
   * Independent maintenance operation due state, without affecting the control calendar.
   */
  readonly serviceDueStatus?: EquipmentMaintenanceDueStatus;

  /**
   * Property controlNextDueAt
   *
   * @description
   * Earliest server-computed next control deadline, absent when no control plan applies.
   */
  readonly controlNextDueAt?: string | null;

  /**
   * Property serviceNextDueAt
   *
   * @description
   * Earliest server-computed maintenance deadline, independent from control deadlines.
   */
  readonly serviceNextDueAt?: string | null;
  /**
   * Property name
   *
   * @description
   * Optional human-readable equipment name.
   */
  readonly name?: string | null;

  /**
   * Property assetCode
   *
   * @description
   * Organization-unique asset reference when supplied.
   */
  readonly assetCode?: string | null;

  /**
   * Property criticality
   *
   * @description
   * Declared operational impact of equipment unavailability.
   */
  readonly criticality?: EquipmentCriticality | null;

  /**
   * Property technicalProperties
   *
   * @description
   * Declarative characteristics with optional units.
   */
  readonly technicalProperties?: readonly EquipmentTechnicalProperty[];

  /**
   * Property predecessorEquipmentId
   *
   * @description
   * Historical equipment replaced by this equipment.
   */
  readonly predecessorEquipmentId?: string | null;

  /**
   * Property successorEquipmentId
   *
   * @description
   * Equipment that succeeded this retired equipment.
   */
  readonly successorEquipmentId?: string | null;
  /**
   * Property intervention
   *
   * @description
   * Optional intervention IRI for a draft equipment created within a work order.
   */
  readonly intervention?: string | null;
  /**
   * Property recordStatus
   *
   * @description
   * Draft or published record state used during intervention publication.
   */
  readonly recordStatus?: 'draft' | 'published';
  /**
   * Property revision
   *
   * @description
   * Monotonic revision used for optimistic publication checks.
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
   * Property planPosition
   * @readonly
   *
   * @description
   * Position pinned on a floor-plan attachment, populated on the detail read
   * (`GET .../equipment/{id}`) and the plan-position mutation only — the
   * list/collection endpoints deliberately leave it unset, so it arrives as
   * `null` there and a list row can never tell whether it is pinned.
   *
   * @type {EquipmentPlanPosition | null | undefined}
   */
  readonly planPosition?: EquipmentPlanPosition | null;

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
