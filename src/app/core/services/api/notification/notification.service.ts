import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService } from '../base-api.service';
import type { HydraCollection } from '@core/models/api';
import type { NotificationFilter, NotificationOutput, NotificationTypeOutput } from '@core/models/notification';
import type { MercureSubscriptionOutput } from '@core/models/mercure';

export interface NotificationListOptions extends NotificationFilter {
  readonly unreadOnly?: boolean;
  readonly limit?: number;
  readonly page?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService extends BaseApiService {
  //#region Constants
  private static readonly BASE_PATH: string = '/api/notifications';
  private static readonly TYPES_PATH: string = '/api/notification-types';
  //#endregion

  //#region Public Methods
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

  public listTypes(): Observable<ReadonlyArray<NotificationTypeOutput>> {
    return this.getCollection<NotificationTypeOutput>(NotificationService.TYPES_PATH).pipe(
      map((response) => response.member),
    );
  }

  public get(id: string): Observable<NotificationOutput> {
    return this.getOne<NotificationOutput>(`${NotificationService.BASE_PATH}/${id}`);
  }

  public markAsRead(id: string): Observable<NotificationOutput> {
    return this.patch<void, NotificationOutput>(
      `${NotificationService.BASE_PATH}/${id}/read`,
      undefined,
    );
  }

  public getSubscription(): Observable<MercureSubscriptionOutput> {
    return this.getOne<MercureSubscriptionOutput>(`${NotificationService.BASE_PATH}/subscription`);
  }
  //#endregion
}
