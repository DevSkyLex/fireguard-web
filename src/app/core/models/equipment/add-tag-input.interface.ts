/**
 * Interface AddTagInput
 * @interface AddTagInput
 *
 * @description
 * Payload used to create or attach a tag to an
 * equipment resource.
 */
export interface AddTagInput {
  //#region Properties
  /**
   * Property name
   * @readonly
   *
   * @description
   * Tag name to associate with the equipment.
   *
   * @type {string}
   */
  readonly name: string;
  //#endregion
}
