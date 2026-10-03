import type { CallState } from '@core/request-state';
import type {
  FacilityModelAsset,
  FacilityModelInput,
  FacilityModelUploadInput,
  FacilityOutput,
} from '@features/organization/features/facilities/models';

/**
 * Interface FacilityModelDownload
 * @interface FacilityModelDownload
 *
 * @description
 * Delivers authenticated bytes to the page's browser download action.
 */
export interface FacilityModelDownload {
  /**
   * Property blob
   * @readonly
   *
   * @description
   * Authenticated file bytes.
   *
   * @type {Blob}
   */
  readonly blob: Blob;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Original filename.
   *
   * @type {string}
   */
  readonly fileName: string;
}

/**
 * Type FacilityModelCommand
 *
 * @description
 * Serializes model writes while retaining their accepted organization and building scope.
 *
 * @type {FacilityModelCommand}
 */
export type FacilityModelCommand = {
  readonly scopeRevision: number;
  readonly organizationId: string;
  readonly buildingId: string;
  readonly revision: number | null;
} & (
  | { readonly kind: 'upload'; readonly input: FacilityModelUploadInput }
  | { readonly kind: 'update'; readonly id: string; readonly input: FacilityModelInput }
  | { readonly kind: 'activate' | 'remove'; readonly id: string }
);

/**
 * Interface FacilityModelsState
 * @interface FacilityModelsState
 *
 * @description
 * Holds scope-fenced read state and independent write states beside the model entity collection.
 */
export interface FacilityModelsState {
  /**
   * Property bindingFacilities
   * @readonly
   *
   * @description
   * Authorized building hierarchy retained independently of plan contours.
   *
   * @type {readonly FacilityOutput[]}
   */
  readonly bindingFacilities: readonly FacilityOutput[];

  /**
   * Property optionsCallState
   * @readonly
   *
   * @description
   * Building-bound facility choices request.
   *
   * @type {CallState}
   */
  readonly optionsCallState: CallState;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization, null before activation.
   *
   * @type {string | null}
   */
  readonly organizationId: string | null;

  /**
   * Property buildingId
   * @readonly
   *
   * @description
   * Owning building, null before activation.
   *
   * @type {string | null}
   */
  readonly buildingId: string | null;

  /**
   * Property scopeRevision
   * @readonly
   *
   * @description
   * Advances on every scope change, including A-B-A reuse.
   *
   * @type {number}
   */
  readonly scopeRevision: number;

  /**
   * Property selectedModelId
   * @readonly
   *
   * @description
   * Selected immutable model.
   *
   * @type {string | null}
   */
  readonly selectedModelId: string | null;

  /**
   * Property selectedNodeIndex
   * @readonly
   *
   * @description
   * Selected source node index.
   *
   * @type {number | null}
   */
  readonly selectedNodeIndex: number | null;

  /**
   * Property previewAsset
   * @readonly
   *
   * @description
   * Parsed browser asset, owned by this store.
   *
   * @type {FacilityModelAsset | null}
   */
  readonly previewAsset: FacilityModelAsset | null;

  /**
   * Property settingsSavedToken
   * @readonly
   *
   * @description
   * Advances only after confirmed settings writes.
   *
   * @type {number}
   */
  readonly settingsSavedToken: number;

  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Model collection request.
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property uploadCallState
   * @readonly
   *
   * @description
   * Autonomous GLB upload request.
   *
   * @type {CallState}
   */
  readonly uploadCallState: CallState;

  /**
   * Property updateCallState
   * @readonly
   *
   * @description
   * Placement and associations write.
   *
   * @type {CallState}
   */
  readonly updateCallState: CallState;

  /**
   * Property previewCallState
   * @readonly
   *
   * @description
   * Download and browser parsing request.
   *
   * @type {CallState}
   */
  readonly previewCallState: CallState;

  /**
   * Property activateCallState
   * @readonly
   *
   * @description
   * Atomic activation write.
   *
   * @type {CallState}
   */
  readonly activateCallState: CallState;

  /**
   * Property removeCallState
   * @readonly
   *
   * @description
   * Deletion write.
   *
   * @type {CallState}
   */
  readonly removeCallState: CallState;

  /**
   * Property downloadCallState
   * @readonly
   *
   * @description
   * Authenticated file download.
   *
   * @type {CallState<FacilityModelDownload>}
   */
  readonly downloadCallState: CallState<FacilityModelDownload>;
}
