/**
 * Interface NotificationPreferenceItemInput
 * @interface NotificationPreferenceItemInput
 *
 * @description
 * One category customization to upsert through
 * `PATCH /api/notifications/preferences`. An upsert always writes a complete
 * row — both channel flags are sent, there is no field-level merge; the merge
 * happens at the row level, since categories not sent are left untouched.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationPreferenceItemInput {
  //#region Properties
  /**
   * Property category
   * @readonly
   *
   * @description
   * The notification category to customize.
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
  //#endregion
}
