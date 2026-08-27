/**
 * Interface NotificationPreferenceOutput
 * @interface NotificationPreferenceOutput
 *
 * @description
 * One customized per-category delivery preference of the authenticated user.
 * Only explicit customizations are returned by the API: a category with no
 * entry is enabled on every channel — the absence of a row is the
 * "everything enabled" default, never backfilled.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationPreferenceOutput {
  //#region Properties
  /**
   * Property category
   * @readonly
   *
   * @description
   * The notification category this customization applies to (the
   * `{category}` half of a `{category}.{action}` notification type).
   *
   * @type {string}
   */
  readonly category: string;

  /**
   * Property emailEnabled
   * @readonly
   *
   * @description
   * Whether email delivery is enabled for this category.
   *
   * @type {boolean}
   */
  readonly emailEnabled: boolean;

  /**
   * Property mercureEnabled
   * @readonly
   *
   * @description
   * Whether Mercure (real-time, in-app) delivery is enabled for this category.
   *
   * @type {boolean}
   */
  readonly mercureEnabled: boolean;

  /**
   * Property updatedAt
   * @readonly
   *
   * @description
   * When this customization was last written, as an ISO 8601 string. The API
   * omits the field entirely when it is null server-side, so it arrives as
   * `undefined` rather than `null` — guard with a falsy check, never `=== null`.
   *
   * @type {string | null | undefined}
   */
  readonly updatedAt?: string | null;
  //#endregion
}
