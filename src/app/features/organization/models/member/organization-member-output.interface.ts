import type { HydraItem } from '@core/models/api';

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
  /** @type {boolean} */
  readonly isActive: boolean;
  /** @type {string} */
  readonly joinedAt: string;
  /** @type {ReadonlyArray<string>} */
  readonly roleIds: ReadonlyArray<string>;
  //#endregion
}
