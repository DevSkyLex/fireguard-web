import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
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
  removeAllEntities,
  setAllEntities,
  updateEntity,
  upsertEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, Subject, switchMap, takeUntil } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { InboxService, NotificationService } from '@features/account/data-access';
import type { InboxItemOutput } from '@features/account/models';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import { notificationStoreEvents } from '@features/account/state/notifications/events';
import { messageThreadStoreEvents } from '@features/organization/features/collaboration/state/message-thread/events';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import type { InboxState } from './inbox-state.interface';
import { inboxStoreEvents } from './inbox.events';

/**
 * Constant INITIAL_STATE
 * @description Empty account cache with separate query and acknowledgement states.
 * @since 1.0.0
 */
const INITIAL_STATE: InboxState = {
  accountId: null,
  organizationId: null,
  revision: 0,
  activated: false,
  nextPageCursor: null,
  complete: true,
  unreadCount: 0,
  listCallState: idleCallState(),
  moreCallState: idleCallState(),
  countCallState: idleCallState(),
  readCallState: idleCallState(),
};

/**
 * Function selectId
 * @description Keeps equal identifiers from different sources distinct.
 * @access private
 * @since 1.0.0
 * @param {InboxItemOutput} item - Contributor-owned item.
 * @returns {string} Composite entity identity.
 */
function selectId(item: InboxItemOutput): string {
  return `${item.sourceKey}:${item.id}`;
}

/**
 * Store InboxStore
 * @description Shared page and bell cache, fenced by account and organization. Secondary reads run only in the browser; cursors remain opaque.
 * @since 1.0.0
 */
