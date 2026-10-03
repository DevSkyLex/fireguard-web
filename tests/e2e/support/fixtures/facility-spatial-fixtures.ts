import { deflateSync } from 'node:zlib';
import { E2E_ORGANIZATION_ID } from './api-fixtures';
import {
  E2E_FACILITY_ID,
  E2E_FACILITY_CHILD_ID,
  E2E_FACILITY_PLAN_ID,
  E2E_FACILITY_PLAN_ZONE_ID,
  E2E_FACILITY_PLAN_EQUIPMENT_ID,
} from './facility-fixtures';

/** Metadata for the immutable single-node GLB used by browser import scenarios. */
export function spatialFacilityModel() {
  return {
    '@id': '/api/facility-models/e2e-building-model',
    '@type': 'FacilityModel',
    id: 'e2e-building-model',
    organizationId: E2E_ORGANIZATION_ID,
    buildingId: E2E_FACILITY_ID,
    fileName: 'building.glb',
    mimeType: 'model/gltf-binary',
    fileSize: spatialGlb().length,
    nodeCount: 1,
    nodes: [{ index: 0, name: 'Ground Floor' }],
    revision: 1,
    active: true,
    transform: { scale: 1, rotationDegrees: 0, translation: { x: 0, y: 0, z: 0 } },
    bindings: [{ nodeIndex: 0, facilityId: E2E_FACILITY_CHILD_ID }],
    bindingIssues: [] as { nodeIndex: number; code: 'target_unavailable' }[],
    downloadUrl: '/api/facility-models/e2e-building-model/download',
    createdAt: '2026-10-03T08:00:00+00:00',
    updatedAt: '2026-10-03T08:00:00+00:00',
  };
}

export type FacilityModelOutputFixture = ReturnType<typeof spatialFacilityModel>;

/** Encodes a PNG chunk including its CRC without extra fixture dependencies. */
function pngChunk(type: string, data: Buffer): Buffer {
  const bytes = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, bytes, checksum]);
}

/** A real non-square PNG with dimensions matching the spatial plan metadata. */
export function spatialPlanPng(): Buffer {
  const width = 1200;
  const height = 800;
  const rowBytes = width * 4 + 1;
  const pixels = Buffer.alloc(rowBytes * height, 255);
  for (let y = 0; y < height; y++) pixels[y * rowBytes] = 0;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A complete two-floor building with independently calibrated image plans. */
export function spatialBuildingModel() {
  const floor = {
    facilityId: E2E_FACILITY_CHILD_ID,
    name: 'Ground Floor',
    levelIndex: 0,
    elevationMeters: 0,
    heightMeters: 3,
    status: 'active',
    plan: {
      attachmentId: E2E_FACILITY_PLAN_ID,
      imageWidth: 1200,
      imageHeight: 800,
      calibration: { widthMeters: 12, rotationDegrees: 0, offsetXMeters: 0, offsetZMeters: 0 },
      calibrationBuildingId: E2E_FACILITY_ID,
      calibrationIssue: null,
    },
    outline: {
      source: 'plan_geometry' as const,
      points: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ] as const,
    },
    rooms: [
      {
        facilityId: E2E_FACILITY_PLAN_ZONE_ID,
        name: 'Storage',
        type: 'zone',
        status: 'active',
        points: [
          [0.1, 0.1],
          [0.45, 0.1],
          [0.45, 0.5],
          [0.1, 0.5],
        ] as const,
      },
    ],
    equipment: [
      {
        equipmentId: E2E_FACILITY_PLAN_EQUIPMENT_ID,
        facilityId: E2E_FACILITY_PLAN_ZONE_ID,
        type: 'fire_extinguisher',
        serialNumber: 'SN-SPATIAL-1',
        locationLabel: 'Storage extinguisher',
        status: 'operational',
        position: { attachmentId: E2E_FACILITY_PLAN_ID, x: 0.25, y: 0.25 },
        placementIssue: null,
      },
      {
        equipmentId: 'e2e-unplaced-equipment',
        facilityId: E2E_FACILITY_CHILD_ID,
        type: 'fire_extinguisher',
        serialNumber: 'SN-SPATIAL-2',
        locationLabel: 'Unplaced extinguisher',
        status: 'operational',
        position: null,
        placementIssue: 'unplaced',
      },
    ],
    hierarchyIssues: [],
    diagnostics: { invalidGeometryCount: 0, unpositionedEquipmentCount: 1, geometryIssues: [] },
  };
  return {
    '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/facilities/${E2E_FACILITY_ID}/building-model`,
    '@type': 'FacilityBuildingModel',
    buildingId: E2E_FACILITY_ID,
    buildingName: 'North Building',
    floors: [
      floor,
      {
        ...floor,
        facilityId: 'e2e-upper-floor',
        name: 'Upper Floor',
        levelIndex: 1,
        elevationMeters: 3,
        plan: { ...floor.plan, attachmentId: 'e2e-upper-plan' },
        rooms: [{ ...floor.rooms[0], facilityId: 'e2e-upper-room', name: 'Office' }],
        equipment: [],
        diagnostics: { invalidGeometryCount: 0, unpositionedEquipmentCount: 0, geometryIssues: [] },
      },
    ],
  };
}

/** A usable calibrated floor retained below an atypical legacy zone branch. */
export function spatialLegacyBuildingModel() {
  const model = spatialBuildingModel();
  return {
    ...model,
    floors: [
      {
        ...model.floors[0],
        hierarchyIssues: ['invalid_parent_type', 'invalid_ancestor'],
      },
      model.floors[1],
    ],
  };
}

/** Generates an autonomous, valid glTF 2 GLB with one indexed triangle mesh. */
export function spatialGlb(): Buffer {
  const binary = Buffer.alloc(36);
  [0, 0, 0, 12, 0, 0, 0, 8, 0].forEach((value, index) => binary.writeFloatLE(value, index * 4));
  const document = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Ground Floor', mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [
      {
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [0.55, 0.6, 0.65, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: binary.length }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: 'VEC3',
        min: [0, 0, 0],
        max: [12, 8, 0],
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
