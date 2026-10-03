import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Texture,
  type LineSegments,
  type Points,
} from 'three';
import { FacilityModelAssetService } from '../facility-model-asset.service';

const glbBytes = (): ArrayBuffer => {
  const content = new TextEncoder().encode(
    JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0, 1] }],
      nodes: [{ name: 'Room' }, { name: 'Room' }],
    }),
  );
  const jsonLength = Math.ceil(content.length / 4) * 4;
  const bytes = new ArrayBuffer(20 + jsonLength);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20).fill(32);
  new Uint8Array(bytes, 20, content.length).set(content);
  return bytes;
};

const binaryBlob = (bytes: ArrayBuffer): Blob => {
  const blob = new Blob();
  Object.defineProperty(blob, 'arrayBuffer', {
    configurable: true,
    value: (): Promise<ArrayBuffer> => Promise.resolve(bytes),
  });
  return blob;
};

/**
 * Function primitiveGlbBytes
 *
 * @description
 * Encodes real embedded Line/Points primitives sharing one material adapted by GLTFLoader.
 *
 * @returns {ArrayBuffer} Autonomous GLB with JSON and binary chunks.
 */
const primitiveGlbBytes = (): ArrayBuffer => {
  const binary = new Float32Array([0, 1, 0, 12, 1, 0, 6, 5, 4]);
  const content = new TextEncoder().encode(
    JSON.stringify({
      asset: { version: '2.0' },
      scene: 0,
      scenes: [{ nodes: [0, 1] }],
      nodes: [
        { name: 'Line', mesh: 0 },
        { name: 'Points', mesh: 1 },
      ],
      meshes: [
        { primitives: [{ attributes: { POSITION: 0 }, mode: 1, material: 0 }] },
        { primitives: [{ attributes: { POSITION: 1 }, mode: 0, material: 0 }] },
      ],
      materials: [{ pbrMetallicRoughness: { metallicFactor: 0, roughnessFactor: 1 } }],
      buffers: [{ byteLength: binary.byteLength }],
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
    }),
  );
  const jsonLength = Math.ceil(content.byteLength / 4) * 4;
  const bytes = new ArrayBuffer(28 + jsonLength + binary.byteLength);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20, jsonLength).fill(32);
  new Uint8Array(bytes, 20, content.byteLength).set(content);
  view.setUint32(20 + jsonLength, binary.byteLength, true);
  view.setUint32(24 + jsonLength, 0x004e4942, true);
  new Uint8Array(bytes, 28 + jsonLength).set(new Uint8Array(binary.buffer));
  return bytes;
};

const missingRead = (): void => {
  throw new Error('Missing pending read');
};

describe('FacilityModelAssetService', () => {
  let service: FacilityModelAssetService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FacilityModelAssetService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });
    service = TestBed.inject(FacilityModelAssetService);
  });

  it('parses a valid GLB through browser-only GLTFLoader and preserves duplicate-name indices', async () => {
    const asset = await firstValueFrom(service.load(binaryBlob(glbBytes())));
    expect(asset.nodes.map((node) => ({ index: node.index, name: node.name }))).toEqual([
      { index: 0, name: 'Room' },
      { index: 1, name: 'Room' },
    ]);
    expect(asset.nodes[0].objects[0].userData['facilityModelNodeIndex']).toBe(0);
    expect(asset.nodes[1].objects[0].userData['facilityModelNodeIndex']).toBe(1);
    service.dispose(asset);
  });

  it('rejects invalid bytes with the specific GLB validation message', async () => {
    await expect(firstValueFrom(service.load(binaryBlob(new ArrayBuffer(5))))).rejects.toThrow(
      'valid autonomous GLB 2.0',
    );
  });

  it('parses Line/Points with undefined material associations while retaining indexed objects and resource ownership', async () => {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync');
    try {
      const asset = await firstValueFrom(service.load(binaryBlob(primitiveGlbBytes())));
      const gltf = await parse.mock.results[0].value;
      expect([...gltf.parser.associations.values()]).toContain(undefined);
      const line = asset.nodes[0].objects[0] as LineSegments;
      const points = asset.nodes[1].objects[0] as Points;
      expect(line.isLineSegments).toBe(true);
      expect(points.isPoints).toBe(true);
      expect(line.userData['facilityModelNodeIndex']).toBe(0);
      expect(points.userData['facilityModelNodeIndex']).toBe(1);
      const lineGeometryDispose = vi.spyOn(line.geometry, 'dispose');
      const pointsGeometryDispose = vi.spyOn(points.geometry, 'dispose');
      const lineMaterial = Array.isArray(line.material) ? line.material[0] : line.material;
      const pointsMaterial = Array.isArray(points.material) ? points.material[0] : points.material;
      const lineMaterialDispose = vi.spyOn(lineMaterial, 'dispose');
      const pointsMaterialDispose = vi.spyOn(pointsMaterial, 'dispose');
      service.dispose(asset);
      expect(lineGeometryDispose).toHaveBeenCalledOnce();
      expect(pointsGeometryDispose).toHaveBeenCalledOnce();
      expect(lineMaterialDispose).toHaveBeenCalledOnce();
      expect(pointsMaterialDispose).toHaveBeenCalledOnce();
    } finally {
      parse.mockRestore();
    }
  });

  it('does not publish an abandoned asynchronous file read', async () => {
    let resolveRead: (bytes: ArrayBuffer) => void = missingRead;
    const pending = new Promise<ArrayBuffer>((resolve) => {
      resolveRead = resolve;
    });
    const blob = new Blob();
    Object.defineProperty(blob, 'arrayBuffer', { value: (): Promise<ArrayBuffer> => pending });
    const next = vi.fn();
    const subscription = service.load(blob).subscribe(next);
    subscription.unsubscribe();
    resolveRead(glbBytes());
    await Promise.resolve();
    await Promise.resolve();
    expect(next).not.toHaveBeenCalled();
  });

  it('disposes shared geometry, materials and textures exactly once across all source scenes', () => {
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshBasicMaterial({ map: texture });
    const scene = new Group();
    const otherScene = new Group();
    scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
    otherScene.add(new Mesh(geometry, material));
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    service.dispose({ scene, sourceScenes: [scene, otherScene], nodes: [] });
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });

  it('does not read or import model bytes during SSR', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [FacilityModelAssetService, { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const server = TestBed.inject(FacilityModelAssetService);
    const blob = binaryBlob(glbBytes());
    const read = vi.spyOn(blob, 'arrayBuffer');
    server.load(blob).subscribe();
    expect(read).not.toHaveBeenCalled();
  });
});