export const InboxStore = signalStore(
  { providedIn: 'root' },
  withState<InboxState>(INITIAL_STATE),
  withEntities({ entity: type<InboxItemOutput>(), collection: 'entry' }),
  withComputed((store) => ({
    /**
     * Property isLoading
     * @readonly
     * @description First-page request activity.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    isLoading: computed(() => store.listCallState().status === 'pending'),
    /**
     * Property isLoadingMore
     * @readonly
     * @description Pagination request activity.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    isLoadingMore: computed(() => store.moreCallState().status === 'pending'),
    /**
     * Property listError
     * @readonly
     * @description Most recent feed request failure without hiding acquired entries.
     * @access public
     * @since 1.0.0
     * @type {Signal<StoreError | null>}
     */
    listError: computed(() => store.listCallState().error ?? store.moreCallState().error),
    /**
     * Property hasMore
     * @readonly
     * @description Pagination is available only after a complete server page.
     * @access public
     * @since 1.0.0
     * @type {Signal<boolean>}
     */
    hasMore: computed(() => store.complete() && store.nextPageCursor() !== null),
  })),
  withMethods(
    (
      store,
      service = inject(InboxService),
      notifications = inject(NotificationService),
      dispatcher = inject(Dispatcher),
      platformId = inject(PLATFORM_ID),
    ) => {
      const scopeReset = new Subject<void>();
      const pageReset = new Subject<void>();
      const entityConfig = { collection: 'entry', selectId } as const;

      /**
       * Method loadCount
       * @description Refreshes the server total independently of loaded entries.
       * @access public
       * @since 1.0.0
       * @returns {void}
       */
      const loadCount = rxMethod<void>(
        pipe(
          switchMap(() => {
            if (!isPlatformBrowser(platformId) || !store.accountId()) return EMPTY;
            const revision = store.revision();
            patchState(store, { countCallState: pendingCallState() });
            return service.unreadCount(store.organizationId()).pipe(
              takeUntil(scopeReset),
              tapResponse({
                next: (unreadCount) => {
                  if (revision === store.revision())
                    patchState(store, {
                      unreadCount,
                      countCallState: successCallState(unreadCount),
                    });
                },
                error: (error: unknown) => {
                  if (revision === store.revision())
                    patchState(store, { countCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );

      /**
       * Method load
       * @description Activates the feed and restarts pagination while preserving acquired entries on failures or partial responses.
       * @access public
       * @since 1.0.0
       * @returns {void}
       */
      const load = rxMethod<void>(
        pipe(
          switchMap(() => {
            if (!isPlatformBrowser(platformId)) return EMPTY;
            patchState(store, { activated: true });
            if (!store.accountId()) return EMPTY;
            pageReset.next();
            const revision = store.revision();
            patchState(store, {
              listCallState: pendingCallState(),
              moreCallState: idleCallState(),
              nextPageCursor: null,
            });
            return service.list(store.organizationId(), null).pipe(
              takeUntil(scopeReset),
              tapResponse({
                next: (page) => {
                  if (revision !== store.revision()) return;
                  patchState(
                    store,
                    page.complete
                      ? setAllEntities([...page.items], entityConfig)
                      : upsertEntities([...page.items], entityConfig),
                    {
                      nextPageCursor: page.complete ? page.nextPageCursor : null,
                      complete: page.complete,
                      listCallState: successCallState(page),
                    },
                  );
                },
                error: (error: unknown) => {
                  if (revision === store.revision())
                    patchState(store, { listCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );

      return {
        load,
        loadCount,
        /**
         * Method ensureLoaded
         * @description Loads the first page when a visible surface first opens; explicit retries handle failures.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        ensureLoaded(): void {
          if (!store.activated()) load();
        },
        /**
         * Method refresh
         * @description Invalidates after a source-owned mutation or realtime delivery.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        refresh(): void {
          loadCount();
          if (store.activated()) load();
        },
        /**
         * Method setScope
         * @description Cancels previous-scope requests and removes their entries before querying a new account or workspace.
         * @access public
         * @since 1.0.0
         * @param {string | null} accountId - Current authenticated account.
         * @param {string | null} organizationId - Selected workspace.
         * @returns {void}
         */
        setScope(accountId: string | null, organizationId: string | null): void {
          if (accountId === store.accountId() && organizationId === store.organizationId()) return;
          scopeReset.next();
          pageReset.next();
          const activated = accountId !== null && store.activated();
          patchState(store, removeAllEntities({ collection: 'entry' }), {
            ...INITIAL_STATE,
            accountId,
            organizationId,
            activated,
            revision: store.revision() + 1,
          });
          if (accountId) {
            loadCount();
            if (activated) load();
          }
        },
        /**
         * Method loadMore
         * @description Appends the next complete cursor page, deduplicating repeated clicks and identities.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        loadMore: rxMethod<void>(
          pipe(
            exhaustMap(() => {
              if (
                !isPlatformBrowser(platformId) ||
                !store.accountId() ||
                !store.hasMore() ||
                store.isLoading()
              )
                return EMPTY;
              const revision = store.revision();
              patchState(store, { moreCallState: pendingCallState() });
              return service.list(store.organizationId(), store.nextPageCursor()).pipe(
                takeUntil(scopeReset),
                takeUntil(pageReset),
                tapResponse({
                  next: (page) => {
                    if (revision !== store.revision()) return;
                    patchState(store, upsertEntities([...page.items], entityConfig), {
                      complete: page.complete,
                      nextPageCursor: page.complete ? page.nextPageCursor : null,
                      moreCallState: successCallState(page),
                    });
                  },
                  error: (error: unknown) => {
                    if (revision === store.revision())
                      patchState(store, { moreCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
            }),
          ),
        ),
        /**
         * Method markAsRead
         * @description Acknowledges notification-source entries only. Conversation read markers belong to Messaging.
         * @access public
         * @since 1.0.0
         * @param {InboxItemOutput} item - Selected contributor item.
         * @returns {void}
         */
        markAsRead: rxMethod<InboxItemOutput>(
          pipe(
            exhaustMap((item) => {
              if (
                !isPlatformBrowser(platformId) ||
                !store.accountId() ||
                item.sourceKey !== 'notification' ||
                item.isRead ||
                !store.entryEntityMap()[selectId(item)]
              )
                return EMPTY;
              const revision = store.revision();
              patchState(store, { readCallState: pendingCallState() });
              return notifications.markAsRead(item.id).pipe(
                takeUntil(scopeReset),
                tapResponse({
                  next: () => {
                    if (revision !== store.revision()) return;
                    patchState(
                      store,
                      updateEntity(
                        { id: selectId(item), changes: { isRead: true } },
                        { collection: 'entry' },
                      ),
                      { readCallState: successCallState(null) },
                    );
                    dispatcher.dispatch(inboxStoreEvents.readSucceeded(item.id));
                    loadCount();
                  },
                  error: (error: unknown) => {
                    if (revision !== store.revision()) return;
                    const failure = toStoreError(error);
                    patchState(store, { readCallState: errorCallState(failure) });
                    dispatcher.dispatch(
                      inboxStoreEvents.readFailed(
                        toStoreFailureEventPayload(failure, 'Failed to mark update as read'),
                      ),
                    );
                  },
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
  withHooks(
    (
      store,
      identity = inject(USER_IDENTITY_PORT),
      organization = inject(ORGANIZATION_CONTEXT_PORT),
      events = inject(Events),
    ) => ({
      onInit(): void {
        effect(() => {
          const profile = identity.profile();
          const accountId = profile?.id ?? profile?.sub ?? null;
          const organizationId = accountId ? organization.selectedOrganizationId() : null;
          untracked(() => store.setScope(accountId, organizationId));
        });
        events
          .on(notificationStoreEvents.changed, messageThreadStoreEvents.conversationRead)
          .pipe(takeUntilDestroyed())
          .subscribe(() => store.refresh());
      },
    }),
  ),
);

/**
 * Type InboxStoreType
 * @type InboxStoreType
 * @description Injectable unified inbox store instance.
 * @since 1.0.0
 */
export type InboxStoreType = InstanceType<typeof InboxStore>;
