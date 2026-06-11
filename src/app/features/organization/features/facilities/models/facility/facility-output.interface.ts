import type { HydraItem } from '@core/models/api';

/**
 * Type FacilityType
 *
 * @description
 * Supported facility types exposed by the API.
 */
export type FacilityType = 'site' | 'building' | 'floor' | 'zone' | 'area';

/**
 * Type FacilityStatus
 *
 * @description
 * Supported lifecycle statuses for a facility.
 */
export type FacilityStatus = 'active' | 'archived';

/**
 * Interface FacilityOutput
 * @interface FacilityOutput
 *
 * @description
 * Facility resource returned by the API.
 */
export interface FacilityOutput extends HydraItem {
  /**
   * Optional mission IRI when this facility is mission-scoped.
   */
  readonly mission?: string | null;
  /**
   * Record lifecycle state supporting draft/publish mission workflows.
   */
  readonly recordStatus?: 'draft' | 'published';
  /**
   * Monotonic revision returned by backend for publication consistency.
   */
  readonly revision?: number;
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the facility.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifier of the organization owning the facility.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property parentFacilityId
   * @readonly
   *
   * @description
   * Identifier of the parent facility in the hierarchy.
   *
   * @type {string | null}
   */
  readonly parentFacilityId: string | null;

  /**
   * Property hasChildren
   * @readonly
   *
   * @description
   * Whether the facility has at least one direct child. Drives the
   * TreeTable chevron: `true` shows an expand toggler (children fetched
   * lazily via the `/children` endpoint), `false` renders the node as a
   * leaf without triggering a children request.
   *
   * @type {boolean}
   */
  readonly hasChildren: boolean;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Type of the facility in the organization tree.
   *
   * @type {FacilityType}
   */
  readonly type: FacilityType;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Human-readable facility name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Optional business code associated with the facility.
   *
   * @type {string | null}
   */
  readonly code: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Current lifecycle status of the facility.
   *
   * @type {FacilityStatus}
   */
  readonly status: FacilityStatus;

  /**
   * Property address
   * @readonly
   *
   * @description
   * Postal or descriptive address of the facility.
   *
   * @type {string | null}
   */
  readonly address: string | null;

  /**
   * Property metadata
   * @readonly
   *
   * @description
   * Additional backend-provided metadata attached
   * to the facility.
   *
   * @type {Readonly<Record<string, string | null>>}
   */
  readonly metadata: Readonly<Record<string, string | null>>;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp of the facility.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Last update timestamp of the facility.
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
