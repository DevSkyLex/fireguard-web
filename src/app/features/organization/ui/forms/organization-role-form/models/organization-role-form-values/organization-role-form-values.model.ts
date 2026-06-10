/**
 * Interface OrganizationRoleFormValues
 * @interface OrganizationRoleFormValues
 *
 * @description
 * Values used to create or update an organization role.
 *
 * @since 1.0.0
 */
export interface OrganizationRoleFormValues {
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
}
