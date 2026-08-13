/**
 * Interface InterventionSiteStatisticOutput
 * @interface InterventionSiteStatisticOutput
 *
 * @description
 * One row of `InterventionStatisticsOutput.bySite`'s top-10 breakdown.
 */
export interface InterventionSiteStatisticOutput {
  //#region Properties
  /**
   * Property siteId
   * @readonly
   *
   * @type {string}
   */
  readonly siteId: string;

  /**
   * Property siteName
   * @readonly
   *
   * @type {string | null}
   */
  readonly siteName: string | null;

  /**
   * Property count
   * @readonly
   *
   * @type {number}
   */
  readonly count: number;
  //#endregion
}
