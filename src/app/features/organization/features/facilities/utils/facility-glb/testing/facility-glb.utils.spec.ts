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

  it('preserves the validation order when a file has multiple incompatible resources', () => {
    const invalid = 'Choose a valid autonomous GLB 2.0 file.';
    const external = 'Embed all model textures and buffers in the GLB file.';
    const unsupported = 'The model requires an unsupported GLB extension.';
    expect(() =>
      readFacilityGlb(glb({ asset: { version: '1.0' }, extensionsRequired: ['custom'] })),
    ).toThrow(invalid);
    expect(() =>
      readFacilityGlb(
        glb({ asset: { version: '2.0' }, extensionsRequired: ['custom'], buffers: [false] }),
      ),
    ).toThrow(unsupported);
    expect(() =>
      readFacilityGlb(
        glb({ asset: { version: '2.0' }, buffers: [false], images: [{ uri: 'remote.png' }] }),
      ),
    ).toThrow(invalid);
    expect(() =>
      readFacilityGlb(
        glb({ asset: { version: '2.0' }, images: [{ uri: 'remote.png' }], nodes: [false] }),
      ),
    ).toThrow(external);
    expect(() =>
      readFacilityGlb(
        glb({
          asset: { version: '2.0' },
          nodes: [false],
          extensions: { custom: { uri: 'remote.bin' } },
        }),
      ),
    ).toThrow(invalid);
    expect(() =>
      readFacilityGlb(
        glb({
          asset: { version: '2.0', minVersion: '2.1' },
          extensions: { custom: { uri: 'remote.bin' } },
        }),
      ),
    ).toThrow(invalid);
  });

  it.each([
    { buffers: [{ byteLength: -1 }] },
    { buffers: [{ byteLength: 1.5 }] },
    { buffers: [{ byteLength: 5 }] },
    { buffers: [{ byteLength: 0 }] },
    { buffers: [{ byteLength: 4 }, { byteLength: 4 }] },
    { images: [{}] },
    { images: [{ bufferView: 0, uri: 'remote.png' }] },
    { images: [{ uri: 'data:image/svg+xml;base64,YQ==' }] },
    { nodes: [[]] },
    { nodes: [{ name: 1 }] },
    { asset: { version: '2.0', minVersion: '2.1' } },
    { extensions: { custom: [{ nested: { uri: false } }] } },
  ])('rejects malformed embedded metadata: %j', (extra) => {
    expect(() =>
      readFacilityGlb(glb({ asset: { version: '2.0' }, ...extra }, new Uint8Array([1, 2, 3, 4]))),
    ).toThrow();
  });

  it('rejects invalid UTF-8 and JSON without leaking decoder diagnostics', () => {
    const invalid = 'Choose a valid autonomous GLB 2.0 file.';
    const invalidUtf8 = glb({ asset: { version: '2.0' } });
    new Uint8Array(invalidUtf8)[20] = 255;
    expect(() => readFacilityGlb(invalidUtf8)).toThrow(invalid);
    const invalidJson = glb({ asset: { version: '2.0' } });
    new Uint8Array(invalidJson)[20] = 0;
    expect(() => readFacilityGlb(invalidJson)).toThrow(invalid);
  });

  it('rejects wrong chunk kinds, a partial trailing header and extra chunks', () => {
    const bytes = glb({ asset: { version: '2.0' } });
    const wrongJsonKind = bytes.slice(0);
    new DataView(wrongJsonKind).setUint32(16, 0x004e4942, true);
    expect(() => readFacilityGlb(wrongJsonKind)).toThrow();
    const wrongBinKind = glb({ asset: { version: '2.0' } }, new Uint8Array([1]));
    new DataView(wrongBinKind).setUint32(bytes.byteLength + 4, 0x4e4f534a, true);
    expect(() => readFacilityGlb(wrongBinKind)).toThrow();
    const trailingHeader = new ArrayBuffer(bytes.byteLength + 4);
    new Uint8Array(trailingHeader).set(new Uint8Array(bytes));
    new DataView(trailingHeader).setUint32(8, trailingHeader.byteLength, true);
    expect(() => readFacilityGlb(trailingHeader)).toThrow();
    const bin = glb({ asset: { version: '2.0' } }, new Uint8Array([1]));
    const extraChunk = new ArrayBuffer(bin.byteLength + 8);
    new Uint8Array(extraChunk).set(new Uint8Array(bin));
    new DataView(extraChunk).setUint32(8, extraChunk.byteLength, true);
    new DataView(extraChunk).setUint32(bin.byteLength + 4, 0x004e4942, true);
    expect(() => readFacilityGlb(extraChunk)).toThrow();
  });

  it('accepts absent catalogues and supported embedded references nested in extension arrays', () => {
    expect(
      readFacilityGlb(
        glb({
          asset: { version: '2.0', minVersion: '2.0' },
          extensionsRequired: [],
          buffers: [],
          images: [{ bufferView: 0 }],
          extensions: { custom: [{ uri: 'data:image/webp;base64,YQ==' }] },
        }),
      ).nodes,
    ).toEqual([]);
  });
});
