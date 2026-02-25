export interface AddOrganizationMemberInput {
  readonly userId: string;
  readonly roleKeys: ReadonlyArray<string>;
}
