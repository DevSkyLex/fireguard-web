import type { OrganizationStatus } from './organization-status.type';

/**
 * Interface OrganizationOutput
 * @interface OrganizationOutput
 *
 * @description
 * Organization payload returned by backend.
 *
 * @version 1.0.0
 */
export interface OrganizationOutput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Organization identifier.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Organization display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property slug
   * @readonly
   *
   * @description
   * Organization slug.
   *
   * @type {string}
   */
  readonly slug: string;

  /**
   * Property ownerUserId
   * @readonly
   *
   * @description
   * Owner user identifier.
   *
   * @type {string}
   */
  readonly ownerUserId: string;

  /**
   * Property createdByUserId
   * @readonly
   *
   * @description
   * Creator user identifier.
   *
   * @type {string}
   */
  readonly createdByUserId: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Organization status.
   *
   * @type {OrganizationStatus}
   */
  readonly status: OrganizationStatus;

  /**
   * Property isActive
   * @readonly
   *
   * @description
   * Active flag.
   *
   * @type {boolean}
   */
  readonly isActive: boolean;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp (ISO string).
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Update timestamp (ISO string).
   *
   * @type {string}
   */
  readonly updatedAt: string;
}
