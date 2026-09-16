/**
 * Interface InterventionChangePatchLine
 * @interface InterventionChangePatchLine
 *
 * @description
 * One readable `field · value` line rendered from a proposed change's raw
 * patch, shared by rendering and saved-workspace search.
 */
export interface InterventionChangePatchLine {
  //#region Properties
  /**
   * Property field
   * @readonly
   * @description The humanized patch field name.
   * @type {string}
   */
  readonly field: string;

  /**
   * Property value
   * @readonly
   * @description The patch value, rendered as plain text.
   * @type {string}
   */
  readonly value: string;
  //#endregion
}
