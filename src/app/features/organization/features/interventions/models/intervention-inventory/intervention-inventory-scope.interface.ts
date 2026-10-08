/**
 * Interface InterventionInventoryScope
 * @interface InterventionInventoryScope
 *
 * @description
 * Captures account, organization, intervention and authentication session before asynchronous work.
 */
export interface InterventionInventoryScope {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization UUID.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Current intervention UUID.
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Authenticated user owning the device data.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property sessionRevision
   * @readonly
   *
   * @description
   * Session generation, independent from ordinary bearer refresh.
   *
   * @type {number}
   */
  readonly sessionRevision: number;
}
