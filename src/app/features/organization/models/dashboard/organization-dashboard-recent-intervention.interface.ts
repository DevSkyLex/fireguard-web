/**
 * Interface OrganizationDashboardRecentIntervention
 * @interface OrganizationDashboardRecentIntervention
 *
 * @description
 * One recently-updated intervention row embedded in the aggregate
 * dashboard payload. Site and responsible names are denormalized by
 * the backend; enum fields stay loose strings resolved through the
 * interventions tag registry at render time.
 */
export interface OrganizationDashboardRecentIntervention {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Intervention identifier used to route to the detail workspace.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property number
   * @readonly
   *
   * @description
   * Per-organization sequential number rendered as the
   * `FG-{number}` reference.
   *
   * @type {number}
   */
  readonly number: number;

  /**
   * Property name
   * @readonly
   *
   * @description
   * Intervention title.
   *
   * @type {string}
   */
  readonly name: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Raw workflow status value (e.g. `in_progress`).
   *
   * @type {string}
   */
  readonly status: string;

  /**
   * Property priority
   * @readonly
   *
   * @description
   * Raw priority value (e.g. `high`).
   *
   * @type {string}
   */
  readonly priority: string;

  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Identifier of the facility the intervention targets, when scoped.
   *
   * @type {string | null}
   */
  readonly siteId: string | null;

  /**
   * Property siteName
   * @readonly
   *
   * @description
   * Denormalized facility name, when the site still exists.
   *
   * @type {string | null}
   */
  readonly siteName: string | null;

  /**
   * Property responsibleId
   * @readonly
   *
   * @description
   * Organization member identifier of the responsible agent.
   *
   * @type {string | null}
   */
  readonly responsibleId: string | null;

  /**
   * Property responsibleName
   * @readonly
   *
   * @description
   * Denormalized display name of the responsible agent.
   *
   * @type {string | null}
   */
  readonly responsibleName: string | null;

  /**
   * Property responsibleAvatarUrl
   * @readonly
   *
   * @description
   * Avatar URL of the responsible agent, when set.
   *
   * @type {string | null}
   */
  readonly responsibleAvatarUrl: string | null;

  /**
   * Property dueAt
   * @readonly
   *
   * @description
   * Due date in ISO 8601 format, when planned.
   *
   * @type {string | null}
   */
  readonly dueAt: string | null;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * Last modification timestamp in ISO 8601 format.
   *
   * @type {string}
   */
  readonly updatedAt: string;
  //#endregion
}
