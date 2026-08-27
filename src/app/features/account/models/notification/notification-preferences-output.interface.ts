import type { HydraItem } from '@core/api/models';
import type { NotificationPreferenceOutput } from './notification-preference-output.interface';

/**
 * Interface NotificationPreferencesOutput
 * @interface NotificationPreferencesOutput
 *
 * @description
 * Wrapper returned by `GET`/`PATCH /api/notifications/preferences`, carrying
 * the authenticated user's customized notification preferences. Categories
 * absent from the list are enabled on every channel.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationPreferencesOutput extends HydraItem {
  //#region Properties
  /**
   * Property preferences
   * @readonly
   *
   * @description
   * The explicit per-category customizations. Never contains a row for a
   * category left at its default.
   *
   * @type {ReadonlyArray<NotificationPreferenceOutput>}
   */
  readonly preferences: ReadonlyArray<NotificationPreferenceOutput>;
  //#endregion
}
