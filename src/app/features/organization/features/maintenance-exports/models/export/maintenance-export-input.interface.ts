/**
 * Interface CreateMaintenanceExportInput
 * @interface CreateMaintenanceExportInput
 *
 * @description
 * Accepted creation keeps a stable operation identity and exact bounded dossier selection.
 */
export interface CreateMaintenanceExportInput {
  /**
   * Property clientOperationId
   *
   * @description
   * Stable operation receipt identity.
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property interventionIds
   *
   * @description
   * One to one hundred selected published dossiers.
   *
   * @type {readonly string[]}
   */
  readonly interventionIds: readonly string[];

  /**
   * Property system
   *
   * @description
   * External target code of at most forty characters.
   *
   * @type {string}
   */
  readonly system: string;

  /**
   * Property includeInternalCosts
   *
   * @description
   * Private internal costs explicitly requested with dedicated permission.
   *
   * @type {boolean}
   */
  readonly includeInternalCosts: boolean;
}

/**
 * Interface AdjustMaintenanceExportInput
 * @interface AdjustMaintenanceExportInput
 *
 * @description
 * Motivated correction appends a linked archive without changing the original bytes.
 */
export interface AdjustMaintenanceExportInput {
  /**
   * Property clientOperationId
   *
   * @description
   * Stable adjustment receipt identity.
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property reason
   *
   * @description
   * Operator reason for the appended correction.
   *
   * @type {string}
   */
  readonly reason: string;
}

/**
 * Interface ConfirmMaintenanceExportInput
 * @interface ConfirmMaintenanceExportInput
 *
 * @description
 * External import is acknowledged only after the operator supplies its actual reference.
 */
export interface ConfirmMaintenanceExportInput {
  /**
   * Property clientOperationId
   *
   * @description
   * Stable acknowledgement receipt identity.
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property externalImportReference
   *
   * @description
   * Actual external import reference.
   *
   * @type {string}
   */
  readonly externalImportReference: string;
}

/**
 * Interface WriteMaintenanceExportReferenceInput
 * @interface WriteMaintenanceExportReferenceInput
 *
 * @description
 * Exact external mapping command retains its operation identity across transport retries.
 */
export interface WriteMaintenanceExportReferenceInput {
  /**
   * Property clientOperationId
   *
   * @description
   * Stable mapping write identity.
   *
   * @type {string}
   */
  readonly clientOperationId: string;

  /**
   * Property system
   *
   * @description
   * Target external system code.
   *
   * @type {string}
   */
  readonly system: string;

  /**
   * Property reference
   *
   * @description
   * External resource identifier.
   *
   * @type {string}
   */
  readonly reference: string;
}
