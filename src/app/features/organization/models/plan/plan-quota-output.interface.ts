/**
 * Interface PlanQuotaOutput
 * @interface PlanQuotaOutput
 *
 * @description
 * One per-resource allowance descriptor of a plan: the raw cap plus a ready-made
 * human sentence (for example "Up to 125 facilities" / "Unlimited inspections")
 * provided by the API so cards render without re-deriving the wording.
 */
export interface PlanQuotaOutput {
  //#region Properties
  /**
   * Property resource
   * @readonly
   *
   * @description
   * Open backend identifier for the resource counted by this quota.
   *
   * @type {string}
   */
  readonly resource: string;

  /**
   * Property label
   * @readonly
   *
   * @description
   * Backend-provided display name of the counted resource.
   *
   * @type {string}
   */
  readonly label: string;

  /**
   * Property limit
   * @readonly
   *
   * @description
   * Maximum allowed quantity, or null for an unlimited resource.
   *
   * @type {number | null}
   */
  readonly limit: number | null;

  /**
   * Property summary
   * @readonly
   *
   * @description
   * Backend-provided sentence describing this allowance.
   *
   * @type {string}
   */
  readonly summary: string;
  //#endregion
}
