/**
 * Interface OrganizationRolePermissionEntry
 * @interface OrganizationRolePermissionEntry
 *
 * @description
 * One permission as it is embedded inside `OrganizationRoleOutput.permissions`.
 *
 * Deliberately not `OrganizationPermissionOutput`: the standalone permission
 * resource carries an `id` and Hydra identifiers, whereas the role's own list
 * is built by mapping each granted name through the backend's permission
 * catalog, so only the name and its human description reach the wire.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface OrganizationRolePermissionEntry {
  //#region Properties
  /** The canonical permission name, e.g. `organization.members.manage`. */
  readonly name: string;
  /** @type {string} */
  readonly description: string;
  //#endregion
}
