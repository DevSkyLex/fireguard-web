/**
 * Interface RemoveOrganizationMembersInput
 * @interface RemoveOrganizationMembersInput
 *
 * @description
 * Payload for removing several organization members in one request.
 */
export interface RemoveOrganizationMembersInput {
  /** @type {ReadonlyArray<string>} */
  readonly memberIds: ReadonlyArray<string>;
}
