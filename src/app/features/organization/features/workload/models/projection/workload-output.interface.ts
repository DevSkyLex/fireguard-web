import type { HydraItem } from '@core/api/models';
import type { WorkloadMemberOptionOutput } from './workload-member-option-output.interface';
import type { WorkloadProjectionOutput } from './workload-projection-output.interface';

/**
 * Interface WorkloadOutput
 * @interface WorkloadOutput
 *
 * @description
 * Authorized workload response and available team filters.
 *
 * @since 1.0.0
 */
export interface WorkloadOutput extends HydraItem {
  /**
   * Property totalItems
   * @readonly
   *
   * @description
   * Members matching all server filters before pagination.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalItems: number;

  /**
   * Property page
   * @readonly
   *
   * @description
   * Resolved member page, clamped to the last available page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property pageSize
   * @readonly
   *
   * @description
   * Number of members requested per page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly pageSize: number;

  /**
   * Property memberOptions
   * @readonly
   *
   * @description
   * Authorized active members, independent of the projection filters.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly WorkloadMemberOptionOutput[]}
   */
  readonly memberOptions: readonly WorkloadMemberOptionOutput[];

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property projection
   * @readonly
   *
   * @description
   * Server-computed workload.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {WorkloadProjectionOutput}
   */
  readonly projection: WorkloadProjectionOutput;

  /**
   * Property canManageCapacity
   * @readonly
   *
   * @description
   * Whether the caller may administer availability.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly canManageCapacity: boolean;

  /**
   * Property canReadTeam
   * @readonly
   *
   * @description
   * Whether team and other-member workload is authorized.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly canReadTeam: boolean;

  /**
   * Property teams
   * @readonly
   *
   * @description
   * Teams visible to the authorized planner.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly { readonly id: string; readonly name: string }[]}
   */
  readonly teams: readonly { readonly id: string; readonly name: string }[];
}
