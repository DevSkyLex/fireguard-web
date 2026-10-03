import type {
  FacilityModelBinding,
  FacilityModelTransform,
} from './facility-model-output.interface';

/**
 * Interface FacilityModelInput
 * @interface FacilityModelInput
 *
 * @description
 * Replaces model placement and associations without changing its immutable uploaded file.
 */
export interface FacilityModelInput {
  /**
   * Property transform
   * @readonly
   *
   * @description
   * Complete building-frame placement.
   *
   * @type {FacilityModelTransform}
   */
  readonly transform: FacilityModelTransform;

  /**
   * Property bindings
   * @readonly
   *
   * @description
   * Replaces usable associations while preserving masked associations at other indices.
   * Omitted or null preserves every association; an explicit empty array clears every association.
   *
   * @type {readonly FacilityModelBinding[] | null | undefined}
   */
  readonly bindings?: readonly FacilityModelBinding[] | null;

  /**
   * Property removeBindingNodeIndices
   * @readonly
   *
   * @description
   * Explicitly removes associations at these indices, including masked unavailable targets.
   *
   * @type {readonly number[] | undefined}
   */
  readonly removeBindingNodeIndices?: readonly number[];
}

/**
 * Interface FacilityModelUploadInput
 * @interface FacilityModelUploadInput
 *
 * @description
 * Carries an autonomous GLB file for the multipart upload boundary.
 */
export interface FacilityModelUploadInput {
  /**
   * Property file
   * @readonly
   *
   * @description
   * GLB bytes, limited to 10 MiB.
   *
   * @type {Blob}
   */
  readonly file: Blob;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Original filename displayed to the user.
   *
   * @type {string}
   */
  readonly fileName: string;
}
