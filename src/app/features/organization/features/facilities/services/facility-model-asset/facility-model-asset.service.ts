import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';
import { Observable } from 'rxjs';
import type { BufferGeometry, Material, Mesh, Object3D, Texture } from 'three';
import type { FacilityModelAsset } from '@features/organization/features/facilities/models';
import { readFacilityGlb } from '@features/organization/features/facilities/utils';

/**
 * Class FacilityModelAssetService
 * @class FacilityModelAssetService
 *
 * @description
 * Parses validated GLB bytes only in the browser and disposes abandoned parsed resources.
 */
@Service()
export class FacilityModelAssetService {
  //#region Properties
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Prevents importing a browser model parser on the server.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);
  //#endregion

  //#region Methods
  /**
   * Method load
   * @method load
   *
   * @description
   * Parses the immutable scene; a cancelled continuation disposes instead of publishing it.
   *
   * @access public
   * @since unreleased
   *
   * @param {Blob} blob - Authenticated GLB download.
   *
   * @returns {Observable<FacilityModelAsset>} Parsed source asset owned by the subscriber.
   */
  public load(blob: Blob): Observable<FacilityModelAsset> {
    return new Observable<FacilityModelAsset>((subscriber) => {
      if (!isPlatformBrowser(this.platformId)) {
        subscriber.complete();
        return;
      }
      void blob
        .arrayBuffer()
        .then(async (bytes): Promise<FacilityModelAsset | null> => {
          const document = readFacilityGlb(bytes);
          if (subscriber.closed) return null;
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
          if (subscriber.closed) return null;
          const gltf = await new GLTFLoader().parseAsync(bytes, '');
          const objectsByNode: Map<number, Object3D[]> = new Map();
          for (const [object, association] of gltf.parser.associations) {
            if (association?.nodes === undefined || !('isObject3D' in object)) continue;
            const objects = objectsByNode.get(association.nodes) ?? [];
            objects.push(object as Object3D);
            objectsByNode.set(association.nodes, objects);
          }
          const asset: FacilityModelAsset = {
            scene: gltf.scene,
            sourceScenes: gltf.scenes,
            nodes: document.nodes.map((node, index) => ({
              index,
              name: node.name ?? '',
              objects: objectsByNode.get(index) ?? [],
            })),
          };
          for (const node of asset.nodes) {
            for (const object of node.objects)
              object.userData['facilityModelNodeIndex'] = node.index;
          }
          if (subscriber.closed) {
            this.dispose(asset);
            return null;
          }
          return asset;
        })
        .then((asset): void => {
          if (!asset) return;
          if (subscriber.closed) {
            this.dispose(asset);
            return;
          }
          subscriber.next(asset);
          subscriber.complete();
        })
        .catch((error: unknown): void => subscriber.error(error));
    });
  }

  /**
   * Method dispose
   * @method dispose
   *
   * @description
   * Releases each original geometry, material and embedded texture exactly once.
   *
   * @access public
   * @since unreleased
   *
   * @param {FacilityModelAsset | null} asset - Source asset whose ownership has ended.
   *
   * @returns {void}
   */
  public dispose(asset: FacilityModelAsset | null): void {
    if (!asset) return;
    const geometries: Set<BufferGeometry> = new Set();
    const materials: Set<Material> = new Set();
    const textures: Set<Texture> = new Set();
    for (const scene of asset.sourceScenes ?? [asset.scene])
      scene.traverse((object): void => {
        const mesh = object as Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material) {
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
            materials.add(material);
        }
      });
    for (const material of materials) {
      for (const value of Object.values(material) as unknown[]) {
        if (
          typeof value === 'object' &&
          value !== null &&
          'isTexture' in value &&
          value.isTexture === true
        )
          textures.add(value as Texture);
      }
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) {
      const bitmap: unknown = texture.source.data;
      if (typeof ImageBitmap !== 'undefined' && bitmap instanceof ImageBitmap) bitmap.close();
      texture.dispose();
    }
  }
  //#endregion
}
