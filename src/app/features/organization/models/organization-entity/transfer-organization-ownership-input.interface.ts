/**
 * Interface TransferOrganizationOwnershipInput
 * @interface TransferOrganizationOwnershipInput
 *
 * @description
 * Payload for `POST /api/organizations/{id}/transfer-ownership`.
 *
 * `slug` is a confirmation gate, not an update: the caller retypes the
 * organization's current slug and the backend refuses the transfer when it
 * does not match. Nothing about the organization is renamed by this call.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface TransferOrganizationOwnershipInput {
  //#region Properties
  /**
   * The user — not the membership — receiving ownership. Read it from the
   * target member's `userId`, never from their member id.
   *
   * @type {string}
   */
  readonly newOwnerUserId: string;
  /** @type {string} */
  readonly slug: string;
  //#endregion
}
