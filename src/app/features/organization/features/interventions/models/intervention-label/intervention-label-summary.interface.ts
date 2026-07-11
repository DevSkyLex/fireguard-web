/**
 * Interface InterventionLabelSummary
 * @interface InterventionLabelSummary
 *
 * @description
 * Minimal label projection embedded on `InterventionOutput.labels`. Full
 * label management (create, rename, recolor, delete) goes through
 * `InterventionLabelOutput` and `InterventionLabelService`.
 */
export interface InterventionLabelSummary {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the label.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Label display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * Label colour as a `#rrggbb` hex string.
   *
   * @type {string}
   */
  readonly color: string;
  //#endregion
}
