/**
 * Interface OrganizationRoleCreateFormDraft
 *
 * @description
 * The create form's own field shape: `name` and `description` as plain
 * strings, `permissions` as the checked permission names, converted to
 * `CreateOrganizationRoleInput` on submit.
 *
 * @since 1.0.0
 */
export interface OrganizationRoleCreateFormDraft {
  readonly name: string;
  readonly description: string;
  readonly permissions: ReadonlyArray<string>;
}
