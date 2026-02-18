import type { OrganizationFacilityType } from './organization-facility-type.type';

/**
 * Interface FacilityOutput
 * @interface FacilityOutput
 *
 * @description
 * Facility payload returned by backend.
 *
 * @version 1.0.0
 */
export interface FacilityOutput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Facility identifier.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization identifier.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property parentFacilityId
   * @readonly
   *
   * @description
   * Parent facility identifier, if any.
   *
   * @type {string | null | undefined}
   */
  readonly parentFacilityId?: string | null;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Facility type.
   *
   * @type {OrganizationFacilityType}
   */
  readonly type: OrganizationFacilityType;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Facility display name.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Facility code.
   *
   * @type {string | null | undefined}
   */
  readonly code?: string | null;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Facility status.
   *
   * @type {string}
   */
  readonly status: string;

  /**
   * Property address
   * @readonly
   *
   * @description
   * Facility address.
   *
   * @type {string | null | undefined}
   */
  readonly address?: string | null;

  /**
   * Property metadata
   * @readonly
   *
   * @description
   * Facility metadata object.
   *
   * @type {Record<string, unknown>}
   */
  readonly metadata: Record<string, unknown>;

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
