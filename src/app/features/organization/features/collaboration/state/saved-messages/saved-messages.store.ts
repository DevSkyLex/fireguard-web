import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntities, removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, forkJoin, map, of, pipe, switchMap, tap } from 'rxjs';
import type { Observable } from 'rxjs';
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
import {
  ConversationService,
  MessageService,
} from '@features/organization/features/collaboration/data-access';
import type {
  ConversationOutput,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import { SAVED_MESSAGES_PAGE_SIZE } from './constants';
import { savedMessagesStoreEvents } from './events';
import type { SavedMessagesState } from './models';

const INITIAL_STATE: SavedMessagesState = {
  organizationId: null,
  loadedPage: 0,
  total: 0,
  conversationsById: {},
  listCallState: idleCallState(),
  unsaveCallState: idleCallState(),
};

/** The bare conversation id inside a `/api/conversations/{id}` IRI. */
function conversationIdOf(conversationIri: string): string {
  return conversationIri.slice(conversationIri.lastIndexOf('/') + 1);
}

/**
 * Constant SavedMessagesStore
 * @const SavedMessagesStore
 *
 * @description
 * The acting member's saved messages across one organization — private
 * bookmarks, never a property of any conversation.
 *
 * Beyond the list itself, the store resolves each distinct conversation the
 * bookmarks point into (`GET /conversations/{id}`), because a `MessageOutput`
 * names its conversation only as an IRI and whether that conversation `isChannel`
 * decides which route an item links to. A conversation the member can no
 * longer read is simply absent from the map; its items still render and link
 * as a direct conversation.
 *
 * Component-scoped by the saved-messages page: the list must be fresh on each
 * visit — a bookmark added elsewhere has no event that could invalidate it.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const SavedMessagesStore = signalStore(
  withEntities({ entity: type<MessageOutput>(), collection: 'savedMessage' }),
  withState<SavedMessagesState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isUnsaving: computed((): boolean => isCallPending(store.unsaveCallState())),
    loadError: computed(() => store.listCallState().error),

    /** Whether pages beyond the loaded window remain. */
    hasMore: computed((): boolean => store.savedMessageEntities().length < store.total()),
  })),

  withMethods(
    (
      store,
      service = inject(MessageService),
      conversations = inject(ConversationService),
      dispatcher = inject(Dispatcher),
    ) => {
      /**
       * Resolves the conversations a page of bookmarks points into, skipping
       * ones already resolved. Each failed read is dropped: the map is a
       * routing refinement, not a load-bearing dependency.
       */
      function resolveConversations(messages: readonly MessageOutput[]): void {
        const known: Readonly<Record<string, ConversationOutput>> = store.conversationsById();
        const wanted: readonly string[] = [
          ...new Set(
            messages.map((message: MessageOutput): string =>
              conversationIdOf(message.conversation),
            ),
          ),
        ].filter((id: string): boolean => known[id] === undefined);

        if (wanted.length === 0) return;

        forkJoin(
          wanted.map((id: string): Observable<ConversationOutput | null> =>
            conversations.get(id).pipe(catchError((): Observable<null> => of(null))),
          ),
        ).subscribe((resolved: readonly (ConversationOutput | null)[]): void => {
          const additions: Record<string, ConversationOutput> = {};

          for (const conversation of resolved) {
            if (conversation !== null) additions[conversation.id] = conversation;
          }

          patchState(store, {
            conversationsById: { ...store.conversationsById(), ...additions },
          });
        });
      }

      return {
        /**
         * Loads the first page of the member's bookmarks in one organization.
         */
        load: rxMethod<string>(
          pipe(
            tap((organizationId: string) =>
              patchState(store, { organizationId, listCallState: pendingCallState() }),
            ),
            switchMap((organizationId: string) =>
              service
                .listSaved({
                  organization: organizationId,
                  page: 1,
                  itemsPerPage: SAVED_MESSAGES_PAGE_SIZE,
                })
                .pipe(
                  tapResponse({
                    next: (collection: HydraCollection<MessageOutput>): void => {
                      patchState(
                        store,
                        setAllEntities([...collection.member], { collection: 'savedMessage' }),
                        {
                          total: collection.totalItems,
                          loadedPage: 1,
                          listCallState: successCallState(null),
                        },
                      );
                      resolveConversations(collection.member);
                    },
                    error: (error: unknown): void => {
                      const storeError = toStoreError(error);
                      patchState(store, { listCallState: errorCallState(storeError) });
                      dispatcher.dispatch(
                        savedMessagesStoreEvents.loadFailed(
                          toStoreFailureEventPayload(
                            storeError,
                            'Saved messages could not be loaded.',
                          ),
                        ),
                      );
                    },
                  }),
                ),
            ),
          ),
        ),

        /**
         * Appends the next page. `exhaustMap` because a repeated click while
         * a page is in flight would fetch the same rows twice.
         */
        loadMore: rxMethod<void>(
          pipe(
            map((): number => store.loadedPage() + 1),
            tap(() => patchState(store, { listCallState: pendingCallState() })),
            exhaustMap((page: number) => {
              const organizationId: string | null = store.organizationId();

              if (organizationId === null) return EMPTY;

              return service
                .listSaved({
                  organization: organizationId,
                  page,
                  itemsPerPage: SAVED_MESSAGES_PAGE_SIZE,
                })
                .pipe(
                  tapResponse({
                    next: (collection: HydraCollection<MessageOutput>): void => {
                      patchState(
                        store,
                        addEntities([...collection.member], { collection: 'savedMessage' }),
                        {
                          total: collection.totalItems,
                          loadedPage: page,
                          listCallState: successCallState(null),
                        },
                      );
                      resolveConversations(collection.member);
                    },
                    error: (error: unknown): void => {
                      const storeError = toStoreError(error);
                      patchState(store, { listCallState: errorCallState(storeError) });
                      dispatcher.dispatch(
                        savedMessagesStoreEvents.loadFailed(
                          toStoreFailureEventPayload(
                            storeError,
                            'Saved messages could not be loaded.',
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
         * Withdraws one bookmark and drops its row. The endpoint is an
         * idempotent `204`, so success is the only signal needed.
         */
        unsave: rxMethod<string>(
          pipe(
            tap(() => patchState(store, { unsaveCallState: pendingCallState() })),
            switchMap((messageId: string) =>
              service.unsaveMessage(messageId).pipe(
                tapResponse({
                  next: (): void =>
                    patchState(store, removeEntity(messageId, { collection: 'savedMessage' }), {
                      total: Math.max(0, store.total() - 1),
                      unsaveCallState: successCallState(null),
                    }),
                  error: (error: unknown): void => {
                    const storeError = toStoreError(error);
                    patchState(store, { unsaveCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      savedMessagesStoreEvents.unsaveFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'The message could not be removed from saved.',
                        ),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),
      };
    },
  ),
);

/**
 * Type SavedMessagesStoreType
 *
 * @description
 * Injection type of {@link SavedMessagesStore}.
 *
 * @since 1.0.0
 */
export type SavedMessagesStoreType = InstanceType<typeof SavedMessagesStore>;
