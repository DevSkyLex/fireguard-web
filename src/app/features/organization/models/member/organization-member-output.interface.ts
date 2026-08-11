import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationMemberOutput
 * @interface OrganizationMemberOutput
 *
 * @description
 * Organization membership resource returned by the API.
 */
export interface OrganizationMemberOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly userId: string;
  /** @type {string | null | undefined} */
  readonly email?: string | null;
  /** @type {string | null | undefined} */
  readonly firstName?: string | null;
  /** @type {string | null | undefined} */
  readonly lastName?: string | null;
  /** @type {string | undefined} */
  readonly displayName?: string;
  /** @type {string | null | undefined} */
  readonly avatarUrl?: string | null;
  /** @type {boolean} */
  readonly isActive: boolean;
  /**
   * Whether this member is the organization's current owner. Always emitted
   * by the API since backend 1.4.0; optional here until every fixture
   * carries it. The owner cannot leave and is the only actor allowed to
   * transfer ownership.
   *
   * @type {boolean}
   */
  readonly isOwner?: boolean;
  /** @type {string} */
  readonly joinedAt: string;
  /** @type {ReadonlyArray<string>} */
  readonly roleIds: ReadonlyArray<string>;
  /** @type {ReadonlyArray<string> | undefined} */
  readonly roleNames?: ReadonlyArray<string>;
  //#endregion
}
