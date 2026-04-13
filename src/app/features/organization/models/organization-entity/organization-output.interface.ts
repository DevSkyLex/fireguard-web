import type { HydraItem } from '@core/models/api';

/**
 * Interface OrganizationOutput
 * @interface OrganizationOutput
 *
 * @description
 * Organization resource returned by the API.
 */
export interface OrganizationOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string} */
  readonly slug: string;
  /** @type {string} */
  readonly ownerUserId: string;
  /** @type {string} */
  readonly createdByUserId: string;
  /** @type {string} */
  readonly status: string;
  /** @type {boolean} */
  readonly isActive: boolean;
  /** @type {number} */
  readonly memberCount: number;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
