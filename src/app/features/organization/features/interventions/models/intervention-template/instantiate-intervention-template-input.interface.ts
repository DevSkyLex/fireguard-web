/**
 * Interface InstantiateInterventionTemplateInput
 * @interface InstantiateInterventionTemplateInput
 *
 * @description
 * Body of `POST /intervention-templates/{id}/instantiate`. Every field is an
 * override of the template's own default — omitted or `undefined` means
 * "use what the template says", including the due date, which the backend
 * always derives from `plannedStartAt` plus the template's duration and
 * never accepts directly.
 */
export interface InstantiateInterventionTemplateInput {
  //#region Properties
  /** Overrides the template name (2–160 chars) when provided. */
  readonly name?: string;
  /** Overrides the template's default site (facility IRI) when provided. */
  readonly site?: string;
  /** Overrides the template's default responsible (member IRI) when provided. */
  readonly responsible?: string;
  /** Overrides the planned start when provided. */
  readonly plannedStartAt?: Date;
  //#endregion
}
