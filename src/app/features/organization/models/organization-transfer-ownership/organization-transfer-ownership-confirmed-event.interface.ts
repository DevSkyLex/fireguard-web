/**
 * Interface OrganizationTransferOwnershipConfirmedEvent
 * @interface OrganizationTransferOwnershipConfirmedEvent
 *
 * @description
 * Payload emitted by `OrganizationTransferOwnershipDialog` once the reader
 * has picked a candidate and typed the confirmation. The organization's slug
 * confirmation travels separately — the page reads it from the resolved
 * organization, mirroring `OrganizationDeleteDialog`.
 *
 * @since 1.0.0
 */
export interface OrganizationTransferOwnershipConfirmedEvent {
  //#region Properties
  /** The new owner's `userId`, not their membership id. @type {string} */
  readonly newOwnerUserId: string;
  //#endregion
}
