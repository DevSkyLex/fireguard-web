import type { AvatarUrls, HydraItem } from '@core/models/api';

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
 * Interface InspectorOutput
 * @interface InspectorOutput
 *
 * @description
 * Inspector summary embedded in an inspection resource.
 */
export interface InspectorOutput {
  //#region Properties
  /** @type {InspectorType | string} */
  readonly type: InspectorType | string;
  /** @type {string | null} */
  readonly id: string | null;
  /** @type {string | null} */
  readonly firstName: string | null;
  /** @type {string | null} */
  readonly lastName: string | null;
  /** @type {string} */
  readonly displayName: string;
  /** @type {string | null} */
  readonly avatarUrl: string | null;
  /** @type {AvatarUrls | null} */
  readonly avatarUrls?: AvatarUrls | null;
  /** @type {string | null} */
  readonly organizationName: string | null;
  //#endregion
}

/**
 * Interface InspectionOutput
 * @interface InspectionOutput
 *
 * @description
 * Inspection resource returned by the API.
 */
export interface InspectionOutput extends HydraItem {
  /**
   * Optional mission IRI when inspection belongs to a mission.
   */
  readonly mission?: string | null;
  /**
   * Record lifecycle state supporting draft/publish mission workflows.
   */
  readonly recordStatus?: 'draft' | 'published';
  /**
   * Monotonic revision used for publication and optimistic checks.
   */
  readonly revision?: number;
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
  /** @type {InspectorOutput | null} */
  readonly inspector: InspectorOutput | null;
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
