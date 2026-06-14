/**
 * Input used to create a proposed intervention change.
 */
export interface CreateInterventionChangeInput {
  readonly clientId?: string;
  readonly intervention: string;
  readonly workItem?: string | null;
  readonly resource: string;
  readonly patch: Readonly<Record<string, unknown>>;
}
