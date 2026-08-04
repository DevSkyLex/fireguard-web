/**
 * Interface NotFoundOrigin
 * @interface NotFoundOrigin
 *
 * @description
 * What a failed address was reaching for, as far as it can be read from the
 * URL alone: the organization it belonged to, and the collection segment that
 * followed. Both are `null` when the address carried neither.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotFoundOrigin {
  //#region Properties
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization identifier read from an `/organizations/{id}` address.
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property collection
   * @readonly
   *
   * @description
   * Recognised collection segment that followed the organization, such as
   * `interventions` or `facilities`. `null` when the segment is absent or is
   * not one the application serves.
   *
   * @type {string | null}
   */
  readonly collection: string | null;
  //#endregion
}
