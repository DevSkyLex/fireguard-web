/**
 * Interface InterventionWorkItemAssignee
 * @interface InterventionWorkItemAssignee
 *
 * @description
 * Read-only assignee identity embedded on a work item output, resolved by the
 * API from the assignee member reference. Lets the UI render the avatar and
 * name without loading the full organization member list.
 */
export interface InterventionWorkItemAssignee {
  /**
   * Property member
   * @readonly
   *
   * @description
   * Assignee organization member IRI (echoes the work item `assignee`).
   *
   * @type {string}
   */
  readonly member: string;

  /**
   * Property userId
   * @readonly
   *
   * @description
   * Underlying user identifier, when resolvable.
   *
   * @type {string | null}
   */
  readonly userId: string | null;

  /**
   * Property displayName
   * @readonly
   *
   * @description
   * Human-readable assignee name.
   *
   * @type {string}
   */
  readonly displayName: string;

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * Assignee avatar URL, or null when none is set.
   *
   * @type {string | null}
   */
  readonly avatarUrl: string | null;
}
