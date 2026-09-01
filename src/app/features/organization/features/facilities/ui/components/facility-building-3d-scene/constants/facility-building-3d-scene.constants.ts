import type { FacilityType } from '@features/organization/features/facilities/models';

/**
 * Constant ROOM_HEIGHT
 *
 * @description
 * A room mesh's extrusion depth (world Y, after the shape's `−π/2` X
 * rotation), in the same normalized unit its floor plan's `aspect` is
 * expressed in.
 *
 * @since 1.0.0
 */
export const ROOM_HEIGHT = 0.8;

/**
 * Constant FLOOR_HEIGHT
 *
 * @description
 * The vertical distance (world Y) between one floor's group origin and the
 * next — `buildFloorGroup` places floor `ordinal` at `y = ordinal * FLOOR_HEIGHT`.
 *
 * @since 1.0.0
 */
export const FLOOR_HEIGHT = 1.0;

/**
 * Constant FLOOR_SLAB_THICKNESS
 *
 * @description
 * A floor's slab extrusion depth — deliberately thin relative to
 * {@link ROOM_HEIGHT} so the slab reads as a floor plate rather than a room.
 *
 * @since 1.0.0
 */
export const FLOOR_SLAB_THICKNESS = 0.05;

/**
 * Constant ROOM_TYPE_HUE_OFFSET
 *
 * @description
 * The `THREE.Color.offsetHSL` hue delta applied to the theme's resolved
 * `roomFill` colour for one {@link FacilityType}, so a room's tint is
 * derived from the running theme (light/dark, and any future palette swap)
 * rather than a fixed, hand-picked hex per type. The five offsets are spread
 * evenly around the hue wheel (`0, 0.2, 0.4, 0.6, 0.8`) purely to keep every
 * type visually distinct at a glance — never a status signal, which
 * `PRODUCT.md` reserves for the P2 detail panel, not scene colour.
 *
 * @since 1.0.0
 */
export const ROOM_TYPE_HUE_OFFSET: Record<FacilityType, number> = {
  site: 0,
  building: 0.2,
  floor: 0.4,
  zone: 0.6,
  area: 0.8,
};

/**
 * Constant DIMMED_OPACITY
 * @description A non-isolated floor's material opacity while another floor is isolated.
 * @since 1.0.0
 */
export const DIMMED_OPACITY = 0.15;

/**
 * Constant EXPLODE_EXTRA_GAP
 * @description Extra per-floor vertical gap (world Y), on top of {@link FLOOR_HEIGHT}, applied when the exploded layout is on.
 * @since 1.0.0
 */
export const EXPLODE_EXTRA_GAP = FLOOR_HEIGHT;

/**
 * Constant EXPLODE_ANIMATION_MS
 * @description Duration of the bounded exploded-layout tween, skipped entirely under `prefers-reduced-motion`.
 * @since 1.0.0
 */
export const EXPLODE_ANIMATION_MS = 400;

/**
 * Constant CAMERA_FOV
 * @description The scene's `PerspectiveCamera` vertical field of view, in degrees.
 * @since 1.0.0
 */
export const CAMERA_FOV = 50;

/**
 * Constant CAMERA_NEAR
 * @description The camera's near clipping plane fallback, before a reset scales it to the building's size.
 * @since 1.0.0
 */
export const CAMERA_NEAR = 0.1;

/**
 * Constant CAMERA_FAR
 * @description The camera's far clipping plane fallback, before a reset scales it to the building's size.
 * @since 1.0.0
 */
export const CAMERA_FAR = 1000;

/**
 * Constant CAMERA_DISTANCE_MULTIPLIER
 * @description How many multiples of the building's largest bounding-box dimension the reset camera sits back, for a three-quarter framing that keeps the whole building in view.
 * @since 1.0.0
 */
export const CAMERA_DISTANCE_MULTIPLIER = 1.6;

/**
 * Constant MAX_DEVICE_PIXEL_RATIO
 * @description The renderer's `setPixelRatio` ceiling — a higher device ratio is clamped rather than rendered at full cost.
 * @since 1.0.0
 */
export const MAX_DEVICE_PIXEL_RATIO = 2;
