/**
 * Interface InterventionTemplateItemOutput
 * @interface InterventionTemplateItemOutput
 *
 * @description
 * One planned work item embedded on an {@link InterventionTemplateOutput}
 * blueprint, materialized into a real work item at instantiation.
 */
export interface InterventionTemplateItemOutput {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the template item.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property position
   * @readonly
   *
   * @description
   * Ordering position of the item within the template.
   *
   * @type {number}
   */
  readonly position: number;

  /**
   * Property action
   * @readonly
   *
   * @description
   * Free-text description of the action to perform.
   *
   * @type {string}
   */
  readonly action: string;

  /**
   * Property target
   * @readonly
   *
   * @description
   * Optional IRI of the facility or equipment the item targets.
   *
   * @type {string | null}
   */
  readonly target: string | null;

  /**
   * Property resultResource
   * @readonly
   *
   * @description
   * Optional IRI of the resource created when the item completes
   * (an inspection, for instance).
   *
   * @type {string | null}
   */
  readonly resultResource: string | null;

  /**
   * Property required
   * @readonly
   *
   * @description
   * Whether the item must be completed before the intervention can publish.
   *
   * @type {boolean}
   */
  readonly required: boolean;

  /**
   * Property defaultAssignee
   * @readonly
   *
   * @description
   * Optional IRI of the organization member pre-assigned to the item.
   *
   * @type {string | null}
   */
  readonly defaultAssignee: string | null;
  //#endregion
}
