import type { FacilityGlbDocument } from '@features/organization/features/facilities/models';

/**
 * Function readFacilityGlb
 *
 * @description
 * Validates a GLB 2.0 container before a parser can resolve resources or extensions.
 *
 * @access public
 *
 * @param {ArrayBuffer} bytes - Uploaded binary file, at most 10 MiB.
 *
 * @returns {FacilityGlbDocument} Original node catalogue, preserving source indices.
 *
 * @throws {Error} When the container, embedded resources or required extensions are unsupported.
 */
export function readFacilityGlb(bytes: ArrayBuffer): FacilityGlbDocument {
  const invalid: string = $localize`:@@facility.model.invalidGlb:Choose a valid autonomous GLB 2.0 file.`;
  if (bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error($localize`:@@facility.model.tooLarge:The model must be no larger than 10 MiB.`);
  }
  if (bytes.byteLength < 20) throw new Error(invalid);
  const view: DataView = new DataView(bytes);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.byteLength
  )
    throw new Error(invalid);
  let offset: number = 12;
  let json: unknown;
  let binaryLength: number = 0;
  let chunkCount: number = 0;
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) throw new Error(invalid);
    const length: number = view.getUint32(offset, true);
    const kind: number = view.getUint32(offset + 4, true);
    offset += 8;
    if (length % 4 !== 0 || offset + length > bytes.byteLength || chunkCount > 1)
      throw new Error(invalid);
    if (chunkCount === 0) {
      if (kind !== 0x4e4f534a) throw new Error(invalid);
      try {
        json = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes, offset, length)),
        ) as unknown;
      } catch {
        throw new Error(invalid);
      }
    } else {
      if (kind !== 0x004e4942) throw new Error(invalid);
      binaryLength = length;
    }
    chunkCount += 1;
    offset += length;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error(invalid);
  const document: Record<string, unknown> = json as Record<string, unknown>;
  const asset: unknown = document['asset'];
  if (
    typeof asset !== 'object' ||
    asset === null ||
    !('version' in asset) ||
    asset.version !== '2.0'
  )
    throw new Error(invalid);
  const required: unknown = document['extensionsRequired'];
  if (required !== undefined && (!Array.isArray(required) || required.length > 0)) {
    throw new Error(
      $localize`:@@facility.model.unsupportedExtension:The model requires an unsupported GLB extension.`,
    );
  }
  const buffers: unknown = document['buffers'];
  if (buffers !== undefined) {
    if (!Array.isArray(buffers) || buffers.length > 1) throw new Error(invalid);
    for (const buffer of buffers as unknown[]) {
      if (
        typeof buffer !== 'object' ||
        buffer === null ||
        'uri' in buffer ||
        !('byteLength' in buffer) ||
        typeof buffer.byteLength !== 'number' ||
        !Number.isInteger(buffer.byteLength) ||
        buffer.byteLength < 0 ||
        buffer.byteLength > binaryLength ||
        binaryLength - buffer.byteLength > 3
      )
        throw new Error(invalid);
    }
  }
  const images: unknown = document['images'];
  if (
    images !== undefined &&
    (!Array.isArray(images) ||
      images.some(
        (image: unknown) =>
          typeof image !== 'object' ||
          image === null ||
          (!('bufferView' in image) && !('uri' in image)) ||
          ('uri' in image &&
            (typeof image.uri !== 'string' ||
              !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image.uri))),
      ))
  ) {
    throw new Error(
      $localize`:@@facility.model.externalResources:Embed all model textures and buffers in the GLB file.`,
    );
  }
  const nodes: unknown = document['nodes'];
  if (
    nodes !== undefined &&
    (!Array.isArray(nodes) ||
      nodes.length > 10000 ||
      nodes.some(
        (node: unknown) =>
          typeof node !== 'object' ||
          node === null ||
          Array.isArray(node) ||
          ('name' in node && typeof node.name !== 'string'),
      ))
  )
    throw new Error(invalid);
  if ('minVersion' in asset && asset.minVersion !== '2.0') throw new Error(invalid);
  const pending: unknown[] = [document];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value !== 'object' || value === null) continue;
    for (const [key, item] of Object.entries(value)) {
      if (
        key === 'uri' &&
        (typeof item !== 'string' ||
          !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item))
      ) {
        throw new Error(
          $localize`:@@facility.model.externalResources:Embed all model textures and buffers in the GLB file.`,
        );
      }
      if (typeof item === 'object' && item !== null) pending.push(item);
    }
  }
  return { nodes: nodes === undefined ? [] : (nodes as { readonly name?: string }[]) };
}
