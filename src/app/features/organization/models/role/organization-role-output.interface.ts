import type { HydraItem } from '@core/api/models';
import type { OrganizationRolePermissionEntry } from './organization-role-permission-entry.interface';

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
   * The role's permissions as **objects**, not names: the backend maps each
   * granted name through its catalog and emits `{ name, description }` on
   * every role endpoint (list, get, create, update).
   * `UpdateOrganizationRoleInput.permissions` is the mirror image — a plain
   * name array — so writing a role back means projecting to `.name` first.
   *
   * @type {ReadonlyArray<OrganizationRolePermissionEntry>}
   */
  readonly permissions: ReadonlyArray<OrganizationRolePermissionEntry>;
  /**
   * Active members currently holding this role. Always emitted by the API
   * since backend 1.4.0 — but only by the **read** endpoints: the update
   * processor never assigns it, so a PATCH response always reports `0`.
   * Re-read the role rather than trusting a mutation's copy. Optional here
   * until every fixture carries it.
   *
   * @type {number}
   */
  readonly memberCount?: number;
  /** @type {string} */
  readonly createdAt: string;
  /**
   * The backend Output DTO does not emit this field today — it is absent on
   * the wire, so it arrives as `undefined`, never a string.
   *
   * @type {string}
   */
  readonly updatedAt?: string;
  //#endregion
}
