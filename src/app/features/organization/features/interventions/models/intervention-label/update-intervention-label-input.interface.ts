/**
 * Interface UpdateInterventionLabelInput
 * @interface UpdateInterventionLabelInput
 *
 * @description
 * Merge-patch input used to rename or recolor an intervention label.
 */
export interface UpdateInterventionLabelInput {
  //#region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * New label display name.
   *
   * @type {string | undefined}
   */
  readonly name?: string;

  /**
   * Property color
   * @readonly
   *
   * @description
   * New label colour as a `#rrggbb` hex string.
   *
   * @type {string | undefined}
   */
  readonly color?: string;
  //#endregion
}
