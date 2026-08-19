/**
 * Interface AssignInterventionTeamInput
 * @interface AssignInterventionTeamInput
 *
 * @description
 * Body of `POST /interventions/{id}/team-assignments`: the organization
 * team whose CURRENT active members are snapshot-expanded (union, deduped)
 * into the intervention's participants list.
 */
export interface AssignInterventionTeamInput {
  //#region Properties
  /** UUID of the organization team to assign. */
  readonly teamId: string;
  //#endregion
}
