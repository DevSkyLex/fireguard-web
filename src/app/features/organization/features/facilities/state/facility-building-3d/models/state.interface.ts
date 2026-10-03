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
   * @since unreleased
   *
   * @type {string | null}
   */
  readonly selectedRoomId: string | null;

  /**
   * Property selectedEquipmentId
   *
   * @description
   * Selected equipment resource, or null when selecting a room or floor.
   *
   * @since unreleased
   */
  readonly selectedEquipmentId: string | null;

  /**
   * Property metric
   *
   * @description
   * Whether calibrated physical dimensions or schematic stacking is displayed.
   *
   * @since unreleased
   */
  readonly metric: boolean;

  /**
   * Property scopeKey
   *
   * @description
   * Scope identity fences selection across route reuse.
   *
   * @since unreleased
   */
  readonly scopeKey: string | null;

  /**
   * Property isolatedFloorId
   *
   * @description
   * The floor isolated for display, or `null` when every floor is visible.
   *
   * @since unreleased
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
   * @since unreleased
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
   * @since unreleased
   *
   * @type {number}
   */
  readonly cameraResetToken: number;
  //#endregion
}
