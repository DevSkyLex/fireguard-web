import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  removeAllEntities,
  removeEntity,
  setAllEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { MessageService } from '@features/organization/features/collaboration/data-access';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { PINNED_PAGE_SIZE } from './constants';
import { pinnedMessagesStoreEvents } from './events';
import type { PinnedMessagesState } from './models';

const INITIAL_STATE: PinnedMessagesState = {
  conversationId: null,
  total: 0,
  listCallState: idleCallState(),
  unpinCallState: idleCallState(),
};

/** Newest pin first — the order a "what matters here" list reads in. */
function byCreatedAtDesc(first: MessageOutput, second: MessageOutput): number {
  return second.createdAt.localeCompare(first.createdAt);
}

/**
 * Constant PinnedMessagesStore
 * @const PinnedMessagesStore
 *
 * @description
 * One conversation's pinned messages, as the channel info sheet lists them.
 * Loaded fresh each time the sheet opens — a pin added from another client
 * has no event this store consumes.
 *
 * Unpinning here is allowed to the pinning member or a manager, and the
 * server treats unpinning an unpinned message as a no-op — so the sheet's
 * control mirrors the server's check but a stale click still cannot fail
 * wrongly.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const PinnedMessagesStore = signalStore(
  withEntities({ entity: type<MessageOutput>(), collection: 'pinnedMessage' }),
  withState<PinnedMessagesState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isUnpinning: computed((): boolean => isCallPending(store.unpinCallState())),
    loadError: computed(() => store.listCallState().error),

    /** The pins newest-first, whatever order the server returned them in. */
    sortedPins: computed((): readonly MessageOutput[] =>
      store.pinnedMessageEntities().toSorted(byCreatedAtDesc),
    ),
  })),

  withMethods((store, service = inject(MessageService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Loads a conversation's pins, first page at the server's cap — a channel
     * with more than a hundred pins has larger problems than truncation.
     */
    load: rxMethod<string>(
      pipe(
        tap((conversationId: string) =>
          patchState(store, { conversationId, listCallState: pendingCallState() }),
        ),
        switchMap((conversationId: string) =>
          service.listPinned(conversationId, { page: 1, itemsPerPage: PINNED_PAGE_SIZE }).pipe(
            tapResponse({
              next: (collection: HydraCollection<MessageOutput>): void =>
                patchState(
                  store,
                  setAllEntities([...collection.member], { collection: 'pinnedMessage' }),
                  { total: collection.totalItems, listCallState: successCallState(null) },
                ),
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { listCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  pinnedMessagesStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Pinned messages could not be loaded.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Withdraws one pin and drops its row, then announces it so the open
     * thread can clear its own copy of the message.
     */
    unpin: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { unpinCallState: pendingCallState() })),
        switchMap((messageId: string) =>
          service.unpinMessage(messageId).pipe(
            tapResponse({
              next: (): void => {
                patchState(store, removeEntity(messageId, { collection: 'pinnedMessage' }), {
                  total: Math.max(0, store.total() - 1),
                  unpinCallState: successCallState(null),
                });
                dispatcher.dispatch(pinnedMessagesStoreEvents.unpinned(messageId));
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { unpinCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  pinnedMessagesStoreEvents.unpinFailed(
                    toStoreFailureEventPayload(storeError, 'The message could not be unpinned.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Empties the store so another conversation's pins can be loaded into it.
     */
    reset(): void {
      patchState(store, removeAllEntities({ collection: 'pinnedMessage' }), INITIAL_STATE);
    },
  })),
);

/**
 * Type PinnedMessagesStoreType
 *
 * @description
 * Injection type of {@link PinnedMessagesStore}.
 *
 * @since 1.0.0
 */
export type PinnedMessagesStoreType = InstanceType<typeof PinnedMessagesStore>;
