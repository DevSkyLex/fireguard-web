export interface CreateOrganizationRoleInput {
  readonly name: string;
  readonly description?: string;
  readonly permissions: ReadonlyArray<string>;
}
