import {
  coherenceBuilding,
  coherenceSite,
  facilityOutput,
  facilityChildOutput,
  E2E_FACILITY_CHILD_ID,
  E2E_FACILITY_ID,
} from './facility-fixtures';
import {
  spatialBuildingModel,
  spatialFacilityModel,
  spatialGlb,
} from './facility-spatial-fixtures';

/** A paginated branch remains larger than two pages after its first child moves. */
export function reviewMoveTree() {
  const source = coherenceSite(1, { hasChildren: true });
  const destination = coherenceSite(2, { hasChildren: true });
  const children = Array.from({ length: 211 }, (_, index) => coherenceBuilding(index + 1));
  const destinationChild = coherenceBuilding(300, {
    parentFacilityId: destination.id,
    path: [{ id: destination.id, type: 'site', name: destination.name }],
  });
  const moved = {
    ...children[0],
    parentFacilityId: destination.id,
    path: [{ id: destination.id, type: 'site', name: destination.name }],
    revision: 2,
  };
  return { source, destination, children, destinationChild, moved };
}

/** A bound zone is valid without a generated polygon; its path identifies its floor. */
export function reviewUndrawnZone() {
  const projection = spatialBuildingModel();
  const floor = facilityChildOutput({
    id: 'e2e-upper-floor',
    '@id': '/api/facilities/e2e-upper-floor',
    name: 'Upper Floor',
  });
  const zone = facilityOutput({
    id: 'review-undrawn-zone',
    '@id': '/api/facilities/review-undrawn-zone',
    type: 'zone',
    name: 'Unoutlined archive',
    parentFacilityId: floor.id,
    path: [
      { id: E2E_FACILITY_ID, type: 'building', name: projection.buildingName },
      { id: floor.id, type: 'floor', name: floor.name },
    ],
  });
  const model = {
    ...spatialFacilityModel(),
    nodes: [{ index: 0, name: 'Archive object' }],
    bindings: [{ nodeIndex: 0, facilityId: zone.id }],
  };
  return {
    zone,
    floor,
    model,
    bytes: spatialGlb(),
    projection: {
      ...projection,
      floors: [projection.floors[0], { ...projection.floors[1], rooms: [] }],
    },
  };
}

/** Upper-floor equipment exposes any leaked exploded offset in the shared metric frame. */
export function reviewCalibratedEquipment() {
  const projection = spatialBuildingModel();
  const upper = projection.floors[1];
  return {
    ...projection,
    floors: [
      projection.floors[0],
      {
        ...upper,
        equipment: [
          {
            ...projection.floors[0].equipment[0],
            equipmentId: 'review-upper-equipment',
            serialNumber: 'SN-UPPER-FRAME',
            locationLabel: 'Calibrated upper extinguisher',
            facilityId: 'e2e-upper-room',
            position: { attachmentId: upper.plan.attachmentId, x: 0.5, y: 0.5 },
          },
        ],
      },
    ],
  };
}

/** Encodes immutable autonomous GLB bytes with independently bound Line and Points nodes. */
export function reviewPrimitiveGlb(): Buffer {
  const binary = Buffer.alloc(36);
  [0, 1, 0, 12, 1, 0, 6, 5, 4].forEach((value, index) => binary.writeFloatLE(value, index * 4));
  const document = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0, 1] }],
    nodes: [
      { name: 'Ground line', mesh: 0 },
      { name: 'Upper point', mesh: 1 },
    ],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0 }, mode: 1, material: 0 }] },
      { primitives: [{ attributes: { POSITION: 1 }, mode: 0, material: 0 }] },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [0.95, 0.15, 0.1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 24 },
      { buffer: 0, byteOffset: 24, byteLength: 12 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 2,
        type: 'VEC3',
        min: [0, 1, 0],
        max: [12, 1, 0],
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 1,
        type: 'VEC3',
        min: [6, 5, 4],
        max: [6, 5, 4],
      },
    ],
  };
  const jsonText = JSON.stringify(document);
  const json = Buffer.from(jsonText.padEnd(Math.ceil(Buffer.byteLength(jsonText) / 4) * 4, ' '));
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + binary.length, 8);
  header.writeUInt32LE(json.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binHeader, binary]);
}

/** Model metadata matches actual primitive node indices and independent floor bindings. */
export function reviewPrimitiveModel() {
  return {
    ...spatialFacilityModel(),
    fileName: 'line-and-points.glb',
    fileSize: reviewPrimitiveGlb().length,
    nodeCount: 2,
    nodes: [
      { index: 0, name: 'Ground line' },
      { index: 1, name: 'Upper point' },
    ],
    bindings: [
      { nodeIndex: 0, facilityId: E2E_FACILITY_CHILD_ID },
      { nodeIndex: 1, facilityId: 'e2e-upper-floor' },
    ],
  };
}

/** Isolates primitive picking from deliberately interactive equipment overlays. */
export function reviewPrimitiveBuildingModel() {
  const model = spatialBuildingModel();
  return {
    ...model,
    floors: model.floors.map((floor) =>
      Object.assign({}, floor, {
        equipment: [],
        diagnostics: Object.assign({}, floor.diagnostics, { unpositionedEquipmentCount: 0 }),
      }),
    ),
  };
}
