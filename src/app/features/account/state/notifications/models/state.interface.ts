import type { CallState } from '@core/request-state';
import type {
  NotificationFilter,
  NotificationOutput,
  NotificationTypeOutput,
} from '@features/account/models';

/**
 * Interface NotificationStoreState
 * @interface NotificationStoreState
 *
 * @description
 * Root-level state for the notification store. Entities are managed by the
 * `withEntities` feature (providing `notificationEntities`,
 * `notificationEntityMap`, `notificationIds`). This interface tracks
 * auxiliary state: pagination, operations, Mercure connectivity, types
 * reference data, and the active filter.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface NotificationStoreState {
  //#region Pagination
  /**
   * Property totalNotifications
   * @readonly
   *
   * @description
   * Server-reported total count of notifications for the current query.
   * Updated on every successful list response and incremented when a new
   * notification arrives via Mercure.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly totalNotifications: number;

  /**
   * Property currentPage
   * @readonly
   *
   * @description
   * Current pagination page. Reset to 1 on `load()`, incremented on
   * `loadMore()`.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly currentPage: number;

  /**
   * Property itemsPerPage
   * @readonly
   *
   * @description
   * Number of notifications per page for API pagination.
   *
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly itemsPerPage: number;
  //#endregion

  //#region Operations
  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Async call state for listing notifications.
   *
   * @since 1.0.0
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;

  /**
   * Property markAsReadCallState
   * @readonly
   *
   * @description
   * Async call state for marking a single notification as read.
   *
   * @since 1.0.0
   *
   * @type {CallState<NotificationOutput>}
   */
  readonly markAsReadCallState: CallState<NotificationOutput>;
  //#endregion

  //#region Mercure
  /**
   * Property mercureConnected
   * @readonly
   *
   * @description
   * True while the Mercure SSE connection for real-time notification
   * push is alive.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly mercureConnected: boolean;
  //#endregion

  //#region Reference Data
  /**
   * Property types
   * @readonly
   *
   * @description
   * Cached list of available notification types, loaded once and reused.
   *
   * @since 1.0.0
   *
   * @type {ReadonlyArray<NotificationTypeOutput>}
   */
  readonly types: ReadonlyArray<NotificationTypeOutput>;

  /**
   * Property typesLoaded
   * @readonly
   *
   * @description
   * Guard flag preventing duplicate type-list requests.
   *
   * @since 1.0.0
   *
   * @type {boolean}
   */
  readonly typesLoaded: boolean;
  //#endregion

  //#region Filters
  /**
   * Property activeFilter
   * @readonly
   *
   * @description
   * Currently active notification filter. Merged into list requests
   * automatically.
   *
   * @since 1.0.0
   *
   * @type {NotificationFilter | null}
   */
  readonly activeFilter: NotificationFilter | null;
  //#endregion
}
