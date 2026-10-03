import type { Object3D } from 'three';

/**
 * Interface FacilityModelAsset
 * @interface FacilityModelAsset
 *
 * @description
 * Browser-parsed GLB resources owned by the models store. Renderers clone resources they dispose.
 */
export interface FacilityModelAsset {
  /**
   * Property scene
   * @readonly
   *
   * @description
   * Untransformed source scene; consumers must not mutate it.
   *
   * @type {Object3D}
   */
  readonly scene: Object3D;

  /**
   * Property sourceScenes
   * @readonly
   *
   * @description
   * All parsed source scenes whose resources share the store's lifecycle.
   *
   * @type {readonly Object3D[]}
   */
  readonly sourceScenes?: readonly Object3D[];

  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Source node indices and their parsed scene objects.
   *
   * @type {readonly {
   *   readonly index: number;
   *   readonly name: string;
   *   readonly objects: readonly Object3D[];
   * }[]}
   */
  readonly nodes: readonly {
    readonly index: number;
    readonly name: string;
    readonly objects: readonly Object3D[];
  }[];
}

/**
 * Interface FacilityGlbDocument
 * @interface FacilityGlbDocument
 *
 * @description
 * Holds the validated GLB JSON chunk used before importing any browser parser.
 */
export interface FacilityGlbDocument {
  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Source nodes, preserving original array indices.
   *
   * @type {readonly { readonly name?: string }[]}
   */
  readonly nodes: readonly { readonly name?: string }[];
}
