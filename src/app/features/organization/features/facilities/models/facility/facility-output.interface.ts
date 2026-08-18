import type { HydraItem } from '@core/api/models';
import type { FacilityPlanGeometry } from './facility-plan-geometry.interface';

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
 * Interface FacilityPathSegment
 * @interface FacilityPathSegment
 *
 * @description
 * One ancestor entry of a facility's breadcrumb, as served by the detail
 * providers.
 */
export interface FacilityPathSegment {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly name: string;
  /** @type {FacilityType} */
  readonly type: FacilityType;
  //#endregion
}

/**
 * Interface FacilityOutput
 * @interface FacilityOutput
 *
 * @description
 * Facility resource returned by the API.
 */
export interface FacilityOutput extends HydraItem {
  /**
   * Optional intervention IRI when this facility is intervention-scoped.
   */
  readonly intervention?: string | null;
  /**
   * Record lifecycle state supporting draft/publish intervention workflows.
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
   * Property latitude
   * @readonly
   *
   * @description
   * Geographic latitude of the facility in decimal degrees, or null when the
   * facility has not been located.
   *
   * @type {number | null | undefined}
   */
  readonly latitude?: number | null;

  /**
   * Property longitude
   * @readonly
   *
   * @description
   * Geographic longitude of the facility in decimal degrees, or null when the
   * facility has not been located.
   *
   * @type {number | null | undefined}
   */
  readonly longitude?: number | null;

  /**
   * Property planGeometry
   * @readonly
   *
   * @description
   * This facility's own zone outline on one of its parent's floor plans,
   * present only on the detail read (`FacilityService.get`); absent
   * (`undefined`) on the organization-scoped list/children/descendants
   * collections, and `null` when the facility has no outline drawn yet.
   *
   * @type {FacilityPlanGeometry | null | undefined}
   */
  readonly planGeometry?: FacilityPlanGeometry | null;

  /**
   * Property path
   * @readonly
   *
   * @description
   * Ancestor breadcrumb ordered root first, direct parent last, excluding
   * this facility. Empty for a root facility — and deliberately left empty
   * by the list/children/descendants collection providers to avoid an N+1
   * ancestor lookup per row: only the detail reads populate it.
   *
   * @type {ReadonlyArray<FacilityPathSegment>}
   */
  readonly path: ReadonlyArray<FacilityPathSegment>;

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
