import type { FacilityType } from '../facility/facility-output.interface';
import type {
  InspectionResult,
  InspectionStatus,
  InspectorType,
} from '../inspection/inspection-output.interface';
import type {
  NonConformitySeverity,
  NonConformityStatus,
} from '../inspection/non-conformity-output.interface';

/**
 * Type OrganizationDashboardGranularity
 *
 * @description
 * Supported granularity values for the organization
 * dashboard trends.
 */
export type OrganizationDashboardGranularity =
  | 'day'
  | 'week'
  | 'month'
  | 'auto';

/**
 * Type OrganizationDashboardEquipmentType
 *
 * @description
 * Supported equipment types for filtering
 * organization dashboard data.
 */
export type OrganizationDashboardEquipmentType =
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
 * Type OrganizationDashboardEquipmentStatus
 *
 * @description
 * Supported equipment status values for filtering
 * organization dashboard data.
 */
export type OrganizationDashboardEquipmentStatus =
  | 'in_stock'
  | 'operational'
  | 'under_maintenance'
  | 'decommissioned';

/**
 * Type OrganizationDashboardQueryOptions
 *
 * @description
 * Supported query options for organization
 * dashboard data requests.
 */
export interface OrganizationDashboardCommonQueryOptions {
  //#region Properties
  /**
   * Property from
   * @readonly
   *
   * @description
   * Start date for the dashboard data period,
   * in ISO 8601 format.
   *
   * @type {string}
   */
  readonly from?: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * End date for the dashboard data period,
   * in ISO 8601 format.
   *
   * @type {string}
   */
  readonly to?: string;

  /**
   * Property compare
   * @readonly
   *
   * @description
   * Whether to compare the current period
   * with the previous period.
   *
   * @type {boolean}
   */
  readonly compare?: boolean;

  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Timezone for the dashboard data period.
   *
   * @type {string}
   */
  readonly timezone?: string;
  //#endregion
}

/**
 * Interface OrganizationDashboardQueryOptions
 * @interface OrganizationDashboardQueryOptions
 *
 * @description
 * Query options for organization dashboard data requests, including
 * common options and specific filters for facilities, equipment,
 * inspections, and non-conformities.
 */
export interface OrganizationDashboardQueryOptions {
  //#region Properties
  /**
   * Property from
   * @readonly
   *
   * @description
   * Start date for the dashboard data period,
   * in ISO 8601 format.
   *
   * @type {string}
   */
  readonly from?: string;

  /**
   * Property to
   * @readonly
   *
   * @description
   * End date for the dashboard data period,
   * in ISO 8601 format.
   *
   * @type {string}
   */
  readonly to?: string;

  /**
   * Property compare
   * @readonly
   *
   * @description
   * Whether to compare the current period
   * with the previous period.
   *
   * @type {boolean}
   */
  readonly compare?: boolean;

  /**
   * Property timezone
   * @readonly
   *
   * @description
   * Timezone for the dashboard data period.
   *
   * @type {string}
   */
  readonly timezone?: string;

  /**
   * Property facilityType
   * @readonly
   *
   * @description
   * Type of facility for filtering dashboard data.
   *
   * @type {FacilityType}
   */
  readonly facilityType?: FacilityType;

  /**
   * Property equipmentType
   * @readonly
   *
   * @description
   * Type of equipment for filtering dashboard data.
   *
   * @type {OrganizationDashboardEquipmentType}
   */
  readonly equipmentType?: OrganizationDashboardEquipmentType;

  /**
   * Property equipmentStatus
   * @readonly
   *
   * @description
   * Status of equipment for filtering dashboard data.
   *
   * @type {OrganizationDashboardEquipmentStatus}
   */
  readonly equipmentStatus?: OrganizationDashboardEquipmentStatus;

  /**
   * Property inspectionStatus
   * @readonly
   *
   * @description
   * Status of inspections for filtering dashboard data.
   *
   * @type {InspectionStatus}
   */
  readonly inspectionStatus?: InspectionStatus;

  /**
   * Property inspectionResult
   * @readonly
   *
   * @description
   * Result of inspections for filtering dashboard data.
   *
   * @type {InspectionResult}
   */
  readonly inspectionResult?: InspectionResult;

  /**
   * Property inspectorType
   * @readonly
   *
   * @description
   * Type of inspector for filtering dashboard data.
   *
   * @type {InspectorType}
   */
  readonly inspectorType?: InspectorType;

  /**
   * Property nonConformityStatus
   * @readonly
   *
   * @description
   * Status of non-conformities for filtering dashboard data.
   *
   * @type {NonConformityStatus}
   */
  readonly nonConformityStatus?: NonConformityStatus;

  /**
   * Property nonConformitySeverity
   * @readonly
   *
   * @description
   * Severity of non-conformities for filtering dashboard data.
   *
   * @type {NonConformitySeverity}
   */
  readonly nonConformitySeverity?: NonConformitySeverity;
  //#endregion
}

