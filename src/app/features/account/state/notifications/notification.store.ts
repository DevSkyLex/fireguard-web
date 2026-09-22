import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntities,
  prependEntity,
  removeAllEntities,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  defer,
  finalize,
  EMPTY,
  exhaustMap,
  filter as rxFilter,
  firstValueFrom,
  Observable,
  pipe,
  shareReplay,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import type { MercureSubscriptionOutput } from '@core/mercure';
import { MercureService } from '@core/mercure';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { NotificationService } from '@features/account/data-access';
import type {
  MarkAllNotificationsAsReadOutput,
  NotificationFilter,
  NotificationListOptions,
  NotificationOutput,
  NotificationTypeOutput,
} from '@features/account/models';
import { authStoreEvents } from '@features/auth';
import { notificationStoreEvents } from './events';
import type { NotificationStoreState } from './models';

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
  revision: 0,
  totalNotifications: 0,
  unreadCount: 0,
  currentPage: 1,
  itemsPerPage: 20,
  listCallState: idleCallState(),
  markAsReadCallState: idleCallState(),
  markAllAsReadCallState: idleCallState(),
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
 * const store = inject<NotificationStore>(NotificationStore);
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
     * Computed isMarkingAllAsRead
     *
     * @description
     * Returns true while the bulk mark-as-read is in flight.
     *
     * @since 1.3.0
     *
     * @returns {boolean}
     */
    isMarkingAllAsRead: computed<boolean>(
      () => store.markAllAsReadCallState().status === 'pending',
    ),

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
      destroyRef = inject(DestroyRef),
    ) => {
      let generation = 0;
      let feedGeneration = 0;
      const invalidated = new Subject<void>();
      const feedInvalidated = new Subject<void>();
      const unreadCountInvalidated = new Subject<void>();
      let unreadCountRevision = 0;
      let feedRequest: Observable<HydraCollection<NotificationOutput>> | null = null;
      let feedAcknowledgements: {
        notifications: Map<string, NotificationOutput>;
        readAt: string | null;
      } | null = null;
      let typesRequest: Observable<ReadonlyArray<NotificationTypeOutput>> | null = null;

      /**
       * Function invalidateFeed
       * @description Cancels a replaced query without destroying the reusable reactive loaders.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const invalidateFeed = (): void => {
        feedGeneration += 1;
        feedRequest = null;
        feedAcknowledgements = null;
        feedInvalidated.next();
      };

      /**
       * Function invalidateUnreadCount
       * @description Prevents an earlier count snapshot from undoing a confirmed acknowledgement.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const invalidateUnreadCount = (): void => {
        unreadCountRevision += 1;
        unreadCountInvalidated.next();
      };

      /**
       * Function requestPage
       * @description Coordinates every feed reader against its session and query generation.
       * @access private
       * @since 1.0.0
       * @param {NotificationListOptions} options - Requested page, size and filters.
       * @param {boolean} append - Whether this page extends the current collection.
       * @returns {Observable<HydraCollection<NotificationOutput>>} Shared cancellable page read.
       */
      const requestPage = (
        options: NotificationListOptions,
        append = false,
      ): Observable<HydraCollection<NotificationOutput>> => {
        if (!isPlatformBrowser(platformId)) return EMPTY;
        invalidateFeed();
        const session = generation;
        const query = feedGeneration;
        const acknowledgements: NonNullable<typeof feedAcknowledgements> = {
          notifications: new Map(),
          readAt: null,
        };
        const request = defer(() => {
          if (session !== generation || query !== feedGeneration) return EMPTY;
          patchState(store, { listCallState: pendingCallState() });
          return notificationService.list(options);
        }).pipe(
          takeUntil(invalidated),
          takeUntil(feedInvalidated),
          takeUntilDestroyed(destroyRef),
          tapResponse({
            next: (response: HydraCollection<NotificationOutput>) => {
              if (session !== generation || query !== feedGeneration) return;
              const notifications: NotificationOutput[] = [];
              for (const notification of response.member) {
                const confirmed =
                  acknowledgements.notifications.get(notification.id) ?? notification;
                notifications.push(
                  !confirmed.isRead && acknowledgements.readAt !== null
                    ? { ...confirmed, isRead: true, readAt: acknowledgements.readAt }
                    : confirmed,
                );
              }
              patchState(
                store,
                append
                  ? addEntities(notifications, { collection: 'notification' })
                  : setAllEntities(notifications, { collection: 'notification' }),
                {
                  totalNotifications: response.totalItems,
                  currentPage: options.page ?? 1,
                  itemsPerPage: options.limit ?? store.itemsPerPage(),
                  listCallState: successCallState(null),
                },
              );
            },
            error: (error: unknown) => {
              if (session !== generation || query !== feedGeneration) return;
              const storeError = toStoreError(error);
              patchState(store, { listCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                notificationStoreEvents.loadFailed(
                  toStoreFailureEventPayload(storeError, 'Failed to load notifications'),
                ),
              );
            },
          }),
          finalize(() => {
            if (feedRequest === request) {
              feedRequest = null;
              feedAcknowledgements = null;
            }
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        feedRequest = request;
        feedAcknowledgements = acknowledgements;
        return request;
      };

      /**
       * Function requestTypes
       * @description Deduplicates browser-only catalog reads within the current session.
       * @access private
       * @since 1.0.0
       * @returns {Observable<ReadonlyArray<NotificationTypeOutput>>} Shared catalog read.
       */
      const requestTypes = (): Observable<ReadonlyArray<NotificationTypeOutput>> => {
        if (!isPlatformBrowser(platformId) || store.typesLoaded()) return EMPTY;
        if (typesRequest) return typesRequest;
        const session = generation;
        const request = defer(() =>
          session === generation ? notificationService.listTypes() : EMPTY,
        ).pipe(
          takeUntil(invalidated),
          takeUntilDestroyed(destroyRef),
          tapResponse({
            next: (types: ReadonlyArray<NotificationTypeOutput>) => {
              if (session === generation) patchState(store, { types, typesLoaded: true });
            },
            error: () => undefined,
          }),
          finalize(() => {
            if (typesRequest === request) typesRequest = null;
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
        typesRequest = request;
        return request;
      };

      return {
        /**
         * Method initialize
         * @method initialize
         * @description Loads the feed on browser activation, sharing any current page read.
         * @access public
         * @since 1.2.0
         * @returns {Promise<void>} Resolves on completion, failure or session cancellation.
         */
        async initialize(): Promise<void> {
          if (!isPlatformBrowser(platformId) || store.listCallState().status === 'success') return;
          await firstValueFrom(
            feedRequest ??
              requestPage({ limit: store.itemsPerPage(), ...store.activeFilter(), page: 1 }),
            { defaultValue: undefined },
          );
        },

        /**
         * Method initializeTypes
         * @method initializeTypes
         * @description Loads the secondary type catalog only in the browser.
         * @access public
         * @since 1.2.0
         * @returns {Promise<void>} Resolves on completion, failure or session cancellation.
         */
        async initializeTypes(): Promise<void> {
          await firstValueFrom(requestTypes(), { defaultValue: undefined });
        },

        /**
         * Method load
         * @method load
         * @description Replaces the feed with the first page of its active browser query.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        load: rxMethod<NotificationListOptions | void>(
          pipe(
            switchMap((options) =>
              requestPage({
                limit: store.itemsPerPage(),
                ...options,
                ...store.activeFilter(),
                page: 1,
              }),
            ),
          ),
        ),

        /**
         * Method loadPage
         * @method loadPage
         * @description Replaces the browser feed with the requested page and cancels old paging.
         * @access public
         * @since 1.0.0
         * @param {NotificationListOptions} options - Page and filter options.
         * @returns {void}
         */
        loadPage: rxMethod<NotificationListOptions>(
          pipe(
            switchMap((options) =>
              requestPage({
                limit: store.itemsPerPage(),
                ...store.activeFilter(),
                ...options,
              }),
            ),
          ),
        ),

        /**
         * Method loadMore
         * @method loadMore
         * @description Appends the next page unless another feed read is already pending.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        loadMore: rxMethod<void>(
          pipe(
            rxFilter(() => !store.isLoading()),
            switchMap(() =>
              requestPage(
                {
                  limit: store.itemsPerPage(),
                  ...store.activeFilter(),
                  page: store.currentPage() + 1,
                },
                true,
              ),
            ),
          ),
        ),

        /**
         * Method connectMercure
         * @method connectMercure
         * @description Starts one browser stream independently of feed activation. Session teardown
         * cancels both the subscription-token request and the resulting SSE stream.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        connectMercure: rxMethod<void>(
          pipe(
            rxFilter(() => isPlatformBrowser(platformId) && !store.mercureConnected()),
            switchMap(() => {
              const session = generation;
              patchState(store, { mercureConnected: true });
              return notificationService.getSubscription().pipe(
                switchMap((subscription: MercureSubscriptionOutput) =>
                  session === generation
                    ? mercureService.subscribe<NotificationOutput>(
                        subscription.topic,
                        subscription.token,
                      )
                    : EMPTY,
                ),
                takeUntil(invalidated),
                tap((notification: NotificationOutput) => {
                  if (session !== generation) return;
                  patchState(store, prependEntity(notification, { collection: 'notification' }), {
                    totalNotifications: store.totalNotifications() + 1,
                    revision: store.revision() + 1,
                  });
                  dispatcher.dispatch(notificationStoreEvents.changed());
                }),
                catchError(() => {
                  if (session === generation) patchState(store, { mercureConnected: false });
                  return EMPTY;
                }),
              );
            }),
          ),
        ),

        /**
         * Method markAsRead
         * @method markAsRead
         * @description Accepts one acknowledgement at a time and ignores departed-session results.
         * @access public
         * @since 1.0.0
         * @param {string} id - Notification identifier.
         * @returns {void}
         */
        markAsRead: rxMethod<string>(
          pipe(
            rxFilter(() => isPlatformBrowser(platformId)),
            exhaustMap((id) => {
              const session = generation;
              patchState(store, { markAsReadCallState: pendingCallState() });
              return notificationService.markAsRead(id).pipe(
                takeUntil(invalidated),
                tapResponse({
                  next: (updated: NotificationOutput) => {
                    if (session !== generation) return;
                    feedAcknowledgements?.notifications.set(updated.id, updated);
                    invalidateUnreadCount();
                    const wasUnread = store.notificationEntityMap()[updated.id]?.isRead === false;
                    const unreadCount = wasUnread
                      ? Math.max(0, store.unreadCount() - 1)
                      : store.unreadCount();
                    if (store.notificationEntityMap()[updated.id]) {
                      patchState(store, setEntity(updated, { collection: 'notification' }), {
                        markAsReadCallState: successCallState(updated),
                        unreadCount,
                      });
                    } else {
                      patchState(store, { markAsReadCallState: successCallState(updated) });
                    }
                    dispatcher.dispatch(notificationStoreEvents.changed());
                  },
                  error: (error: unknown) => {
                    if (session !== generation) return;
                    const storeError = toStoreError(error);
                    patchState(store, { markAsReadCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      notificationStoreEvents.markAsReadFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to mark notification as read',
                        ),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method loadUnreadCount
         * @method loadUnreadCount
         * @description Refreshes the notification page's count in the browser; InboxStore owns the bell.
         * @access public
         * @since 1.1.0
         * @returns {void}
         */
        loadUnreadCount: rxMethod<void>(
          pipe(
            rxFilter(() => isPlatformBrowser(platformId)),
            switchMap(() => {
              const session = generation;
              const revision = unreadCountRevision;
              return notificationService.unreadCount().pipe(
                takeUntil(invalidated),
                takeUntil(unreadCountInvalidated),
                tapResponse({
                  next: (unreadCount: number) => {
                    if (session === generation && revision === unreadCountRevision)
                      patchState(store, { unreadCount });
                  },
                  error: () => undefined,
                }),
              );
            }),
          ),
        ),

        /**
         * Method markAllAsRead
         * @method markAllAsRead
         * @description Marks the current session's loaded rows read after its bulk acknowledgement.
         * @access public
         * @since 1.3.0
         * @returns {void}
         */
        markAllAsRead: rxMethod<void>(
          pipe(
            rxFilter(() => isPlatformBrowser(platformId)),
            exhaustMap(() => {
              const session = generation;
              patchState(store, { markAllAsReadCallState: pendingCallState() });
              return notificationService.markAllAsRead().pipe(
                takeUntil(invalidated),
                tapResponse({
                  next: (result: MarkAllNotificationsAsReadOutput) => {
                    if (session !== generation) return;
                    const readAt = new Date().toISOString();
                    if (feedAcknowledgements) feedAcknowledgements.readAt = readAt;
                    invalidateUnreadCount();
                    const marked: NotificationOutput[] = [];
                    for (const notification of store.notificationEntities()) {
                      marked.push(
                        notification.isRead
                          ? notification
                          : { ...notification, isRead: true, readAt },
                      );
                    }
                    patchState(store, setAllEntities(marked, { collection: 'notification' }), {
                      markAllAsReadCallState: successCallState(result),
                      unreadCount: 0,
                    });
                    dispatcher.dispatch(notificationStoreEvents.changed());
                  },
                  error: (error: unknown) => {
                    if (session !== generation) return;
                    const storeError = toStoreError(error);
                    patchState(store, { markAllAsReadCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      notificationStoreEvents.markAllAsReadFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to mark every notification as read',
                        ),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method synchronizeNotification
         * @method synchronizeNotification
         * @description Replaces an already-loaded notification without inserting another page's row.
         * @access public
         * @since 1.2.0
         * @param {NotificationOutput} notification - Updated notification.
         * @returns {void}
         */
        synchronizeNotification(notification: NotificationOutput): void {
          feedAcknowledgements?.notifications.set(notification.id, notification);
          if (notification.isRead) invalidateUnreadCount();
          if (!store.notificationEntityMap()[notification.id]) return;
          patchState(store, setEntity(notification, { collection: 'notification' }));
        },

        /**
         * Method clear
         * @method clear
         * @description Cancels all session work and clears private data, preserving reusable loaders.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        clear(): void {
          generation += 1;
          typesRequest = null;
          invalidateFeed();
          invalidated.next();
          patchState(store, removeAllEntities({ collection: 'notification' }), {
            ...INITIAL_NOTIFICATION_STATE,
            revision: store.revision() + 1,
          });
        },

        /**
         * Method loadTypes
         * @method loadTypes
         * @description Loads the shared browser-only category catalog, retrying after failure.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        loadTypes: rxMethod<void>(pipe(exhaustMap(() => requestTypes()))),

        /**
         * Method setFilter
         * @method setFilter
         * @description Invalidates pending pages before selecting the next notification filter.
         * @access public
         * @since 1.0.0
         * @param {NotificationFilter | null} notificationFilter - Filter, or null to clear.
         * @returns {void}
         */
        setFilter(notificationFilter: NotificationFilter | null): void {
          invalidateFeed();
          patchState(store, { activeFilter: notificationFilter, listCallState: idleCallState() });
        },
      };
    },
  ),
  //#endregion

  //#region Hooks
  withHooks({
    /**
     * This store is root-provided and holds one user's notifications, but logging
     * out is a client-side navigation — the root injector survives it. Without
     * this, signing in as someone else in the same tab shows the previous user's
     * bell and unread badge.
     *
     * Listens to `sessionEnded` rather than `logoutSucceeded`: the store drops the
     * session on both branches of logout, so a failed logout request must purge
     * just the same.
     */
    onInit(store, events = inject<Events>(Events)): void {
      events
        .on(authStoreEvents.sessionEnded)
        .pipe(takeUntilDestroyed())
        .subscribe(() => {
          store.clear();
        });
    },
  }),
  //#endregion
);

export type NotificationStore = InstanceType<typeof NotificationStore>;
