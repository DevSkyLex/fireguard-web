import type { HydraItem } from '@core/models/api';

/**
 * Type InspectionResult
 *
 * @description
 * Supported result values for an inspection.
 */
export type InspectionResult = 'pass' | 'fail' | 'partial';

/**
 * Type InspectionStatus
 *
 * @description
 * Supported workflow statuses for an inspection.
 */
export type InspectionStatus = 'draft' | 'submitted' | 'closed';

/**
 * Type InspectorType
 *
 * @description
 * Supported inspector origin types for an inspection.
 */
export type InspectorType = 'user' | 'external';

/**
 * Interface InspectionOutput
 * @interface InspectionOutput
 *
 * @description
 * Inspection resource returned by the API.
 */
export interface InspectionOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly equipmentId: string;
  /** @type {string | null} */
  readonly facilityId: string | null;
  /** @type {InspectionResult} */
  readonly result: InspectionResult;
  /** @type {InspectionStatus} */
  readonly status: InspectionStatus;
  /** @type {string} */
  readonly performedAt: string;
  /** @type {InspectorType} */
  readonly inspectorType: InspectorType;
  /** @type {string} */
  readonly inspectorName: string;
  /** @type {string | null} */
  readonly inspectorUserId: string | null;
  /** @type {string | null} */
  readonly inspectorOrganizationName: string | null;
  /** @type {string | null} */
  readonly checklistId: string | null;
  /** @type {string | null} */
  readonly notes: string | null;
  /** @type {string | null} */
  readonly signature: string | null;
  /** @type {number} */
  readonly nonConformitiesCount: number;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
