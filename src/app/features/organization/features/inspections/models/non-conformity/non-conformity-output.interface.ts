import type { HydraItem } from '@core/api/models';

/**
 * Type NonConformitySeverity
 *
 * @description
 * Supported severity levels for a non-conformity.
 *
 * @type NonConformitySeverity
 */
export type NonConformitySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Type NonConformityStatus
 *
 * @description
 * Supported lifecycle statuses for a non-conformity.
 *
 * @type NonConformityStatus
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
  /**
   * Property id
   *
   * @type {string}
   */
  readonly id: string;
  /**
   * Property inspectionId
   *
   * @type {string}
   */
  readonly inspectionId: string;
  /**
   * Property description
   *
   * @type {string}
   */
  readonly description: string;
  /**
   * Property severity
   *
   * @type {NonConformitySeverity}
   */
  readonly severity: NonConformitySeverity;
  /**
   * Property status
   *
   * @type {NonConformityStatus}
   */
  readonly status: NonConformityStatus;
  /**
   * Property dueAt
   *
   * @description
   * Unset deadlines may be omitted by API skip-null serialization.
   *
   * @type {string | null | undefined}
   */
  readonly dueAt?: string | null;
  /**
   * Property resolvedAt
   *
   * @description
   * Unset resolution dates may be omitted by API skip-null serialization.
   *
   * @type {string | null | undefined}
   */
  readonly resolvedAt?: string | null;
  /**
   * Property notes
   *
   * @description
   * Unset notes may be omitted by API skip-null serialization.
   *
   * @type {string | null | undefined}
   */
  readonly notes?: string | null;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Inspected equipment reference, resolved ONLY by the organization-wide
   * register (`GET /organizations/{id}/non-conformities`) — the
   * per-inspection endpoints leave it unset, so it arrives as `undefined`
   * there, never `null`.
   *
   * @type {string | null | undefined}
   */
  readonly equipmentId?: string | null;

  /**
   * Property equipmentSerialNumber
   * @readonly
   *
   * @description
   * Serial number of the inspected equipment — same resolution rule as
   * {@link equipmentId}: organization-wide register only.
   *
   * @type {string | null | undefined}
   */
  readonly equipmentSerialNumber?: string | null;

  /**
   * Property createdAt
   *
   * @type {string}
   */
  readonly createdAt: string;
  /**
   * Property updatedAt
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
