import type { HydraItem } from '@core/api/models';
import type { OrganizationPermissionOutput } from '../role/organization-permission-output.interface';
import type { OrganizationRoleOutput } from '../role/organization-role-output.interface';

/**
 * Interface CurrentOrganizationMemberProfileOutput
 * @interface CurrentOrganizationMemberProfileOutput
 *
 * @description
 * Authenticated member profile returned by `/api/organizations/{organizationId}/me`.
 */
export interface CurrentOrganizationMemberProfileOutput extends HydraItem {
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
  /** @type {ReadonlyArray<OrganizationRoleOutput>} */
  readonly roles: ReadonlyArray<OrganizationRoleOutput>;
  /** @type {ReadonlyArray<OrganizationPermissionOutput>} */
  readonly permissions: ReadonlyArray<OrganizationPermissionOutput>;
}
