import type { HydraItem } from '@core/models/api';

/**
 * Interface NotificationOutput
 * @interface NotificationOutput
 *
 * @description
 * Notification resource returned by the API for
 * the authenticated user.
 */
export interface NotificationOutput extends HydraItem {
  //#region Properties
  /**
   * Property id
   * @readonly
   *
   * @description
   * Unique identifier of the notification.
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property type
   * @readonly
   *
   * @description
   * Backend type identifier of the notification.
   *
   * @type {string}
   */
  readonly type: string;

  /**
   * Property category
   * @readonly
   *
   * @description
   * Higher-level category grouping the notification.
   *
   * @type {string}
   */
  readonly category: string;

  /**
   * Property subject
   * @readonly
   *
   * @description
   * Short title or subject displayed to the user.
   *
   * @type {string}
   */
  readonly subject: string;

  /**
   * Property body
   * @readonly
   *
   * @description
   * Full notification message body.
   *
   * @type {string}
   */
  readonly body: string;

  /**
   * Property channels
   * @readonly
   *
   * @description
   * Delivery channels through which the notification
   * can be surfaced.
   *
   * @type {readonly string[]}
   */
  readonly channels: readonly string[];

  /**
   * Property payload
   * @readonly
   *
   * @description
   * Additional backend-provided metadata associated
   * with the notification.
   *
   * @type {Readonly<Record<string, string | null>>}
   */
  readonly payload: Readonly<Record<string, string | null>>;

  /**
   * Property isRead
   * @readonly
   *
   * @description
   * Whether the notification has already been read.
   *
   * @type {boolean}
   */
  readonly isRead: boolean;

  /**
   * Property createdAt
   * @readonly
   *
   * @description
   * Creation timestamp of the notification.
   *
   * @type {string}
   */
  readonly createdAt: string;

  /**
   * Property readAt
   * @readonly
   *
   * @description
   * Timestamp indicating when the notification was
   * marked as read.
   *
   * @type {string | null}
   */
  readonly readAt: string | null;
  //#endregion
}
