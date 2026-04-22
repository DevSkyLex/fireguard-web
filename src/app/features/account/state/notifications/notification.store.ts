import { isPlatformBrowser } from '@angular/common';
import { computed, inject, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntities,
  prependEntity,
  removeAllEntities,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  EMPTY,
  exhaustMap,
  filter as rxFilter,
  firstValueFrom,
  pipe,
  switchMap,
  tap,
} from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import type { MercureSubscriptionOutput } from '@core/models/mercure';
import { MercureService } from '@core/services/mercure';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { NotificationService } from '@features/account/data-access';
import type {
  NotificationFilter,
  NotificationListOptions,
  NotificationOutput,
  NotificationTypeOutput,
} from '@features/account/models';
import { notificationStoreEvents } from './events';
import type { NotificationStoreState } from './models';

const NOTIFICATION_LIST_TRANSFER_KEY = makeStateKey<HydraCollection<NotificationOutput> | null>(
  'notification-list',
);

const NOTIFICATION_TYPES_TRANSFER_KEY = makeStateKey<ReadonlyArray<NotificationTypeOutput> | null>(
  'notification-types',
);

//#region Initial State
/**
 * Constant INITIAL_NOTIFICATION_STATE
 * @const INITIAL_NOTIFICATION_STATE
 *
 * @description
 * Initial state for the NotificationStore. Entity state
 * (`notificationEntities`, `notificationEntityMap`, `notificationIds`)
 * is initialised by `withEntities`. This constant only seeds the
 * auxiliary state managed in `NotificationStoreState`.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_NOTIFICATION_STATE: NotificationStoreState = {
  totalNotifications: 0,
  currentPage: 1,
  itemsPerPage: 20,
  listCallState: idleCallState(),
  markAsReadCallState: idleCallState(),
  mercureConnected: false,
  types: [],
  typesLoaded: false,
  activeFilter: null,
} as const;
//#endregion

/**
 * Store NotificationStore
 * @const NotificationStore
 *
 * @description
 * Root-level NgRx SignalStore for notification management. Handles loading,
 * paginated fetching, real-time push via Mercure SSE, mark-as-read, and
 * notification type reference data. Provided at root because notifications
 * are a global concern displayed across the entire app (bell icon, dropdown).
 *
 * Entity state is managed by `withEntities<NotificationOutput>({ collection:
 * 'notification' })`, which provides O(1) lookups and efficient
 * insertions/removals.
 *
 * @example
 * ```typescript
 * const store = inject(NotificationStore);
 *
 * // Load initial page
 * store.load();
 *
 * // Connect Mercure for real-time push
 * store.connectMercure();
 *
 * // Load more (next page)
 * store.loadMore();
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const NotificationStore = signalStore(
  { providedIn: 'root' },

  //#region State
  withState<NotificationStoreState>(INITIAL_NOTIFICATION_STATE),
  //#endregion

  //#region Entities
  withEntities({ entity: type<NotificationOutput>(), collection: 'notification' }),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /** Alias for notificationEntities — backward-compatible accessor. */
    notifications: computed<ReadonlyArray<NotificationOutput>>(() => store.notificationEntities()),

    /**
     * Computed isLoading
     *
     * @description
     * Returns true while a notification list request is in-flight
     * (initial load or refresh, but not load-more).
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoading: computed<boolean>(() => store.listCallState().status === 'pending'),

    /**
     * Computed isMarkingAsRead
     *
     * @description
     * Returns true while a mark-as-read request is in-flight.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isMarkingAsRead: computed<boolean>(() => store.markAsReadCallState().status === 'pending'),

    /**
     * Computed listError
     *
     * @description
     * Returns the list call state error, or `null` if idle/pending/success.
     *
     * @since 1.0.0
     *
     * @returns {StoreError | null}
     */
    listError: computed<StoreError | null>(() => store.listCallState().error),

    /**
     * Computed unreadCount
     *
     * @description
     * Number of unread notifications in the local entity collection.
     * Used to display a badge count on the bell icon.
     *
     * @since 1.0.0
     *
     * @returns {number}
     */
    unreadCount: computed<number>(
      () => store.notificationEntities().filter((n) => !n.isRead).length,
    ),

    /**
     * Computed hasUnread
     *
     * @description
     * Quick check whether any unread notifications exist.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasUnread: computed<boolean>(() => store.notificationEntities().some((n) => !n.isRead)),

    /**
     * Computed hasMore
     *
     * @description
     * Returns true when additional pages of notifications are available
     * to load via `loadMore()`.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    hasMore: computed<boolean>(
      () => store.notificationEntities().length < store.totalNotifications(),
    ),

    /**
     * Computed isLoadingMore
     *
     * @description
     * Returns true specifically when a load-more (subsequent page)
     * request is in-flight, distinguished from initial loading by
     * `currentPage > 1`.
     *
     * @since 1.0.0
     *
     * @returns {boolean}
     */
    isLoadingMore: computed<boolean>(
      () => store.listCallState().status === 'pending' && store.currentPage() > 1,
    ),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      notificationService = inject<NotificationService>(NotificationService),
      mercureService = inject<MercureService>(MercureService),
      platformId = inject<object>(PLATFORM_ID),
      transferState = inject(TransferState),
    ) => ({
      /**
       * Method initialize
       *
       * @description
       * Bootstraps the first notification page using TransferState when the
       * store is hydrated after SSR, avoiding a duplicate authenticated HTTP
       * request on the browser.
       *
       * @since 1.2.0
       *
       * @returns {Promise<void>} Resolves when bootstrap is complete.
       */
      async initialize(): Promise<void> {
        const callState = store.listCallState();
        if (callState.status === 'pending' || callState.status === 'success') {
          return;
        }

        if (isPlatformBrowser(platformId) && transferState.hasKey(NOTIFICATION_LIST_TRANSFER_KEY)) {
          const transferred = transferState.get(NOTIFICATION_LIST_TRANSFER_KEY, null);
          transferState.remove(NOTIFICATION_LIST_TRANSFER_KEY);

          if (transferred) {
            patchState(
              store,
              setAllEntities([...transferred.member], { collection: 'notification' }),
              {
                totalNotifications: transferred.totalItems,
                currentPage: 1,
                listCallState: successCallState(null),
              },
            );
            return;
          }
        }

        patchState(store, {
          currentPage: 1,
          listCallState: pendingCallState(),
        });

        const activeFilter: NotificationFilter | null = store.activeFilter();
        const initialOptions: NotificationListOptions = {
          limit: store.itemsPerPage(),
          ...activeFilter,
          page: 1,
        };

        await firstValueFrom(
          notificationService.list(initialOptions).pipe(
            tapResponse({
              next: (response: HydraCollection<NotificationOutput>) => {
                patchState(
                  store,
                  setAllEntities([...response.member], { collection: 'notification' }),
                  {
                    totalNotifications: response.totalItems,
                    currentPage: 1,
                    listCallState: successCallState(null),
                  },
                );
                transferState.set(NOTIFICATION_LIST_TRANSFER_KEY, response);
              },
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, { listCallState: errorCallState(storeError) });
                transferState.set(NOTIFICATION_LIST_TRANSFER_KEY, null);
                dispatcher.dispatch(
                  notificationStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Failed to load notifications'),
                  ),
                );
              },
            }),
          ),
          { defaultValue: undefined },
        );
      },

      /**
       * Method initializeTypes
       *
       * @description
       * Bootstraps notification type reference data with TransferState so the
       * notification page can reuse SSR data without a duplicate request.
       *
       * @since 1.2.0
       *
       * @returns {Promise<void>} Resolves when bootstrap is complete.
       */
      async initializeTypes(): Promise<void> {
        if (store.typesLoaded()) {
          return;
        }

        if (
          isPlatformBrowser(platformId) &&
          transferState.hasKey(NOTIFICATION_TYPES_TRANSFER_KEY)
        ) {
          const transferred = transferState.get(NOTIFICATION_TYPES_TRANSFER_KEY, null);
          transferState.remove(NOTIFICATION_TYPES_TRANSFER_KEY);

          if (transferred) {
            patchState(store, { types: transferred, typesLoaded: true });
            return;
          }
        }

        await firstValueFrom(
          notificationService.listTypes().pipe(
            tapResponse({
              next: (types: ReadonlyArray<NotificationTypeOutput>) => {
                patchState(store, { types, typesLoaded: true });
                transferState.set(NOTIFICATION_TYPES_TRANSFER_KEY, types);
              },
              error: () => {
                transferState.set(NOTIFICATION_TYPES_TRANSFER_KEY, null);
              },
            }),
          ),
          { defaultValue: undefined },
        );
      },

      /**
       * Method load
       *
       * @description
       * Loads (or reloads) the first page of notifications. Resets `currentPage`
       * to 1 and replaces all entities. Options are merged with the current
       * `activeFilter`.
       *
       * Uses `switchMap` so a new request cancels any in-flight one.
       *
       * @param {NotificationListOptions | void} options  Optional list options
       *   (limit, page, type filter, etc.). Merged with the active filter.
       *
       * @fires notificationStoreEvents.loadFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      load: rxMethod<NotificationListOptions | void>(
        pipe(
          tap(() =>
            patchState(store, {
              currentPage: 1,
              listCallState: pendingCallState(),
            }),
          ),
          switchMap((options) => {
            // When called with no options, merge the active filter from state
            const activeFilter: NotificationFilter | null = store.activeFilter();
            const mergedOptions: NotificationListOptions = {
              limit: store.itemsPerPage(),
              ...options,
              ...activeFilter,
              page: 1,
            };
            return notificationService.list(mergedOptions).pipe(
              tapResponse({
                next: (response: HydraCollection<NotificationOutput>) => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'notification' }),
                    {
                      totalNotifications: response.totalItems,
                      currentPage: 1,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    notificationStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load notifications'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method loadMore
       *
       * @description
       * Loads the next page of notifications and **appends** them to the
       * existing entity collection. Increments `currentPage` on success.
       *
       * Uses `switchMap` so a new request cancels any in-flight one.
       *
       * @fires notificationStoreEvents.loadFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      loadMore: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { listCallState: pendingCallState() })),
          switchMap(() => {
            const nextPage: number = store.currentPage() + 1;
            const activeFilter: NotificationFilter | null = store.activeFilter();
            const mergedOptions: NotificationListOptions = {
              limit: store.itemsPerPage(),
              ...activeFilter,
              page: nextPage,
            };
            return notificationService.list(mergedOptions).pipe(
              tapResponse({
                next: (response: HydraCollection<NotificationOutput>) => {
                  patchState(
                    store,
                    addEntities([...response.member], { collection: 'notification' }),
                    {
                      totalNotifications: response.totalItems,
                      currentPage: nextPage,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    notificationStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load more notifications'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method connectMercure
       *
       * @description
       * Establishes a Server-Sent Events (SSE) connection via Mercure to
       * receive real-time notification pushes. Incoming notifications are
       * prepended to the entity collection. Sets `mercureConnected` to
       * `true` once subscribed, and back to `false` on connection error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      connectMercure: rxMethod<void>(
        pipe(
          rxFilter(() => isPlatformBrowser(platformId) && !store.mercureConnected()),
          tap(() => patchState(store, { mercureConnected: true })),
          switchMap(() =>
            notificationService.getSubscription().pipe(
              switchMap((subscription: MercureSubscriptionOutput) => {
                return mercureService
                  .subscribe<NotificationOutput>(subscription.topic, subscription.token)
                  .pipe(
                    tap((notification: NotificationOutput) => {
                      patchState(
                        store,
                        prependEntity(notification, { collection: 'notification' }),
                        { totalNotifications: store.totalNotifications() + 1 },
                      );
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
        ),
      ),

      /**
       * Method markAsRead
       *
       * @description
       * Marks a single notification as read by its ID. Updates the entity
       * in the local collection on success.
       *
       * Uses `exhaustMap` to prevent duplicate requests.
       *
       * @param {string} id  The notification ID to mark as read.
       *
       * @fires notificationStoreEvents.markAsReadFailed  On API error.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      markAsRead: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { markAsReadCallState: pendingCallState() })),
          exhaustMap((id) =>
            notificationService.markAsRead(id).pipe(
              tapResponse({
                next: (updated: NotificationOutput) => {
                  patchState(store, setEntity(updated, { collection: 'notification' }), {
                    markAsReadCallState: successCallState(updated),
                  });
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { markAsReadCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    notificationStoreEvents.markAsReadFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to mark notification as read'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method clear
       *
       * @description
       * Resets the store to its initial state: removes all notification
       * entities and restores all scalar state properties to their defaults.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      clear(): void {
        patchState(
          store,
          removeAllEntities({ collection: 'notification' }),
          INITIAL_NOTIFICATION_STATE,
        );
      },

      /**
       * Method loadTypes
       *
       * @description
       * Loads notification type reference data (labels, slugs) from the API.
       * Guarded by `typesLoaded` — subsequent calls are no-ops once types
       * have been fetched successfully.
       *
       * Failures are silent; the flag remains `false` so the next call
       * will retry.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      loadTypes: rxMethod<void>(
        pipe(
          rxFilter(() => !store.typesLoaded()),
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
        ),
      ),

      /**
       * Method setFilter
       *
       * @description
       * Sets the active notification filter. The filter is merged into
       * `load()` and `loadMore()` options on the next call. Setting
       * `null` clears any active filter.
       *
       * @param {NotificationFilter | null} filter  The filter to apply,
       *   or `null` to clear.
       *
       * @since 1.0.0
       *
       * @author Valentin FORTIN <contact@valentin-fortin.pro>
       */
      setFilter(notificationFilter: NotificationFilter | null): void {
        patchState(store, { activeFilter: notificationFilter });
      },
    }),
  ),
  //#endregion
);

export type NotificationStore = InstanceType<typeof NotificationStore>;
