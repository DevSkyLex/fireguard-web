import type { HydraItem } from '@core/api/models';

/**
 * Interface OrganizationPermissionOutput
 * @interface OrganizationPermissionOutput
 *
 * @description
 * Permission descriptor returned by the organization API.
 */
export interface OrganizationPermissionOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string | null} */
  readonly description: string | null;
  //#endregion
}
