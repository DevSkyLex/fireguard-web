import { ROOM_HEIGHT } from '../../constants/facility-building-3d-scene.constants';
import type { RoomUserData } from '../../models/scene-object-user-data.type';

/**
 * Function buildRoomMesh
 * @function buildRoomMesh
 *
 * @description
 * Extrudes one already-sanitized room contour (see `sanitizePolygon`) into
 * a pickable `THREE.Mesh`. Follows this lot's fixed axis convention: the
 * shape is built at `(u * aspect, v − 1)` so that, after the mesh's
 * `−π/2` X rotation, the shape's Y axis becomes world Z (`1 − v`) and the
 * extrusion's Z axis becomes world Y (height, `[0, ROOM_HEIGHT]`). The
 * geometry is then translated so its lowest point sits exactly on `y = 0`,
 * rather than trusting `ExtrudeGeometry`'s own Z origin.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {typeof import('three')} THREE - The three.js module, passed in rather than imported so this stays testable without WebGL.
 * @param {ReadonlyArray<readonly [number, number]>} points - The sanitized room contour, in normalized `[0, 1]` image coordinates.
 * @param {number} aspect - The owning plan's `imageWidth / imageHeight` ratio.
 * @param {number | string} color - The room mesh's fill colour.
 * @param {string} facilityId - The room's own facility id, carried in `userData`.
 * @param {string} floorId - The owning floor's facility id, carried in `userData`.
 *
 * @returns {InstanceType<(typeof import('three'))['Mesh']>} The extruded, ground-resting room mesh.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function buildRoomMesh(
  THREE: typeof import('three'),
  points: ReadonlyArray<readonly [number, number]>,
  aspect: number,
  color: number | string,
  facilityId: string,
  floorId: string,
): InstanceType<(typeof import('three'))['Mesh']> {
  const geometry: InstanceType<(typeof import('three'))['ExtrudeGeometry']> = extrudeContour(
    THREE,
    points,
    aspect,
    ROOM_HEIGHT,
  );

  const material: InstanceType<(typeof import('three'))['MeshLambertMaterial']> =
    new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });

  const mesh: InstanceType<(typeof import('three'))['Mesh']> = new THREE.Mesh(geometry, material);
  const userData: RoomUserData = { kind: 'room', facilityId, floorId };
  mesh.userData = userData;

  return mesh;
}

/**
 * Function extrudeContour
 * @function extrudeContour
 *
 * @description
 * Builds this lot's shared `THREE.Shape → ExtrudeGeometry → rotate → rest
 * on y = 0` pipeline for one normalized contour, used by both a room mesh
 * and a floor's slab.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {typeof import('three')} THREE - The three.js module.
 * @param {ReadonlyArray<readonly [number, number]>} points - The sanitized contour, in normalized `[0, 1]` image coordinates.
 * @param {number} aspect - The owning plan's `imageWidth / imageHeight` ratio.
 * @param {number} depth - The extrusion depth, becoming world-Y height after rotation.
 *
 * @returns {InstanceType<(typeof import('three'))['ExtrudeGeometry']>} The rotated geometry, resting on `y = 0`.
 */
export function extrudeContour(
  THREE: typeof import('three'),
  points: ReadonlyArray<readonly [number, number]>,
  aspect: number,
  depth: number,
): InstanceType<(typeof import('three'))['ExtrudeGeometry']> {
  const shape: InstanceType<(typeof import('three'))['Shape']> = new THREE.Shape();

  points.forEach(([u, v]: readonly [number, number], index: number) => {
    const shapeX: number = u * aspect;
    const shapeY: number = v - 1;

    if (index === 0) {
      shape.moveTo(shapeX, shapeY);
    } else {
      shape.lineTo(shapeX, shapeY);
    }
  });
  shape.closePath();

  const geometry: InstanceType<(typeof import('three'))['ExtrudeGeometry']> =
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeBoundingBox();

  const minY: number = geometry.boundingBox?.min.y ?? 0;
  geometry.translate(0, -minY, 0);

  return geometry;
}
