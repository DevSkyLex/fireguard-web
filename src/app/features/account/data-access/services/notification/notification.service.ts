import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HydraApiService } from '@core/api';
import type { HydraCollection } from '@core/api/models';
import type { MercureSubscriptionOutput } from '@core/mercure';
import type {
  InboxUnreadCountOutput,
  MarkAllNotificationsAsReadOutput,
  NotificationListOptions,
  NotificationOutput,
  NotificationTypeOutput,
} from '@features/account/models';

/**
 * Service NotificationService
 * @class NotificationService
 * @extends {HydraApiService}
 *
 * @description
 * API service for notification management.
 * Handles listing notifications with filters, listing notification types,
 * marking notifications as read, and managing Mercure subscriptions.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class NotificationService extends HydraApiService {
  //#region Constants
  /**
   * Property BASE_PATH
   * @readonly
   * @static
   *
   * @description
   * Base API path for notification endpoints.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private static readonly BASE_PATH: string = '/api/notifications';

  /**
   * Property TYPES_PATH
   * @readonly
   * @static
   *
   * @description
   * API path for notification type listing endpoint.
   *
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private static readonly TYPES_PATH: string = '/api/notification-types';

  /**
   * Property INBOX_UNREAD_COUNT_PATH
   *
   * @description
   * The unified inbox's unread count, summed across every registered source.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {string}
   */
  private static readonly INBOX_UNREAD_COUNT_PATH: string = '/api/inbox/unread-count';
  //#endregion

  //#region Public Methods
  /**
   * Method list
   * @method list
   *
   * @description
   * Retrieves a paginated list of notifications for the authenticated user.
   * Supports optional filtering by type, category, or unread status.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {NotificationListOptions} [options] - Optional filter and pagination parameters. `type` takes precedence over `category` when both are set.
   *
   * @return {Observable<HydraCollection<NotificationOutput>>} An observable emitting the notifications collection.
   */
  public list(options?: NotificationListOptions): Observable<HydraCollection<NotificationOutput>> {
    const params: Record<string, string | number | boolean> = {};
    if (options?.unreadOnly !== undefined) params['unreadOnly'] = options.unreadOnly;
    if (options?.limit !== undefined) params['limit'] = options.limit;
    if (options?.type) {
      params['type'] = options.type;
    } else if (options?.category) {
      params['category'] = options.category;
    }

    return this.getCollection<NotificationOutput>(NotificationService.BASE_PATH, {
      page: options?.page,
      params,
    });
  }

  /**
   * Method listTypes
   * @method listTypes
   *
   * @description
   * Retrieves the full list of available notification types
   * as a flat array (unwrapped from the Hydra collection).
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Observable<ReadonlyArray<NotificationTypeOutput>>} An observable emitting the array of notification types.
   */
  public listTypes(): Observable<ReadonlyArray<NotificationTypeOutput>> {
    return this.getCollection<NotificationTypeOutput>(NotificationService.TYPES_PATH).pipe(
      map((response) => response.member),
    );
  }

  /**
   * Method unreadCount
   * @method unreadCount
   *
   * @description
   * Retrieves the unread count from the unified inbox. This is the figure the
   * bell badge shows: counting the loaded page client-side undercounts as soon
   * as the unread items outnumber it. The inbox endpoint is preferred over
   * `/notifications/unread-count` — the two agree today, and the inbox one
   * keeps agreeing once Messaging registers mentions and direct messages as
   * additional sources.
   *
   * @access public
   * @since 1.1.0
   *
   * @return {Observable<number>} An observable emitting the unread item count.
   */
  public unreadCount(): Observable<number> {
    return this.getOne<InboxUnreadCountOutput>(NotificationService.INBOX_UNREAD_COUNT_PATH).pipe(
      map((response) => response.unreadCount),
    );
  }

  /**
   * Method get
   * @method get
   *
   * @description
   * Retrieves a single notification by its ID.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - The ID of the notification to retrieve.
   *
   * @return {Observable<NotificationOutput>} An observable emitting the notification details.
   */
  public get(id: string): Observable<NotificationOutput> {
    return this.getOne<NotificationOutput>(`${NotificationService.BASE_PATH}/${id}`);
  }

  /**
   * Method markAsRead
   * @method markAsRead
   *
   * @description
   * Marks the given notification as read by sending a patch
   * to the read endpoint. No request body is required.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} id - The ID of the notification to mark as read.
   *
   * @return {Observable<NotificationOutput>} An observable emitting the updated notification details.
   */
  public markAsRead(id: string): Observable<NotificationOutput> {
    return this.patch<void, NotificationOutput>(
      `${NotificationService.BASE_PATH}/${id}/read`,
      undefined,
    );
  }

  /**
   * Method markAllAsRead
   * @method markAllAsRead
   *
   * @description
   * Marks every unread notification of the authenticated user as read. The
   * endpoint is idempotent and takes no body; it answers with how many rows it
   * actually changed.
   *
   * @access public
   * @since 1.3.0
   *
   * @return {Observable<MarkAllNotificationsAsReadOutput>} An observable emitting the number marked.
   */
  public markAllAsRead(): Observable<MarkAllNotificationsAsReadOutput> {
    return this.patch<void, MarkAllNotificationsAsReadOutput>(
      `${NotificationService.BASE_PATH}/read-all`,
      undefined,
    );
  }

  /**
   * Method getSubscription
   * @method getSubscription
   *
   * @description
   * Retrieves the Mercure subscription details for the authenticated user,
   * including the hub URL and topic URIs needed to receive real-time notifications.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Observable<MercureSubscriptionOutput>} An observable emitting the Mercure subscription details.
   */
  public getSubscription(): Observable<MercureSubscriptionOutput> {
    return this.getOne<MercureSubscriptionOutput>(`${NotificationService.BASE_PATH}/subscription`);
  }
  //#endregion
}
