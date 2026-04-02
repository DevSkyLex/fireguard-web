import type { NonConformityStatus } from './non-conformity-output.interface';

/**
 * Interface UpdateNonConformityStatusInput
 * @interface UpdateNonConformityStatusInput
 *
 * @description
 * Payload used to update the status of a
 * non-conformity.
 */
export interface UpdateNonConformityStatusInput {
  //#region Properties
  /** @type {NonConformityStatus} */
  readonly status?: NonConformityStatus;
  //#endregion
}
