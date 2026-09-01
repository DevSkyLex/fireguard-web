/**
 * Interface FacilityBuilding3dState
 * @interface FacilityBuilding3dState
 *
 * @description
 * Component-scoped state backing the building 3D view, layered on top of
 * `withQueryState<FacilityBuildingModelOutput>()`. `selectedRoomId` and
 * `selectedFloorId` track the current selection; `isolatedFloorId` is a
 * separate visibility toggle (`null` shows every floor); `exploded` drives
 * the vertically-separated layout; `cameraResetToken` is an incrementing
 * counter the scene watches to know when a recentre was requested — it
 * carries no meaning beyond "changed since last read".
 *
 * @since 1.0.0
 */
export interface FacilityBuilding3dState {
  //#region Properties
  /**
   * Property selectedFloorId
   *
   * @description
   * The currently selected floor's facility id, or `null` when none is
   * selected.
   *
   * @type {string | null}
   */
  readonly selectedFloorId: string | null;

  /**
   * Property selectedRoomId
   *
   * @description
   * The currently selected room's facility id, or `null` when none is
   * selected.
   *
   * @type {string | null}
   */
  readonly selectedRoomId: string | null;

  /**
   * Property isolatedFloorId
   *
   * @description
   * The floor isolated for display, or `null` when every floor is visible.
   *
   * @type {string | null}
   */
  readonly isolatedFloorId: string | null;

  /**
   * Property exploded
   *
   * @description
   * Whether the building's floors are rendered vertically separated.
   *
   * @type {boolean}
   */
  readonly exploded: boolean;

  /**
   * Property cameraResetToken
   *
   * @description
   * Incremented on every camera-reset request. The 3D scene watches this
   * value, not its magnitude, to know a recentre was asked for.
   *
   * @type {number}
   */
  readonly cameraResetToken: number;
  //#endregion
}
