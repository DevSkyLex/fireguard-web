import type { HydraItem } from '@core/api/models';

/**
 * Type NonConformitySeverity
 *
 * @description
 * Supported severity levels for a non-conformity.
 */
export type NonConformitySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Type NonConformityStatus
 *
 * @description
 * Supported lifecycle statuses for a non-conformity.
 */
export type NonConformityStatus = 'open' | 'in_progress' | 'done' | 'waived';

/**
 * Interface NonConformityOutput
 * @interface NonConformityOutput
 *
 * @description
 * Non-conformity resource returned by the API.
 */
export interface NonConformityOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly inspectionId: string;
  /** @type {string} */
  readonly description: string;
  /** @type {NonConformitySeverity} */
  readonly severity: NonConformitySeverity;
  /** @type {NonConformityStatus} */
  readonly status: NonConformityStatus;
  /** @type {string | null} */
  readonly dueAt: string | null;
  /** @type {string | null} */
  readonly resolvedAt: string | null;
  /** @type {string | null} */
  readonly notes: string | null;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
