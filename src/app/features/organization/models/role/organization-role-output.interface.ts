import type { HydraItem } from '@core/models/api';

/**
 * Interface OrganizationRoleOutput
 * @interface OrganizationRoleOutput
 *
 * @description
 * Role resource returned by the organization API.
 */
export interface OrganizationRoleOutput extends HydraItem {
  //#region Properties
  /** @type {string} */
  readonly id: string;
  /** @type {string} */
  readonly organizationId: string;
  /** @type {string} */
  readonly name: string;
  /** @type {string | null} */
  readonly description: string | null;
  /** @type {boolean} */
  readonly isSystem: boolean;
  /** @type {ReadonlyArray<string>} */
  readonly permissions: ReadonlyArray<string>;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
