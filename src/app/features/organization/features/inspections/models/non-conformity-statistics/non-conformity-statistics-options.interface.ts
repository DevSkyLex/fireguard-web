/**
 * Interface NonConformityStatisticsOptions
 * @interface NonConformityStatisticsOptions
 *
 * @description
 * Optional `createdAt` window for the statistics snapshot. Both bounds are
 * inclusive ISO 8601 datetimes; an unparseable bound, or `from` after `to`,
 * is a 400.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NonConformityStatisticsOptions {
  //#region Properties
  /** @type {string | undefined} */
  readonly from?: string;
  /** @type {string | undefined} */
  readonly to?: string;
  //#endregion
}
