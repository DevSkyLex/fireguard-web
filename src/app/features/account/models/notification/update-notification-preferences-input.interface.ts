import type { NotificationPreferenceItemInput } from './notification-preference-item-input.interface';

/**
 * Interface UpdateNotificationPreferencesInput
 * @interface UpdateNotificationPreferencesInput
 *
 * @description
 * Body of `PATCH /api/notifications/preferences`. Carries the category
 * customizations to upsert — at least one; categories already customized but
 * not listed here are left untouched.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface UpdateNotificationPreferencesInput {
  //#region Properties
  /**
   * Property preferences
   * @readonly
   *
   * @description
   * The category preference entries to upsert.
   *
   * @type {ReadonlyArray<NotificationPreferenceItemInput>}
   */
  readonly preferences: ReadonlyArray<NotificationPreferenceItemInput>;
  //#endregion
}