/**
 * Interface OrganizationDashboardTrendQueryOptions
 * @interface OrganizationDashboardTrendQueryOptions
 *
 * @description
 * Query options for organization dashboard trend data requests, extending
 * common query options with an additional granularity option.
 */
export interface OrganizationDashboardTrendQueryOptions extends OrganizationDashboardCommonQueryOptions {
  //#region Properties
  /**
   * Property granularity
   * @readonly
   *
   * @description
   * Granularity for the dashboard trend data.
   *
   * Supported values are 'day', 'week', 'month', and 'auto'.
   *
   * @type {OrganizationDashboardGranularity}
   */
  readonly granularity?: OrganizationDashboardGranularity;
  //#endregion
}

/**
 * Interface OrganizationDashboardEquipmentTrendQueryOptions
 * @interface OrganizationDashboardEquipmentTrendQueryOptions
 *
 * @description
 * Query options for equipment-related organization dashboard
 * trend data requests, extending the common trend query options
 * with specific filters for equipment type and status.
 */
export interface OrganizationDashboardEquipmentTrendQueryOptions extends OrganizationDashboardTrendQueryOptions {
  //#region Properties
  /**
   * Property equipmentType
   * @readonly
   *
   * @description
   * Type of equipment for filtering dashboard
   * trend data.
   *
   * @type {OrganizationDashboardEquipmentType}
   */
  readonly equipmentType?: OrganizationDashboardEquipmentType;

  /**
   * Property equipmentStatus
   * @readonly
   *
   * @description
   * Status of equipment for filtering dashboard
   * trend data.
   *
   * @type {OrganizationDashboardEquipmentStatus}
   */
  readonly equipmentStatus?: OrganizationDashboardEquipmentStatus;

  /**
   * Property granularity
   * @readonly
   *
   * @description
   * Granularity for the dashboard trend data.
   *
   * Supported values are 'day', 'week', 'month', and 'auto'.
   *
   * @type {OrganizationDashboardGranularity}
   */
  readonly granularity?: OrganizationDashboardGranularity;
  //endregion
}

/**
 * Interface OrganizationDashboardInspectionTrendQueryOptions
 * @interface OrganizationDashboardInspectionTrendQueryOptions
 *
 * @description
 * Query options for inspection-related organization dashboard
 * trend data requests, extending the common trend query options
 * with specific filters for inspection status, result, and inspector type.
 */
export interface OrganizationDashboardInspectionTrendQueryOptions extends OrganizationDashboardTrendQueryOptions {
  //#region Properties
  /**
   * Property inspectionStatus
   * @readonly
   *
   * @description
   * Status of inspections for filtering
   * dashboard trend data.
   *
   * @type {InspectionStatus}
   */
  readonly inspectionStatus?: InspectionStatus;

  /**
   * Property inspectionResult
   * @readonly
   *
   * @description
   * Result of inspections for filtering
   * dashboard trend data.
   *
   * @type {InspectionResult}
   */
  readonly inspectionResult?: InspectionResult;

  /**
   * Property inspectorType
   * @readonly
   *
   * @description
   * Type of inspector for filtering
   * dashboard trend data.
   *
   * @type {InspectorType}
   */
  readonly inspectorType?: InspectorType;
  //#endregion
}

/**
 * Interface OrganizationDashboardNonConformityTrendQueryOptions
 * @interface OrganizationDashboardNonConformityTrendQueryOptions
 *
 * @description
 * Query options for non-conformity-related organization dashboard
 * trend data requests, extending the common trend query options
 * with specific filters for non-conformity status and severity.
 */
export interface OrganizationDashboardNonConformityTrendQueryOptions extends OrganizationDashboardTrendQueryOptions {
  //#region Properties
  /**
   * Property nonConformityStatus
   * @readonly
   *
   * @description
   * Status of non-conformities for filtering
   * dashboard trend data.
   *
   * @type {NonConformityStatus}
   */
  readonly nonConformityStatus?: NonConformityStatus;

  /**
   * Property nonConformitySeverity
   * @readonly
   *
   * @description
   * Severity of non-conformities for filtering
   * dashboard trend data.
   *
   * @type {NonConformitySeverity}
   */
  readonly nonConformitySeverity?: NonConformitySeverity;
  //#endregion
}

/**
 * Interface OrganizationDashboardFacilityTrendQueryOptions
 * @interface OrganizationDashboardFacilityTrendQueryOptions
 *
 * @description
 * Query options for facility-related organization dashboard
 * trend data requests, extending the common trend query options
 * with a specific filter for facility type.
 */
export interface OrganizationDashboardFacilityTrendQueryOptions extends OrganizationDashboardTrendQueryOptions {
  //#region Properties
  /**
   * Property facilityType
   * @readonly
   *
   * @description
   * Type of facility for filtering dashboard
   * trend data.
   *
   * @type {FacilityType}
   */
  readonly facilityType?: FacilityType;
  //#endregion
}
