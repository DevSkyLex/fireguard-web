/**
 * Interface WorkloadMemberOptionOutput
 * @interface WorkloadMemberOptionOutput
 *
 * @description
 * Organization-scoped identity of an authorized workload member. No account roles or permissions.
 *
 * @since 1.0.0
 */
export interface WorkloadMemberOptionOutput {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Membership identifier used by workload filters and capacity commands.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Display name resolved by the organization directory.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * Profile image, or null when initials should be used.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {string | null}
   */
  readonly avatarUrl: string | null;

  /**
   * Property roleNames
   * @readonly
   *
   * @description
   * Role names assigned to this membership in the current organization only.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {readonly string[]}
   */
  readonly roleNames: readonly string[];
}
