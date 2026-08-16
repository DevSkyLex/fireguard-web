/**
 * What `FacilityMoveDialog` is currently asking to re-parent — the facility
 * being moved, or `null` to keep the dialog closed. Owned by the caller, the
 * same shape a dragged tree node is turned into before opening the dialog.
 */
export interface FacilityMoveRequest {
  //#region Properties
  /** The facility being re-parented. */
  readonly facilityId: string;

  /** Its display name, for the dialog's description. */
  readonly facilityName: string;
  //#endregion
}
