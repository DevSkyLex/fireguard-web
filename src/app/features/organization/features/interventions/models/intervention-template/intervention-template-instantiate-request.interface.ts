/**
 * Interface InterventionTemplateInstantiateRequest
 * @interface InterventionTemplateInstantiateRequest
 *
 * @description
 * `InterventionCreateSheet`'s `templateInstantiated` payload: the picked
 * template plus whichever of the four backend-accepted overrides the
 * operator filled in on the "start from a template" path. There is no
 * `dueAt` — the backend always derives it from `plannedStartAt` and the
 * template's own duration.
 */
export interface InterventionTemplateInstantiateRequest {
  //#region Properties
  /** The template to instantiate. */
  readonly templateId: string;
  /** Overrides the template name when provided. */
  readonly name?: string;
  /** Overrides the template's default site (facility IRI) when provided. */
  readonly site?: string;
  /** Overrides the template's default responsible (member IRI) when provided. */
  readonly responsible?: string;
  /** Overrides the planned start when provided. */
  readonly plannedStartAt?: Date;
  //#endregion
}
