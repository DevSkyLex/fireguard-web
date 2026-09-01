import {
  FLOOR_HEIGHT,
  FLOOR_SLAB_THICKNESS,
} from '../../constants/facility-building-3d-scene.constants';
import type {
  FloorEdgesUserData,
  FloorPlaceholderUserData,
} from '../../models/scene-object-user-data.type';
import { buildRoomMesh, extrudeContour } from '../build-room-mesh/build-room-mesh.utils';

/**
 * Function buildFloorGroup
 * @function buildFloorGroup
 *
 * @description
 * Builds one floor's `THREE.Group` — its slab, its rooms, and its edge
 * outline — positioned at `y = ordinal * FLOOR_HEIGHT`. When `outline` is
 * `null` the floor has no derivable geometry: the group instead carries a
 * single neutral, non-pickable placeholder (`userData.kind ===
 * 'floor-placeholder'`), so the floor still occupies its place in the
 * stack. `imageWidth`/`imageHeight` are nullable per
 * `FacilityBuildingModelPlan` — an undimensioned plan falls back to a
 * square aspect ratio (`1`) rather than dividing by `null`.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {typeof import('three')} THREE - The three.js module, passed in rather than imported so this stays testable without WebGL.
 * @param {object} params - This floor's geometry and presentation inputs.
 * @param {string} params.floorId - This floor's own facility id.
 * @param {number} params.ordinal - This floor's zero-based rank in the building stack.
 * @param {number | null} params.imageWidth - The owning plan's natural pixel width, or `null` when undimensioned.
 * @param {number | null} params.imageHeight - The owning plan's natural pixel height, or `null` when undimensioned.
 * @param {ReadonlyArray<readonly [number, number]> | null} params.outline - The floor's sanitized outline, or `null` when none could be derived.
 * @param {ReadonlyArray<{ facilityId: string; points: ReadonlyArray<readonly [number, number]> }>} params.rooms - This floor's sanitized room contours.
 * @param {number | string} params.roomColor - A room mesh's fill colour.
 * @param {number | string} params.slabColor - The slab's fill colour.
 * @param {number | string} params.edgesColor - The `EdgesGeometry` line colour.
 *
 * @returns {InstanceType<(typeof import('three'))['Group']>} The floor's group, placed at its stack height.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function buildFloorGroup(
  THREE: typeof import('three'),
  params: {
    readonly floorId: string;
    readonly ordinal: number;
    readonly imageWidth: number | null;
    readonly imageHeight: number | null;
    readonly outline: ReadonlyArray<readonly [number, number]> | null;
    readonly rooms: ReadonlyArray<{
      readonly facilityId: string;
      readonly points: ReadonlyArray<readonly [number, number]>;
    }>;
    readonly roomColor: number | string;
    readonly slabColor: number | string;
    readonly edgesColor: number | string;
  },
): InstanceType<(typeof import('three'))['Group']> {
  const group: InstanceType<(typeof import('three'))['Group']> = new THREE.Group();
  group.position.y = params.ordinal * FLOOR_HEIGHT;

  if (params.outline === null) {
    group.add(buildFloorPlaceholder(THREE, params.floorId));
    return group;
  }

  const aspect: number = resolveAspect(params.imageWidth, params.imageHeight);

  const slabGeometry: InstanceType<(typeof import('three'))['ExtrudeGeometry']> = extrudeContour(
    THREE,
    params.outline,
    aspect,
    FLOOR_SLAB_THICKNESS,
  );
  const slabMaterial: InstanceType<(typeof import('three'))['MeshLambertMaterial']> =
    new THREE.MeshLambertMaterial({ color: params.slabColor, side: THREE.DoubleSide });
  const slab: InstanceType<(typeof import('three'))['Mesh']> = new THREE.Mesh(
    slabGeometry,
    slabMaterial,
  );
  slab.userData = { kind: 'floor-slab', floorId: params.floorId };
  group.add(slab);

  const edgesGeometry: InstanceType<(typeof import('three'))['EdgesGeometry']> =
    new THREE.EdgesGeometry(slabGeometry);
  const edges: InstanceType<(typeof import('three'))['LineSegments']> = new THREE.LineSegments(
    edgesGeometry,
    new THREE.LineBasicMaterial({ color: params.edgesColor }),
  );
  const edgesUserData: FloorEdgesUserData = { kind: 'floor-edges', floorId: params.floorId };
  edges.userData = edgesUserData;
  group.add(edges);

  for (const room of params.rooms) {
    group.add(
      buildRoomMesh(THREE, room.points, aspect, params.roomColor, room.facilityId, params.floorId),
    );
  }

  return group;
}

/**
 * Function resolveAspect
 *
 * @description
 * The plan's `imageWidth / imageHeight` aspect ratio, falling back to a
 * square `1` when either dimension is `null` — an SVG the backend could not
 * probe is stored undimensioned rather than rejected.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {number | null} imageWidth - The plan's natural pixel width, or `null`.
 * @param {number | null} imageHeight - The plan's natural pixel height, or `null`.
 *
 * @returns {number} The aspect ratio to build shapes against.
 */
function resolveAspect(imageWidth: number | null, imageHeight: number | null): number {
  return imageWidth !== null && imageHeight !== null && imageHeight !== 0
    ? imageWidth / imageHeight
    : 1;
}

/**
 * Function buildFloorPlaceholder
 *
 * @description
 * A neutral, non-pickable stand-in for a floor with no derivable outline —
 * a thin, fully transparent plate that keeps the floor's slot in the
 * building stack without rendering or being pickable as a real floor.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {typeof import('three')} THREE - The three.js module.
 * @param {string} floorId - The owning floor's facility id.
 *
 * @returns {InstanceType<(typeof import('three'))['Mesh']>} The placeholder mesh.
 */
function buildFloorPlaceholder(
  THREE: typeof import('three'),
  floorId: string,
): InstanceType<(typeof import('three'))['Mesh']> {
  const geometry: InstanceType<(typeof import('three'))['PlaneGeometry']> = new THREE.PlaneGeometry(
    1,
    1,
  );
  const material: InstanceType<(typeof import('three'))['MeshBasicMaterial']> =
    new THREE.MeshBasicMaterial({ visible: false });
  const placeholder: InstanceType<(typeof import('three'))['Mesh']> = new THREE.Mesh(
    geometry,
    material,
  );
  placeholder.raycast = (): void => undefined;

  const userData: FloorPlaceholderUserData = { kind: 'floor-placeholder', floorId };
  placeholder.userData = userData;

  return placeholder;
}
