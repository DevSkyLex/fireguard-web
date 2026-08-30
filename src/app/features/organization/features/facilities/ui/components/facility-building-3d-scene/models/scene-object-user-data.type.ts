/**
 * Interface RoomUserData
 * @interface RoomUserData
 *
 * @description
 * `userData` carried by a room mesh built by `buildRoomMesh` — the pickable
 * room's own facility id and its owning floor's facility id.
 *
 * @since 1.0.0
 */
export interface RoomUserData {
  /** Discriminates this object from every other {@link SceneObjectUserData} variant. */
  readonly kind: 'room';

  /** The room's own facility id — what a pick or a selection resolves to. */
  readonly facilityId: string;

  /** The owning floor's facility id. */
  readonly floorId: string;
}

/**
 * Interface FloorSlabUserData
 * @interface FloorSlabUserData
 *
 * @description `userData` carried by a floor's slab mesh — pickable, but lower priority than a {@link RoomUserData}.
 * @since 1.0.0
 */
export interface FloorSlabUserData {
  /** Discriminates this object from every other {@link SceneObjectUserData} variant. */
  readonly kind: 'floor-slab';

  /** The owning floor's facility id. */
  readonly floorId: string;
}

/**
 * Interface FloorEdgesUserData
 * @interface FloorEdgesUserData
 *
 * @description `userData` carried by a floor's `EdgesGeometry` outline — never pickable.
 * @since 1.0.0
 */
export interface FloorEdgesUserData {
  /** Discriminates this object from every other {@link SceneObjectUserData} variant. */
  readonly kind: 'floor-edges';

  /** The owning floor's facility id. */
  readonly floorId: string;
}

/**
 * Interface FloorPlaceholderUserData
 * @interface FloorPlaceholderUserData
 *
 * @description
 * `userData` carried by the neutral stand-in `buildFloorGroup` produces for
 * a floor with no derivable outline — never pickable, so the floor still
 * occupies its place in the stack without claiming a geometry it does not
 * have.
 *
 * @since 1.0.0
 */
export interface FloorPlaceholderUserData {
  /** Discriminates this object from every other {@link SceneObjectUserData} variant. */
  readonly kind: 'floor-placeholder';

  /** The owning floor's facility id. */
  readonly floorId: string;
}

/**
 * Type SceneObjectUserData
 * @type {SceneObjectUserData}
 *
 * @description
 * Every kind of `userData` a `FacilityBuilding3dScene` object can carry.
 * `kind` stays an open, extensible discriminant — an `'equipment'` variant
 * is expected in a later lot and only needs a new member added here.
 *
 * @since 1.0.0
 */
export type SceneObjectUserData =
  | RoomUserData
  | FloorSlabUserData
  | FloorEdgesUserData
  | FloorPlaceholderUserData;
