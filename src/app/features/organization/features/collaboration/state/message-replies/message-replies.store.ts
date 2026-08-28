import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntity, removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, pipe, switchMap, tap } from 'rxjs';
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
import { REPLY_PAGE_SIZE } from './constants';
import { messageRepliesStoreEvents } from './events';
import type { MessageRepliesState } from './models';

const INITIAL_STATE: MessageRepliesState = {
  parentMessageId: null,
  total: 0,
  listCallState: idleCallState(),
  postCallState: idleCallState(),
};

/** Oldest-first ordering, which is how a thread reads. */
function byCreatedAt(first: MessageOutput, second: MessageOutput): number {
  return first.createdAt.localeCompare(second.createdAt);
}

/**
 * Constant MessageRepliesStore
 * @const MessageRepliesStore
 *
 * @description
 * One message's threaded replies. Component-scoped by the reply sheet, which
 * must {@link reset} before loading another parent — the sheet outlives the
 * message it was opened for.
 *
 * The conversation's own message list excludes replies (`parentMessage IS
 * NULL` server-side), so this second collection is the only way to read them.
 * Threading is single-level: the server refuses a reply to a reply, which is
 * why the rows here never offer a reply action of their own.
 *
 * Replies are read at the server's cap in one request. A thread longer than
 * {@link REPLY_PAGE_SIZE} shows its oldest page only — an honest limit; the
 * count on the parent row still tells the whole truth.
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
    postError: computed(() => store.postCallState().error),

    /** The replies in reading order — insertion order is not chronological after a post. */
    sortedReplies: computed((): readonly MessageOutput[] =>
      store.replyEntities().toSorted(byCreatedAt),
    ),
  })),

  withMethods((store, service = inject(MessageService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Opens a parent message's reply thread.
     */
    load: rxMethod<string>(
      pipe(
        tap((parentMessageId: string) =>
          patchState(store, { parentMessageId, listCallState: pendingCallState() }),
        ),
        switchMap((parentMessageId: string) =>
          service.listReplies(parentMessageId, { page: 1, itemsPerPage: REPLY_PAGE_SIZE }).pipe(
            tapResponse({
              next: (collection: HydraCollection<MessageOutput>): void =>
                patchState(store, setAllEntities([...collection.member], { collection: 'reply' }), {
                  total: collection.totalItems,
                  listCallState: successCallState(null),
                }),
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
     * Posts a reply under the loaded parent.
     *
     * `concatMap` rather than `switchMap`: two replies in quick succession
     * are two intentions, and the server orders them by arrival anyway.
     */
    reply: rxMethod<{ readonly parentMessageId: string; readonly input: PostReplyInput }>(
      pipe(
        tap(() => patchState(store, { postCallState: pendingCallState() })),
        concatMap(({ parentMessageId, input }) =>
          service.postReply(parentMessageId, input).pipe(
            tapResponse({
              next: (reply: MessageOutput): void => {
                if (store.parentMessageId() === parentMessageId) {
                  patchState(store, addEntity(reply, { collection: 'reply' }), {
                    total: store.total() + 1,
                    postCallState: successCallState(null),
                  });
                } else {
                  patchState(store, { postCallState: successCallState(null) });
                }

                dispatcher.dispatch(
                  messageRepliesStoreEvents.replyPosted({ parentMessageId, reply }),
                );
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { postCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  messageRepliesStoreEvents.replyFailed(
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
     * Empties the store so another parent's thread can be opened into it.
     */
    reset(): void {
      patchState(store, removeAllEntities({ collection: 'reply' }), INITIAL_STATE);
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
