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

  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
