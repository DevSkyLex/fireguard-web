import type { HydraItem } from '@core/api/models';

/**
 * Interface NotificationTypeOutput
 * @interface NotificationTypeOutput
 *
 * @description
 * Notification type descriptor returned by the API
 * for filter or catalog use cases.
 */
export interface NotificationTypeOutput extends HydraItem {
  //#region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Unique notification type identifier.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property category
   * @readonly
   *
   * @description
   * Category associated with the notification type.
   *
   * @type {string}
   */
  readonly category: string;
  //#endregion
}
