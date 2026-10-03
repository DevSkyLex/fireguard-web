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
  validateGlbHeader(bytes, invalid);
  const { document, binaryLength } = readGlbChunks(bytes, invalid);
  const asset = readGlbAsset(document['asset'], invalid);
  validateRequiredExtensions(document['extensionsRequired']);
  validateEmbeddedBuffers(document['buffers'], binaryLength, invalid);
  validateEmbeddedImages(document['images']);
  const nodes = readGlbNodes(document['nodes'], invalid);
  if ('minVersion' in asset && asset['minVersion'] !== '2.0') throw new Error(invalid);
  validateResourceUris(document);
  return { nodes };
}

/**
 * Function validateGlbHeader
 *
 * @description
 * Rejects oversized or mismatched containers before reading chunk offsets.
 *
 * @access private
 *
 * @param {ArrayBuffer} bytes - Uploaded GLB bytes.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {void} Completes only for a matching GLB 2.0 header.
 */
function validateGlbHeader(bytes: ArrayBuffer, invalid: string): void {
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
}

/**
 * Function readGlbChunks
 *
 * @description
 * Reads one JSON chunk and its optional BIN chunk without accepting extra or misaligned chunks.
 *
 * @access private
 *
 * @param {ArrayBuffer} bytes - Container with an already validated header.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {{ document: Record<string, unknown>; binaryLength: number }} Parsed JSON and padded BIN
 *   size.
 */
function readGlbChunks(
  bytes: ArrayBuffer,
  invalid: string,
): { document: Record<string, unknown>; binaryLength: number } {
  const view: DataView = new DataView(bytes);
  let offset: number = 12;
  let json: unknown;
  let binaryLength: number = 0;
  let chunkCount: number = 0;
  while (offset < bytes.byteLength) {
    const length = readGlbChunkLength(view, offset, chunkCount, invalid);
    offset += 8;
    if (chunkCount === 0) {
      json = readGlbJson(bytes, offset, length, invalid);
    } else {
      binaryLength = length;
    }
    chunkCount += 1;
    offset += length;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error(invalid);
  return { document: json as Record<string, unknown>, binaryLength };
}

/**
 * Function readGlbChunkLength
 *
 * @description
 * Validates a chunk's bounds, alignment and ordered kind before exposing its payload length.
 *
 * @access private
 *
 * @param {DataView} view - Uploaded container bytes with an already validated header.
 * @param {number} offset - Chunk header offset in bytes.
 * @param {number} chunkCount - Number of previously consumed chunks.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {number} Bounded and aligned payload length in bytes.
 */
function readGlbChunkLength(
  view: DataView,
  offset: number,
  chunkCount: number,
  invalid: string,
): number {
  if (offset + 8 > view.byteLength) throw new Error(invalid);
  const length = view.getUint32(offset, true);
  const kind = view.getUint32(offset + 4, true);
  if (length % 4 !== 0 || offset + 8 + length > view.byteLength || chunkCount > 1)
    throw new Error(invalid);
  const expectedKind = chunkCount === 0 ? 0x4e4f534a : 0x004e4942;
  if (kind !== expectedKind) throw new Error(invalid);
  return length;
}

/**
 * Function readGlbJson
 *
 * @description
 * Keeps invalid UTF-8 and JSON diagnostics identical to other malformed-container failures.
 *
 * @access private
 *
 * @param {ArrayBuffer} bytes - Uploaded GLB bytes.
 * @param {number} offset - JSON payload offset in bytes.
 * @param {number} length - JSON payload length in bytes.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {unknown} Decoded JSON before document validation.
 */
function readGlbJson(bytes: ArrayBuffer, offset: number, length: number, invalid: string): unknown {
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes, offset, length)),
    ) as unknown;
  } catch {
    throw new Error(invalid);
  }
}

/**
 * Function readGlbAsset
 *
 * @description
 * Requires the asset version before validating extensions and embedded resources.
 *
 * @access private
 *
 * @param {unknown} asset - Untrusted asset metadata from the JSON chunk.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {Record<string, unknown>} Asset metadata declaring GLB 2.0.
 */
function readGlbAsset(asset: unknown, invalid: string): Record<string, unknown> {
  if (
    typeof asset !== 'object' ||
    asset === null ||
    !('version' in asset) ||
    asset.version !== '2.0'
  )
    throw new Error(invalid);
  return asset as Record<string, unknown>;
}

/**
 * Function validateRequiredExtensions
 *
 * @description
 * Rejects every mandatory extension before browser parser loading.
 *
 * @access private
 *
 * @param {unknown} required - Untrusted mandatory extension list.
 *
 * @returns {void} Completes when no extension is required.
 */
