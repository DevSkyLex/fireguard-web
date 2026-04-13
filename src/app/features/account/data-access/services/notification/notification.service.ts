import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HydraApiService } from '@core/services/hydra-api';
import type { HydraCollection } from '@core/models/api';
import type {
  NotificationListOptions,
  NotificationOutput,
  NotificationTypeOutput,
} from '@features/account/models';
import type { MercureSubscriptionOutput } from '@core/models/mercure';

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
@Injectable({
  providedIn: 'root',
})
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
   * @param {NotificationListOptions} [options] - Optional filter and pagination parameters.
   *
   * @return {Observable<HydraCollection<NotificationOutput>>} An observable emitting the notifications collection.
   */
  public list(options?: NotificationListOptions): Observable<HydraCollection<NotificationOutput>> {
    const params: Record<string, string | number | boolean> = {};
    if (options?.unreadOnly !== undefined) params['unreadOnly'] = options.unreadOnly;
    if (options?.limit !== undefined) params['limit'] = options.limit;
    // type takes precedence over category when both are set
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
