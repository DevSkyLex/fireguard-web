/**
 * Interface RoomUserData
 * @interface RoomUserData
 *
 * @description
 * Pickable generated room.
 */
export interface RoomUserData {
  /**
   * Property kind
   *
   * @description
   * Object discriminator.
   */
  readonly kind: 'room';

  /**
   * Property facilityId
   *
   * @description
   * Room facility identifier.
   */
  readonly facilityId: string;

  /**
   * Property floorId
   *
   * @description
   * Owning floor identifier.
   */
  readonly floorId: string;
}

/**
 * Interface FloorSlabUserData
 * @interface FloorSlabUserData
 *
 * @description
 * Pickable generated floor slab.
 */
export interface FloorSlabUserData {
  /**
   * Property kind
   *
   * @description
   * Object discriminator.
   */
  readonly kind: 'floor-slab';

  /**
   * Property floorId
   *
   * @description
   * Owning floor identifier.
   */
  readonly floorId: string;
}

/**
 * Interface FloorEdgesUserData
 * @interface FloorEdgesUserData
 *
 * @description
 * Non-pickable floor outline.
 */
export interface FloorEdgesUserData {
  /**
   * Property kind
   *
   * @description
   * Object discriminator.
   */
  readonly kind: 'floor-edges';

  /**
   * Property floorId
   *
   * @description
   * Owning floor identifier.
   */
  readonly floorId: string;
}

/**
 * Interface FloorPlaceholderUserData
 * @interface FloorPlaceholderUserData
 *
 * @description
 * Non-pickable missing-geometry placeholder.
 */
export interface FloorPlaceholderUserData {
  /**
   * Property kind
   *
   * @description
   * Object discriminator.
   */
  readonly kind: 'floor-placeholder';

  /**
   * Property floorId
   *
   * @description
   * Owning floor identifier.
   */
  readonly floorId: string;
}

/**
 * Interface EquipmentUserData
 * @interface EquipmentUserData
 *
 * @description
 * Pickable equipment marker.
 */
export interface EquipmentUserData {
  /**
   * Property kind
   *
   * @description
   * Object discriminator.
   */
  readonly kind: 'equipment';

  /**
   * Property equipmentId
   *
   * @description
   * Equipment resource identifier.
   */
  readonly equipmentId: string;

  /**
   * Property floorId
   *
   * @description
   * Owning floor identifier.
   */
  readonly floorId: string;
}

/**
 * Interface ImportedNodeUserData
 * @interface ImportedNodeUserData
 *
 * @description
 * Imported mesh with immutable source node identity.
 */
export interface ImportedNodeUserData {
  /**
   * Property kind
   *
   * @description
   * Object discriminator.
   */
  readonly kind: 'imported-node';

  /**
   * Property nodeIndex
   *
   * @description
   * Stable immutable glTF node index.
   */
  readonly nodeIndex: number;

  /**
   * Property nodePath
   *
   * @description
   * Source node indices from this mesh to the root, supporting grouped object association.
   */
  readonly nodePath: readonly number[];

  /**
   * Property bindingUnavailable
   *
   * @description
   * Prevents inherited facility filtering and highlights beyond an unavailable association.
   */
  readonly bindingUnavailable: boolean;

  /**
   * Property facilityId
   *
   * @description
   * Associated existing facility, or null when unbound.
   */
  readonly facilityId: string | null;
}

/**
 * Type SceneObjectUserData
 *
 * @description
 * Discriminates selectable scene objects from outlines and placeholders.
 *
 * @type {SceneObjectUserData}
 */
export type SceneObjectUserData =
  | RoomUserData
  | FloorSlabUserData
  | FloorEdgesUserData
  | FloorPlaceholderUserData
  | EquipmentUserData
  | ImportedNodeUserData;
