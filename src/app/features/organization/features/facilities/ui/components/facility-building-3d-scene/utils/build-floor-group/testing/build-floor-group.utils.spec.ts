import * as THREE from 'three';
import { buildFloorGroup } from '../build-floor-group.utils';

describe('buildFloorGroup', () => {
  it('places the group at ordinal * FLOOR_HEIGHT', () => {
    const group = buildFloorGroup(THREE, {
      floorId: 'floor-1',
      ordinal: 2,
      imageWidth: 100,
      imageHeight: 100,
      outline: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      rooms: [],
      roomColor: '#ffffff',
      slabColor: '#e4e4e7',
      edgesColor: '#d4d4d8',
    });

    expect(group.position.y).toBeCloseTo(2, 5);
  });

  it('adds a slab, its edges, and one mesh per room when the outline is present', () => {
    const group = buildFloorGroup(THREE, {
      floorId: 'floor-1',
      ordinal: 0,
      imageWidth: 100,
      imageHeight: 100,
      outline: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      rooms: [
        {
          facilityId: 'room-1',
          points: [
            [0.1, 0.1],
            [0.5, 0.1],
            [0.3, 0.5],
          ],
        },
      ],
      roomColor: '#ffffff',
      slabColor: '#e4e4e7',
      edgesColor: '#d4d4d8',
    });

    const kinds = group.children.map((child) => child.userData['kind']);
    expect(kinds).toEqual(['floor-slab', 'floor-edges', 'room']);
  });

  it('falls back to a square aspect ratio when either image dimension is null', () => {
    const group = buildFloorGroup(THREE, {
      floorId: 'floor-1',
      ordinal: 0,
      imageWidth: null,
      imageHeight: null,
      outline: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      rooms: [],
      roomColor: '#ffffff',
      slabColor: '#e4e4e7',
      edgesColor: '#d4d4d8',
    });

    const slab = group.children.find(
      (child) => child.userData['kind'] === 'floor-slab',
    ) as THREE.Mesh;
    (slab.geometry as THREE.BufferGeometry).computeBoundingBox();
    const box = (slab.geometry as THREE.BufferGeometry).boundingBox;

    expect(box?.min.x).toBeCloseTo(0, 5);
    expect(box?.max.x).toBeCloseTo(1, 5);
  });

  it('produces a single non-pickable placeholder when the outline is absent', () => {
    const group = buildFloorGroup(THREE, {
      floorId: 'floor-2',
      ordinal: 1,
      imageWidth: 100,
      imageHeight: 100,
      outline: null,
      rooms: [],
      roomColor: '#ffffff',
      slabColor: '#e4e4e7',
      edgesColor: '#d4d4d8',
    });

    expect(group.children.length).toBe(1);
    expect(group.children[0].userData).toEqual({ kind: 'floor-placeholder', floorId: 'floor-2' });

    const intersections: THREE.Intersection[] = [];
    group.children[0].raycast(new THREE.Raycaster(), intersections);
    expect(intersections.length).toBe(0);
  });
});
