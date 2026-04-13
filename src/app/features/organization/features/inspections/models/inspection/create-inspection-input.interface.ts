import type { InspectionResult, InspectorType } from './inspection-output.interface';

/**
 * Interface CreateInspectionInput
 * @interface CreateInspectionInput
 *
 * @description
 * Payload used to create an inspection resource.
 */
export interface CreateInspectionInput {
  //#region Properties
  /** @type {string} */
  readonly equipmentId: string;
  /** @type {InspectionResult} */
  readonly result: InspectionResult;
  /** @type {string} */
  readonly performedAt: string;
  /** @type {InspectorType} */
  readonly inspectorType: InspectorType;
  /** @type {string} */
  readonly inspectorName: string;
  /** @type {string | null} */
  readonly facilityId?: string | null;
  /** @type {string | null} */
  readonly checklistId?: string | null;
  /** @type {string | null} */
  readonly inspectorUserId?: string | null;
  /** @type {string | null} */
  readonly inspectorOrganizationName?: string | null;
  /** @type {string | null} */
  readonly notes?: string | null;
  /** @type {string | null} */
  readonly signature?: string | null;
  //#endregion
}
