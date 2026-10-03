import type { FacilityType } from '../facility/facility-output.interface';

/**
 * Interface FacilityMoveRequest
 * @interface FacilityMoveRequest
 *
 * @description
 * What `FacilityMoveDialog` is currently asking to re-parent — the facility
 * being moved, or `null` to keep the dialog closed. Owned by the caller, the
 * same shape a dragged tree node is turned into before opening the dialog.
 */
export interface FacilityMoveRequest {
  //#region Properties
  /**
   * Property facilityType
   *
   * @description
   * Stores facilityType.
   */
  readonly facilityType?: FacilityType;
  /**
   * Property currentParentFacilityId
   *
   * @description
   * Existing parent hydrated independently from the candidate page.
   */
  readonly currentParentFacilityId?: string | null;

  /**
   * Property facilityId
   *
   * @description
   * The facility being re-parented.
   */
  readonly facilityId: string;

  /**
   * Property facilityName
   *
   * @description
   * Its display name, for the dialog's description.
   */
  readonly facilityName: string;
  //#endregion
}
