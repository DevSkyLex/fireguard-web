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

  /**
   * Identifier of the equipment the parent inspection was performed on.
   * Populated only by listings that resolve it (the organization-wide
   * non-conformity collection); `null` on the per-inspection endpoints, which
   * already carry the inspection context the frontend used to get here.
   *
   * @type {(string | null | undefined)}
   * @since 1.2.0
   */
  readonly equipmentId?: string | null;

  /**
   * Serial number of the inspected equipment, resolved server-side through the
   * Equipment module's naming port for the same reason
   * {@link InspectionOutput.equipmentSerialNumber} exists: a UUID names
   * nothing to the agent standing in front of the device. `null` when
   * unresolved, or when the endpoint does not resolve it.
   *
   * @type {(string | null | undefined)}
   * @since 1.2.0
   */
  readonly equipmentSerialNumber?: string | null;
  //#endregion
}
