import type { HydraItem } from '@core/api/models';
import type {
  FacilityGeometryIssue,
  FacilityHierarchyIssue,
} from '../facility-spatial-issue-tag/facility-spatial-issue.type';
import type { FacilityPlanGeometry } from './facility-plan-geometry.interface';

/**
 * Type FacilityType
 *
 * @description
 * Supported facility types exposed by the API.
 *
 * @type
 */
export type FacilityType = 'site' | 'building' | 'floor' | 'zone' | 'area';

/**
 * Type FacilityStatus
 *
 * @description
 * Supported lifecycle statuses for a facility.
 *
 * @type
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
  /**
   * Property id
   *
   * @description
   * Defines id within its owning feature.
   *
   * @type {string}
   */
  readonly id: string;
  /**
   * Property name
   *
   * @description
   * Defines name within its owning feature.
   *
   * @type {string}
   */
  readonly name: string;
  /**
   * Property type
   *
   * @description
   * Defines type within its owning feature.
   *
   * @type {FacilityType}
   */
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
   * Property intervention
   *
   * @description
   * Optional intervention IRI when this facility is intervention-scoped.
   */
  readonly intervention?: string | null;
  /**
   * Property recordStatus
   *
   * @description
   * Record lifecycle state supporting draft/publish intervention workflows.
   */
  readonly recordStatus?: 'draft' | 'published';
  /**
   * Property revision
   *
   * @description
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
   * Property levelIndex
   * @readonly
   *
   * @description
   * This facility's stacking order among its siblings when `type` is
   * `floor` — ground floor is `0`, a basement level is negative. `null`
   * when unset. Siblings are not required to be unique on this value.
   *
   * @type {number | null | undefined}
   */
  readonly levelIndex?: number | null;

  /**
   * Property elevationMeters
   *
   * @description
   * Floor elevation relative to the building origin, in metres.
   */
  readonly elevationMeters?: number | null;

  /**
   * Property heightMeters
   *
   * @description
   * Physical floor height, in metres.
   */
  readonly heightMeters?: number | null;

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
   * Property geometryIssue
   * @readonly
   *
   * @description
   * Current usability of the retained geometry reference, without clearing its saved coordinates.
   *
   * @type {FacilityGeometryIssue | null | undefined}
   */
  readonly geometryIssue?: FacilityGeometryIssue | null;

  /**
   * Property hierarchyIssues
   * @readonly
   *
   * @description
   * Safe structural diagnostics for legacy relationships which cannot currently be used.
   *
   * @type {readonly FacilityHierarchyIssue[] | undefined}
   */
  readonly hierarchyIssues?: readonly FacilityHierarchyIssue[];

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
   * Property equipmentCount
   * @readonly
   *
   * @description
   * Count of active equipment attached to this facility. The list, children
   * and descendants reads set it themselves server-side
   * (`ListFacilitiesProvider`, `ListFacilityChildrenProvider`,
   * `ListFacilityDescendantsProvider`); only the detail read routes it
   * through `FacilityDetailOutputFactory`. `0` only on the canonical
   * `/api/facilities` collection read, which does not compute it.
   *
   * @type {number}
   */
  readonly equipmentCount: number;

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
