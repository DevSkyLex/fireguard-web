import type { HydraItem } from '@core/api/models';
import type { OrganizationPermissionDescriptor } from './organization-permission-output.interface';

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
  /**
   * The role's granted permissions as `{ name, description }` objects — the
   * API embeds the catalog entry, it does not send bare names. Modelling them
   * as strings crashed the permission matrix and made role editing silently
   * drop every grant.
   *
   * @type {ReadonlyArray<OrganizationPermissionDescriptor>}
   */
  readonly permissions: ReadonlyArray<OrganizationPermissionDescriptor>;
  /** @type {string} */
  readonly createdAt: string;
  /** @type {string} */
  readonly updatedAt: string;
  //#endregion
}