function validateRequiredExtensions(required: unknown): void {
  if (required !== undefined && (!Array.isArray(required) || required.length > 0)) {
    throw new Error(
      $localize`:@@facility.model.unsupportedExtension:The model requires an unsupported GLB extension.`,
    );
  }
}

/**
 * Function validateEmbeddedBuffers
 *
 * @description
 * Requires the single optional buffer to fit the BIN chunk with at most three padding bytes.
 *
 * @access private
 *
 * @param {unknown} buffers - Untrusted buffer catalogue.
 * @param {number} binaryLength - Padded BIN payload size in bytes.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {void} Completes when all declared buffers are embedded and bounded.
 */
function validateEmbeddedBuffers(buffers: unknown, binaryLength: number, invalid: string): void {
  if (buffers === undefined) return;
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

/**
 * Function validateEmbeddedImages
 *
 * @description
 * Accepts embedded image views or supported image data URI formats without external requests.
 *
 * @access private
 *
 * @param {unknown} images - Untrusted image catalogue.
 *
 * @returns {void} Completes when images can be resolved entirely from the uploaded file.
 */
function validateEmbeddedImages(images: unknown): void {
  if (
    images !== undefined &&
    (!Array.isArray(images) || images.some((image: unknown) => !isEmbeddedImage(image)))
  ) {
    throw new Error(
      $localize`:@@facility.model.externalResources:Embed all model textures and buffers in the GLB file.`,
    );
  }
}

/**
 * Function isEmbeddedImage
 *
 * @description
 * Checks an image's embedded source without importing the GLTF parser.
 *
 * @access private
 *
 * @param {unknown} image - Untrusted image metadata.
 *
 * @returns {boolean} Whether the image declares an embedded source.
 */
function isEmbeddedImage(image: unknown): boolean {
  return (
    typeof image === 'object' &&
    image !== null &&
    ('bufferView' in image || 'uri' in image) &&
    (!('uri' in image) || isEmbeddedImageUri(image.uri))
  );
}

/**
 * Function isEmbeddedImageUri
 *
 * @description
 * Restricts image data URIs to the existing supported base64 media formats.
 *
 * @access private
 *
 * @param {unknown} uri - Untrusted resource location.
 *
 * @returns {boolean} Whether the URI embeds a supported image.
 */
function isEmbeddedImageUri(uri: unknown): boolean {
  return (
    typeof uri === 'string' && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(uri)
  );
}

/**
 * Function readGlbNodes
 *
 * @description
 * Bounds the original node catalogue without filtering or changing its source indices.
 *
 * @access private
 *
 * @param {unknown} nodes - Untrusted source node catalogue.
 * @param {string} invalid - Localized malformed-container diagnostic.
 *
 * @returns {FacilityGlbDocument['nodes']} Source nodes in their original order.
 */
function readGlbNodes(nodes: unknown, invalid: string): FacilityGlbDocument['nodes'] {
  if (nodes === undefined) return [];
  if (!Array.isArray(nodes) || nodes.length > 10000 || nodes.some(isInvalidGlbNode))
    throw new Error(invalid);
  return nodes as FacilityGlbDocument['nodes'];
}

/**
 * Function isInvalidGlbNode
 *
 * @description
 * Rejects non-object nodes and non-string display names before catalogue projection.
 *
 * @access private
 *
 * @param {unknown} node - Untrusted source node.
 *
 * @returns {boolean} Whether the node cannot be represented in the source catalogue.
 */
function isInvalidGlbNode(node: unknown): boolean {
  return (
    typeof node !== 'object' ||
    node === null ||
    Array.isArray(node) ||
    ('name' in node && typeof node.name !== 'string')
  );
}

/**
 * Function validateResourceUris
 *
 * @description
 * Rejects external resource references at any JSON depth, including optional extensions.
 *
 * @access private
 *
 * @param {Record<string, unknown>} document - JSON document with validated core catalogues.
 *
 * @returns {void} Completes when every remaining URI is autonomous.
 */
function validateResourceUris(document: Record<string, unknown>): void {
  const pending: unknown[] = [document];
  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value !== 'object' || value === null) continue;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'uri' && !isEmbeddedImageUri(item)) {
        throw new Error(
          $localize`:@@facility.model.externalResources:Embed all model textures and buffers in the GLB file.`,
        );
      }
      if (typeof item === 'object' && item !== null) pending.push(item);
    }
  }
}
