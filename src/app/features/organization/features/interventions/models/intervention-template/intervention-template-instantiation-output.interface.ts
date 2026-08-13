import type { HydraItem } from '@core/api/models';

/**
 * Interface InterventionTemplateInstantiationOutput
 * @interface InterventionTemplateInstantiationOutput
 *
 * @description
 * Result of instantiating an intervention template — the identifier and
 * per-organization sequential number of the newly created draft
 * intervention, returned by `POST /intervention-templates/{id}/instantiate`.
 */
export interface InterventionTemplateInstantiationOutput extends HydraItem {
  //#region Properties
  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Identifier of the intervention draft created from the template.
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property number
   * @readonly
   *
   * @description
   * Per-organization sequential number of the created intervention.
   *
   * @type {number}
   */
  readonly number: number;
  //#endregion
}
