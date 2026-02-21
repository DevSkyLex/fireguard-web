import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, filter, pipe, switchMap, tap } from 'rxjs';
import { NotificationService, type NotificationListOptions } from '@core/services/api/notification';
import { MercureService } from '@core/services/mercure';
import type { MercureSubscriptionOutput } from '@core/models/mercure';
import type { NotificationFilter, NotificationOutput, NotificationTypeOutput } from '@core/models/notification';
import type { HydraCollection } from '@core/models/api';
import type { NotificationStoreState } from './notification-state.interface';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createOperationErrorFromUnknown,
  toOperationFailureEventPayload,
  type CollectionOperation,
  type OperationError,
} from '../operations';
import { notificationStoreEvents } from './notification.events';

const INITIAL_NOTIFICATION_STATE: NotificationStoreState = {
  notifications: [],
  totalNotifications: 0,
  listOperation: createIdleOperation(),
  markAsReadOperation: createIdleOperation(),
  mercureConnected: false,
  types: [],
  typesLoaded: false,
  activeFilter: null,
} as const;

export const NotificationStore = signalStore(
  { providedIn: 'root' },

  withState<NotificationStoreState>(INITIAL_NOTIFICATION_STATE),

  withComputed((store) => ({
    isLoading: computed<boolean>(() => store.listOperation().status === 'loading'),
    isMarkingAsRead: computed<boolean>(() => store.markAsReadOperation().status === 'loading'),
    listError: computed<OperationError<unknown> | null>(() => {
      const op: CollectionOperation<NotificationOutput, unknown> = store.listOperation();
      return op.status === 'error' ? op.error : null;
    }),
    unreadCount: computed<number>(() =>
      store.notifications().filter((n) => !n.isRead).length,
    ),
    hasUnread: computed<boolean>(() =>
      store.notifications().some((n) => !n.isRead),
    ),
  })),

  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    notificationService = inject<NotificationService>(NotificationService),
    mercureService = inject<MercureService>(MercureService),
  ) => ({
    load: rxMethod<NotificationListOptions | void>(pipe(
      tap(() => patchState(store, { listOperation: createLoadingOperation(store.listOperation().data) })),
      switchMap((options) => {
        // When called with no options, merge the active filter from state
        const activeFilter: NotificationFilter | null = store.activeFilter();
        const mergedOptions: NotificationListOptions = {
          limit: 20,
          ...(options ?? {}),
          ...(activeFilter ?? {}),
        };
        return notificationService.list(mergedOptions).pipe(
          tapResponse({
            next: (response: HydraCollection<NotificationOutput>) => {
              patchState(store, {
                notifications: response.member,
                totalNotifications: response.totalItems,
                listOperation: {
                  ...createSuccessOperation(response.member),
                  total: response.totalItems,
                },
              });
            },
            error: (error: unknown) => {
              const operationError: OperationError<unknown> = createOperationErrorFromUnknown(error);
              patchState(store, { listOperation: createErrorOperation(operationError, store.listOperation().data) });
              dispatcher.dispatch(notificationStoreEvents.loadFailed(toOperationFailureEventPayload(operationError, 'Failed to load notifications')));
            },
          }),
        );
      }),
    )),

    connectMercure: rxMethod<void>(pipe(
      switchMap(() =>
        notificationService.getSubscription().pipe(
          switchMap((subscription: MercureSubscriptionOutput) => {
            patchState(store, { mercureConnected: true });
            return mercureService.subscribe<NotificationOutput>(subscription.topic, subscription.token).pipe(
              tap((notification: NotificationOutput) => {
                patchState(store, {
                  notifications: [notification, ...store.notifications()],
                  totalNotifications: store.totalNotifications() + 1,
                });
              }),
              catchError(() => {
                patchState(store, { mercureConnected: false });
                return EMPTY;
              }),
            );
          }),
          catchError(() => {
            patchState(store, { mercureConnected: false });
            return EMPTY;
          }),
        ),
      ),
    )),

    markAsRead: rxMethod<string>(pipe(
      tap(() => patchState(store, { markAsReadOperation: createLoadingOperation(store.markAsReadOperation().data) })),
      exhaustMap((id) =>
        notificationService.markAsRead(id).pipe(
          tapResponse({
            next: (updated: NotificationOutput) => {
              patchState(store, {
                notifications: store.notifications().map((n) => (n.id === id ? updated : n)),
                markAsReadOperation: createSuccessOperation(updated),
              });
            },
            error: (error: unknown) => {
              const operationError: OperationError<unknown> = createOperationErrorFromUnknown(error);
              patchState(store, { markAsReadOperation: createErrorOperation(operationError, store.markAsReadOperation().data) });
              dispatcher.dispatch(notificationStoreEvents.markAsReadFailed(toOperationFailureEventPayload(operationError, 'Failed to mark notification as read')));
            },
          }),
        ),
      ),
    )),

    clear(): void {
      patchState(store, INITIAL_NOTIFICATION_STATE);
    },

    loadTypes: rxMethod<void>(pipe(
      filter(() => !store.typesLoaded()),
      switchMap(() =>
        notificationService.listTypes().pipe(
          tapResponse({
            next: (types: ReadonlyArray<NotificationTypeOutput>) => {
              patchState(store, { types, typesLoaded: true });
            },
            error: () => {
              // Silent fail — will retry on next call
            },
          }),
        ),
      ),
    )),

    setFilter(filter: NotificationFilter | null): void {
      patchState(store, { activeFilter: filter });
    },
  })),
);

export type NotificationStore = InstanceType<typeof NotificationStore>;
