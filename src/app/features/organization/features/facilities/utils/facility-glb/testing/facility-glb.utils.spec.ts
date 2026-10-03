import { readFacilityGlb } from '../facility-glb.utils';

const glb = (json: object, binary?: Uint8Array): ArrayBuffer => {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = Math.ceil(text.length / 4) * 4;
  const binLength = binary ? Math.ceil(binary.length / 4) * 4 : 0;
  const bytes = new ArrayBuffer(20 + jsonLength + (binary ? 8 + binLength : 0));
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20, jsonLength).fill(32);
  new Uint8Array(bytes, 20, text.length).set(text);
  if (binary) {
    view.setUint32(20 + jsonLength, binLength, true);
    view.setUint32(24 + jsonLength, 0x004e4942, true);
    new Uint8Array(bytes, 28 + jsonLength, binary.length).set(binary);
  }
  return bytes;
};

describe('readFacilityGlb', () => {
  it('preserves source-node indices when display names repeat or are absent', () => {
    expect(
      readFacilityGlb(
        glb({ asset: { version: '2.0' }, nodes: [{ name: 'Room' }, {}, { name: 'Room' }] }),
      ).nodes,
    ).toEqual([{ name: 'Room' }, {}, { name: 'Room' }]);
  });

  it('accepts embedded BIN and autonomous image data', () => {
    const bytes = glb(
      {
        asset: { version: '2.0' },
        buffers: [{ byteLength: 3 }],
        images: [{ uri: 'data:image/png;base64,YQ==' }],
        nodes: [],
      },
      new Uint8Array([1, 2, 3]),
    );
    expect(readFacilityGlb(bytes).nodes).toEqual([]);
  });

  it.each([
    { buffers: [{ uri: 'https://example.test/file.bin', byteLength: 0 }] },
    { images: [{ uri: 'https://example.test/texture.png' }] },
    { extensions: { custom: { uri: 'https://example.test/remote' } } },
    { extensionsRequired: ['KHR_draco_mesh_compression'] },
    { extensionsRequired: ['KHR_materials_unlit'] },
    { asset: { version: '1.0' } },
    { nodes: [false] },
  ])('rejects unsupported or external resources before parser imports: %j', (extra) => {
    expect(() => readFacilityGlb(glb({ asset: { version: '2.0' }, ...extra }))).toThrow();
  });

  it('rejects oversized files, invalid headers, truncated chunks and declared length mismatches', () => {
    expect(() => readFacilityGlb(new ArrayBuffer(10 * 1024 * 1024 + 1))).toThrow();
    expect(() => readFacilityGlb(new ArrayBuffer(10))).toThrow();
    const bytes = glb({ asset: { version: '2.0' } });
    new DataView(bytes).setUint32(8, bytes.byteLength + 4, true);
    expect(() => readFacilityGlb(bytes)).toThrow();
    const truncated = glb({ asset: { version: '2.0' } });
    new DataView(truncated).setUint32(12, truncated.byteLength, true);
    expect(() => readFacilityGlb(truncated)).toThrow();
  });
});
