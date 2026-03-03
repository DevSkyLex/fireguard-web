export interface AddOrganizationMemberInput {
  readonly userId: string;
  readonly roleIds?: ReadonlyArray<string | null>;
}
