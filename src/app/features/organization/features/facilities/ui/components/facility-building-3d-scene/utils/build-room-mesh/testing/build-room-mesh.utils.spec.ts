import * as THREE from 'three';
import { buildRoomMesh } from '../build-room-mesh.utils';

describe('buildRoomMesh', () => {
  it('places world X/Y/Z per the fixed axis convention for an asymmetric rectangle', () => {
    const aspect = 2;
    const mesh = buildRoomMesh(
      THREE,
      [
        [0.2, 0.1],
        [0.8, 0.1],
        [0.8, 0.4],
        [0.2, 0.4],
      ],
      aspect,
      '#ffffff',
      'room-1',
      'floor-1',
    );

    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;

    expect(box).not.toBeNull();
    expect(box?.min.x).toBeCloseTo(0.2 * aspect, 5);
    expect(box?.max.x).toBeCloseTo(0.8 * aspect, 5);
    expect(box?.min.y).toBeCloseTo(0, 5);
    expect(box?.max.y).toBeCloseTo(0.8, 5);
    expect(box?.min.z).toBeCloseTo(1 - 0.4, 5);
    expect(box?.max.z).toBeCloseTo(1 - 0.1, 5);
  });

  it('carries room userData with the given facility and floor ids', () => {
    const mesh = buildRoomMesh(
      THREE,
      [
        [0.1, 0.1],
        [0.5, 0.1],
        [0.3, 0.5],
      ],
      1,
      '#ffffff',
      'room-42',
      'floor-7',
    );

    expect(mesh.userData).toEqual({ kind: 'room', facilityId: 'room-42', floorId: 'floor-7' });
  });

  it('uses the given fill colour for the room material', () => {
    const mesh = buildRoomMesh(
      THREE,
      [
        [0.1, 0.1],
        [0.5, 0.1],
        [0.3, 0.5],
      ],
      1,
      '#123456',
      'room-1',
      'floor-1',
    );

    const material = mesh.material as THREE.MeshLambertMaterial;
    expect(material.color.getHexString()).toBe('123456');
  });
});
