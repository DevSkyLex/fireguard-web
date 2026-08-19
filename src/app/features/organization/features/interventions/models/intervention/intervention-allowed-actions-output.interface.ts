/**
 * Interface InterventionAllowedActionsOutput
 * @interface InterventionAllowedActionsOutput
 *
 * @description
 * The caller-specific action-capability block the API attaches to every
 * intervention it returns — item and collection reads, and every mutation
 * response carrying the refreshed intervention. Computed server-side by
 * `InterventionActionPolicy`, the same policy the write path consults to
 * enforce a mutation, so each flag already folds together the organization
 * permission, the field-mutability window, and the responsible/participant
 * identity check — the client never re-derives that matrix.
 */
export interface InterventionAllowedActionsOutput {
  //#region Properties
  /** @type {boolean} Name, description and labels accept a write. */
  readonly canEditDetails: boolean;
  /** @type {boolean} The site accepts a write — draft only. */
  readonly canEditSite: boolean;
  /** @type {boolean} The responsible accepts a handover — draft and planned only. */
  readonly canEditResponsible: boolean;
  /** @type {boolean} Dates, priority and participants accept a write. */
  readonly canEditPlanning: boolean;
  /** @type {boolean} Work items accept create/update/delete for this caller. */
  readonly canMutateWorkItems: boolean;
  /** @type {boolean} A change may be proposed — in_progress/changes_requested, responsible or participant. */
  readonly canMutateChanges: boolean;
  /** @type {boolean} The team assignment accepts a write. */
  readonly canAssignTeam: boolean;
  /** @type {boolean} Attachments accept upload and delete for this caller. */
  readonly canManageAttachments: boolean;
  /** @type {boolean} The responsible caller may submit for review right now. */
  readonly canSubmit: boolean;
  /** @type {boolean} The responsible caller may withdraw a submitted intervention back to in_progress. */
  readonly canWithdraw: boolean;
  /** @type {boolean} The intervention may be deleted outright — draft/abandoned only. */
  readonly canDelete: boolean;
  /** @type {boolean} The submitted intervention may be published by this caller. */
  readonly canPublish: boolean;
  //#endregion
}
