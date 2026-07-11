/**
 * Interface CreateInterventionLabelInput
 * @interface CreateInterventionLabelInput
 *
 * @description
 * Input used to create an intervention label.
 */
export interface CreateInterventionLabelInput {
  //#region Properties
  /**
   * Property organization
   * @readonly
   *
   * @description
   * IRI of the organization owning the new label.
   *
   * @type {string}
   */
  readonly organization: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Label display name, unique within the organization.
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
