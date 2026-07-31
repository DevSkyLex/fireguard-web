import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntities, setAllEntities, upsertEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { mergeMap, pipe, switchMap, tap } from 'rxjs';
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
import type {
  MessageOutput,
  PostReplyInput,
} from '@features/organization/features/collaboration/models';
import { messageRepliesStoreEvents } from './events';
import type { MessageRepliesState } from './models';

const INITIAL_STATE: MessageRepliesState = {
  parentMessageId: null,
  total: 0,
  loadedPage: 0,
  listCallState: idleCallState(),
  postCallState: idleCallState(),
};

/**
 * Constant MessageRepliesStore
 * @const MessageRepliesStore
 *
 * @description
 * One root message's threaded replies.
 *
 * Component-scoped, and separate from `MessageThreadStore` for a reason the
 * API forces: `GET /conversations/{id}/messages` **excludes replies**, so a
 * reply is not a message the thread will ever hand back. The only way to see
 * one is to ask its parent for them, which is exactly what this store does.
 *
 * Threading is single-level — the API refuses a reply to a reply — so nothing
 * here recurses.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MessageRepliesStore = signalStore(
  withEntities({ entity: type<MessageOutput>(), collection: 'reply' }),
  withState<MessageRepliesState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isPosting: computed((): boolean => isCallPending(store.postCallState())),
    loadError: computed(() => store.listCallState().error),

    /** Whether the server reports more replies than are currently loaded. */
    hasMore: computed((): boolean => store.replyEntities().length < store.total()),

    /** Whether a thread is open at all. */
    isOpen: computed((): boolean => store.parentMessageId() !== null),
  })),

  withMethods((store, service = inject(MessageService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Loads one page of a message's replies.
     *
     * Page 1 replaces, because it is either a first read or a switch to
     * another thread; any further page is history and appends.
     */
    load: rxMethod<{ readonly parentMessageId: string; readonly page?: number }>(
      pipe(
        tap(({ parentMessageId, page }) =>
          patchState(store, {
            parentMessageId,
            loadedPage: page ?? 1,
            listCallState: pendingCallState(),
          }),
        ),
        switchMap(({ parentMessageId, page }) =>
          service.listReplies(parentMessageId, { page: page ?? 1 }).pipe(
            tapResponse({
              next: (collection: HydraCollection<MessageOutput>): void => {
                const rows: MessageOutput[] = [...collection.member];

                patchState(
                  store,
                  (page ?? 1) === 1
                    ? setAllEntities(rows, { collection: 'reply' })
                    : addEntities(rows, { collection: 'reply' }),
                  { total: collection.totalItems, listCallState: successCallState(null) },
                );
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { listCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  messageRepliesStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Replies could not be loaded.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Posts a reply. The response is complete, so it is merged whole.
     *
     * `mergeMap`, matching the thread's own send: two replies written in quick
     * succession are two intentions, and cancelling the first would lose it.
     *
     * There is no optimistic row here. The endpoint mints the id server-side —
     * unlike the thread's client-id send — so an optimistic reply could not be
     * reconciled with the confirmed one, and would show twice.
     */
    send: rxMethod<{ readonly parentMessageId: string; readonly input: PostReplyInput }>(
      pipe(
        tap(() => patchState(store, { postCallState: pendingCallState() })),
        mergeMap(({ parentMessageId, input }) =>
          service.postReply(parentMessageId, input).pipe(
            tapResponse({
              next: (reply: MessageOutput): void => {
                patchState(store, upsertEntity(reply, { collection: 'reply' }), {
                  total: store.total() + 1,
                  postCallState: successCallState(null),
                });
                dispatcher.dispatch(messageRepliesStoreEvents.posted(parentMessageId));
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { postCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  messageRepliesStoreEvents.postFailed(
                    toStoreFailureEventPayload(storeError, 'The reply could not be sent.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Closes the thread and drops what was loaded.
     *
     * Kept rather than left to reopen over stale rows: the next thread opened
     * would show the previous one's replies until its own first page landed.
     */
    close(): void {
      patchState(store, setAllEntities([] as MessageOutput[], { collection: 'reply' }), {
        ...INITIAL_STATE,
      });
    },
  })),
);

/**
 * Type MessageRepliesStoreType
 *
 * @description
 * Injection type of {@link MessageRepliesStore}.
 *
 * @since 1.0.0
 */
export type MessageRepliesStoreType = InstanceType<typeof MessageRepliesStore>;
