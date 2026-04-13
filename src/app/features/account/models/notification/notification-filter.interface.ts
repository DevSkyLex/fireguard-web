/**
 * Interface NotificationFilter
 * @interface NotificationFilter
 *
 * @description
 * Filtering options supported when listing user
 * notifications from the API.
 */
export interface NotificationFilter {
  //#region Properties
  /**
   * Property type
   * @readonly
   *
   * @description
   * Notification type identifier used to filter
   * the collection.
   *
   * @type {string}
   */
  readonly type?: string;

  /**
   * Property category
   * @readonly
   *
   * @description
   * Notification category used to filter the
   * collection.
   *
   * @type {string}
   */
  readonly category?: string;
  //#endregion
}
