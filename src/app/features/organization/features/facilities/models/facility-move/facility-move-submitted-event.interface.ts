/** The picked target for a pending `FacilityMoveRequest`, emitted by `FacilityMoveDialog`. */
export interface FacilityMoveSubmittedEvent {
  //#region Properties
  /** The facility being re-parented. */
  readonly facilityId: string;

  /** Its new parent, or `null` to move it to the root level. */
  readonly parentFacilityId: string | null;
  //#endregion
}
