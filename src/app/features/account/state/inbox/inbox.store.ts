import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { InboxService } from '@features/account/data-access';
import type { InboxItem, InboxOutput } from '@features/account/models';

/**
 * State of the unified inbox.
 *
 * @since 1.0.0
 */
interface InboxState {
  readonly pageCallState: CallState<readonly InboxItem[]>;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
  readonly unreadOnly: boolean;
}

const INITIAL_STATE: InboxState = {
  pageCallState: idleCallState(),
  nextCursor: null,
  hasMore: false,
  unreadOnly: false,
};

/**
 * Store InboxStore
 * @const InboxStore
 *
 * @description
 * Owns the unified inbox: a cursor-paginated feed merged across sources.
 *
 * Pages accumulate rather than replace — this is a feed the reader scrolls,
 * not a table they page through, so losing the earlier items on "load more"
 * would be a bug.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InboxStore = signalStore(
  //#region State
  withState<InboxState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed items
     *
     * @description
     * The feed, filtered to unread when the reader asked for it.
     *
     * @type {Signal<readonly InboxItem[]>}
     */
    items: computed<readonly InboxItem[]>(() => {
      const loaded: readonly InboxItem[] = store.pageCallState().data ?? [];
      return store.unreadOnly() ? loaded.filter((item: InboxItem) => !item.isRead) : loaded;
    }),

    /**
     * Computed unreadCount
     *
     * @type {Signal<number>}
     */
    unreadCount: computed<number>(
      () => (store.pageCallState().data ?? []).filter((item: InboxItem) => !item.isRead).length,
    ),

    /**
     * Computed isLoading
     *
     * @type {Signal<boolean>}
     */
    isLoading: computed<boolean>(() => isCallPending(store.pageCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(InboxService)) => ({
    /**
     * Method setUnreadOnly
     *
     * @param {boolean} unreadOnly - Whether to hide read items.
     *
     * @returns {void}
     */
    setUnreadOnly(unreadOnly: boolean): void {
      patchState(store, { unreadOnly });
    },

    /**
     * Method load
     *
     * @description
     * Loads the first page, replacing anything already held.
     *
     * `rxMethod<void>` rather than an optional filter argument: rxMethod does
     * not emit when handed `undefined`, so an "all organizations" call written
     * as `load(undefined)` silently does nothing.
     *
     * @returns {void}
     */
    load: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { pageCallState: pendingCallState() })),
        switchMap(() =>
          service.list().pipe(
            tapResponse({
              next: (page: InboxOutput) =>
                patchState(store, {
                  pageCallState: successCallState(page.items),
                  nextCursor: page.nextCursor,
                  hasMore: page.hasMore,
                }),
              error: (error: unknown) =>
                patchState(store, { pageCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),

    /**
     * Method loadMore
     *
     * @description
     * Appends the next page. Does nothing when there is none.
     *
     * @returns {void}
     */
    loadMore: rxMethod<void>(
      pipe(
        switchMap(() => {
          const cursor: string | null = store.nextCursor();
          if (cursor === null || !store.hasMore()) return EMPTY;

          patchState(store, {
            pageCallState: pendingCallState(store.pageCallState().data ?? []),
          });

          return service.list(undefined, cursor).pipe(
            tapResponse({
              next: (page: InboxOutput) =>
                patchState(store, {
                  pageCallState: successCallState([
                    ...(store.pageCallState().data ?? []),
                    ...page.items,
                  ]),
                  nextCursor: page.nextCursor,
                  hasMore: page.hasMore,
                }),
              error: (error: unknown) =>
                patchState(store, {
                  pageCallState: errorCallState(
                    toStoreError(error),
                    store.pageCallState().data ?? [],
                  ),
                }),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type InboxStoreType
 *
 * @description
 * Injectable instance type of {@link InboxStore}.
 */
export type InboxStoreType = InstanceType<typeof InboxStore>;
