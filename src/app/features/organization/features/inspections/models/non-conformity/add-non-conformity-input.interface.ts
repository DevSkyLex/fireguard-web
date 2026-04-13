import type { NonConformitySeverity } from './non-conformity-output.interface';

/**
 * Interface AddNonConformityInput
 * @interface AddNonConformityInput
 *
 * @description
 * Payload used to add a non-conformity to an
 * inspection.
 */
export interface AddNonConformityInput {
  //#region Properties
  /** @type {string} */
  readonly description: string;
  /** @type {NonConformitySeverity} */
  readonly severity: NonConformitySeverity;
  /** @type {string | null} */
  readonly dueAt?: string | null;
  /** @type {string | null} */
  readonly notes?: string | null;
  //#endregion
}
