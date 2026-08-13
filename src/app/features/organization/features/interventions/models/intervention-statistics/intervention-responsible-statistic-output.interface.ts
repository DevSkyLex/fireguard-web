/**
 * Interface InterventionResponsibleStatisticOutput
 * @interface InterventionResponsibleStatisticOutput
 *
 * @description
 * One row of `InterventionStatisticsOutput.byResponsible`'s top-10 breakdown.
 */
export interface InterventionResponsibleStatisticOutput {
  //#region Properties
  /**
   * Property memberId
   * @readonly
   *
   * @type {string}
   */
  readonly memberId: string;

  /**
   * Property displayName
   * @readonly
   *
   * @type {string | null}
   */
  readonly displayName: string | null;

  /**
   * Property count
   * @readonly
   *
   * @type {number}
   */
  readonly count: number;
  //#endregion
}
