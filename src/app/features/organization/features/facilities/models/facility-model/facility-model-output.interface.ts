import type { HydraItem } from '@core/api/models';
import type { FacilityModelBindingIssueCode } from '../facility-spatial-issue-tag/facility-spatial-issue.type';

/**
 * Interface FacilityModelBindingIssue
 * @interface FacilityModelBindingIssue
 *
 * @description
 * Identifies an unavailable node association without revealing its inaccessible target.
 */
export interface FacilityModelBindingIssue {
  /**
   * Property nodeIndex
   * @readonly
   *
   * @description
   * Immutable source node whose stored association cannot currently be used.
   *
   * @type {number}
   */
  readonly nodeIndex: number;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Safe reason why the associated target is unavailable.
   *
   * @type {FacilityModelBindingIssueCode}
   */
  readonly code: FacilityModelBindingIssueCode;
}

/**
 * Interface FacilityModelTransform
 * @interface FacilityModelTransform
 *
 * @description
 * Places immutable model geometry in the building's metre-based reference frame.
 */
export interface FacilityModelTransform {
  /**
   * Property scale
   * @readonly
   *
   * @description
   * Uniform positive scale.
   *
   * @type {number}
   */
  readonly scale: number;

  /**
   * Property rotationDegrees
   * @readonly
   *
   * @description
   * Rotation about the vertical Y axis, in degrees.
   *
   * @type {number}
   */
  readonly rotationDegrees: number;

  /**
   * Property translation
   * @readonly
   *
   * @description
   * Translation in metres.
   *
   * @type {{ readonly x: number; readonly y: number; readonly z: number }}
   */
  readonly translation: { readonly x: number; readonly y: number; readonly z: number };
}

/**
 * Interface FacilityModelBinding
 * @interface FacilityModelBinding
 *
 * @description
 * Binds an immutable GLB node index to an existing facility; names never identify nodes.
 */
export interface FacilityModelBinding {
  /**
   * Property nodeIndex
   * @readonly
   *
   * @description
   * Original GLB node index.
   *
   * @type {number}
   */
  readonly nodeIndex: number;

  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Facility belonging to this building.
   *
   * @type {string}
   */
  readonly facilityId: string;
}

/**
 * Interface FacilityModelNode
 * @interface FacilityModelNode
 *
 * @description
 * Describes a selectable source node using its immutable index and display name.
 */
export interface FacilityModelNode {
  /**
   * Property index
   * @readonly
   *
   * @description
   * Original GLB node index.
   *
   * @type {number}
   */
  readonly index: number;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Display-only name, which may repeat.
   *
   * @type {string}
   */
  readonly name: string;
}

/**
 * Interface FacilityModelOutput
 * @interface FacilityModelOutput
 *
 * @description
 * Mirrors the authenticated facility model resource returned by the API.
 */
export interface FacilityModelOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Model identifier.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property buildingId
   * @readonly
   *
   * @description
   * Owning building.
   *
   * @type {string}
   */
  readonly buildingId: string;

  /**
   * Property fileName
   * @readonly
   *
   * @description
   * Original uploaded filename.
   *
   * @type {string}
   */
  readonly fileName: string;

  /**
   * Property mimeType
   * @readonly
   *
   * @description
   * GLB media type.
   *
   * @type {'model/gltf-binary'}
   */
  readonly mimeType: 'model/gltf-binary';

  /**
   * Property fileSize
   * @readonly
   *
   * @description
   * Immutable file size in bytes.
   *
   * @type {number}
   */
  readonly fileSize: number;

  /**
   * Property nodeCount
   * @readonly
   *
   * @description
   * Count of indexed source nodes.
   *
   * @type {number}
   */
  readonly nodeCount: number;

  /**
   * Property nodes
   * @readonly
   *
   * @description
   * Immutable node catalogue.
   *
   * @type {readonly FacilityModelNode[]}
   */
  readonly nodes: readonly FacilityModelNode[];

  /**
   * Property revision
   * @readonly
   *
   * @description
   * Optimistic concurrency revision.
   *
   * @type {number}
   */
  readonly revision: number;

  /**
   * Property active
   * @readonly
   *
   * @description
   * Whether this is the building's active model.
   *
   * @type {boolean}
   */
  readonly active: boolean;

  /**
   * Property transform
   * @readonly
   *
   * @description
   * Placement within the common building reference frame.
   *
   * @type {FacilityModelTransform}
   */
  readonly transform: FacilityModelTransform;

  /**
   * Property bindings
   * @readonly
   *
   * @description
   * Existing facility associations.
   *
   * @type {readonly FacilityModelBinding[]}
   */
  readonly bindings: readonly FacilityModelBinding[];

  /**
   * Property bindingIssues
   * @readonly
   *
   * @description
   * Retained unavailable associations, with target identifiers deliberately omitted.
   *
   * @type {readonly FacilityModelBindingIssue[]}
   */
  readonly bindingIssues: readonly FacilityModelBindingIssue[];

  /**
   * Property downloadUrl
   * @readonly
   *
   * @description
   * Authenticated endpoint; callers download through the service.
   *
   * @type {string}
   */
  readonly downloadUrl: string;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Latest update timestamp.
   *
   * @type {string}
   */
  readonly updatedAt: string;
}
