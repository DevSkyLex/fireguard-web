export interface InviteOrganizationMemberInput {
  readonly email: string;
  readonly roleIds?: ReadonlyArray<string | null>;
}
