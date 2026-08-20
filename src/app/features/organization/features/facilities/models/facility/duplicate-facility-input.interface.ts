/**
 * Interface DuplicateFacilityInput
 * @interface DuplicateFacilityInput
 *
 * @description
 * Optional payload for duplicating a facility. Both fields default
 * server-side — the copy's name to `"{original} (copy)"` and its parent to
 * the source facility's own parent — so an empty body is a valid request.
 */
export interface DuplicateFacilityInput {
  //#region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Name for the duplicated facility. 2 to 120 characters.
   *
   * @type {string | undefined}
   */
  readonly name?: string;

  /**
   * Property parentFacilityId
   * @readonly
   *
   * @description
   * Identifier of the parent facility for the duplicate. Defaults to the
   * source facility's own parent.
   *
   * @type {string | undefined}
   */
  readonly parentFacilityId?: string;
  //#endregion
}
