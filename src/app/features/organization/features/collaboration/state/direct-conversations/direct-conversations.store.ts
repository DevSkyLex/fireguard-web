import { computed, inject } from '@angular/core';
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
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, type Observable, pipe, switchMap, tap } from 'rxjs';
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
import { ConversationService } from '@features/organization/features/collaboration/data-access';
import type {
  ConversationOutput,
  GetOrCreateDirectConversationInput,
  ListDirectConversationsQuery,
} from '@features/organization/features/collaboration/models';
import { messageThreadStoreEvents } from '../message-thread/events';
import { directConversationsStoreEvents } from './events';
import type { DirectConversationsState } from './models';

const INITIAL_STATE: DirectConversationsState = {
  organizationId: null,
  total: 0,
  listCallState: idleCallState(),
  openCallState: idleCallState(),
};

/**
 * Constant DirectConversationsStore
 * @const DirectConversationsStore
 *
 * @description
 * The acting member's 1-to-1 conversations for one organization.
 *
 * Root-provided, unlike {@link ChannelsStore}: a channel resolves its name from
 * its own single read, but a direct conversation's counterpart is reported
 * *only* by the list (`counterpartMember`), never by `GET /conversations/{id}`.
 * The sidebar and the conversation page must therefore read the same loaded
 * list, so a single shared instance loads it once.
 *
 * Rows are keyed off the scalar `id` because `@id` is a Skolem genid
 * regenerated on every response.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const DirectConversationsStore = signalStore(
  { providedIn: 'root' },
  withEntities({ entity: type<ConversationOutput>(), collection: 'directConversation' }),
  withState<DirectConversationsState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isOpening: computed((): boolean => isCallPending(store.openCallState())),
    loadError: computed(() => store.listCallState().error),

    /** Conversations, most recently active first — the sidebar's order. */
    rows: computed((): readonly ConversationOutput[] =>
      store
        .directConversationEntities()
        .toSorted((a: ConversationOutput, b: ConversationOutput): number =>
          (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
        ),
    ),

    /** Unread total across direct conversations, for the section badge. */
    unreadTotal: computed((): number =>
      store
        .directConversationEntities()
        .reduce((total: number, row: ConversationOutput): number => total + row.unreadCount, 0),
    ),
  })),

  withMethods((store, service = inject(ConversationService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Loads the member's direct conversations for an organization.
     *
     * A load for a *different* organization empties the collection first. The
     * store is root-provided and the rows only land in the response handler, so
     * without that the switcher would leave the previous organization's
     * conversations — and the member names behind `counterpartFor` — on screen
     * for the length of a round trip.
     */
    load: rxMethod<ListDirectConversationsQuery>(
      pipe(
        tap((query: ListDirectConversationsQuery) => {
          if (store.organizationId() !== query.organization) {
            patchState(store, removeAllEntities({ collection: 'directConversation' }), {
              total: 0,
            });
          }

          patchState(store, {
            organizationId: query.organization,
            listCallState: pendingCallState(),
          });
        }),
        switchMap((query: ListDirectConversationsQuery) =>
          service.listDirectConversations(query).pipe(
            tapResponse({
              next: (collection: HydraCollection<ConversationOutput>): void => {
                patchState(
                  store,
                  setAllEntities([...collection.member], { collection: 'directConversation' }),
                  { total: collection.totalItems, listCallState: successCallState(null) },
                );
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { listCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  directConversationsStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Direct messages could not be loaded.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Opens the 1-to-1 conversation with a member, creating it on first use.
     *
     * The `200` response carries no `counterpartMember`, so the row is not
     * inserted from it; instead the list is reloaded so the sidebar and page
     * see a labelled row. The `opened` event lets the caller navigate.
     */
    open: rxMethod<GetOrCreateDirectConversationInput>(
      pipe(
        tap(() => patchState(store, { openCallState: pendingCallState() })),
        switchMap((input: GetOrCreateDirectConversationInput) =>
          service.openDirectConversation(input).pipe(
            switchMap(
              (
                conversation: ConversationOutput,
              ): Observable<HydraCollection<ConversationOutput>> => {
                patchState(store, { openCallState: successCallState(conversation) });
                dispatcher.dispatch(directConversationsStoreEvents.opened(conversation));

                // The create response has no `counterpartMember`; reload the list
                // so the sidebar row and the page header render a labelled row.
                const organizationId: string = store.organizationId() ?? input.organization;
                patchState(store, { listCallState: pendingCallState() });

                return service.listDirectConversations({ organization: organizationId }).pipe(
                  tapResponse({
                    next: (collection: HydraCollection<ConversationOutput>): void =>
                      patchState(
                        store,
                        setAllEntities([...collection.member], {
                          collection: 'directConversation',
                        }),
                        { total: collection.totalItems, listCallState: successCallState(null) },
                      ),
                    error: (error: unknown): void =>
                      patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
                  }),
                );
              },
            ),
            catchError((error: unknown): Observable<never> => {
              const storeError = toStoreError(error);
              patchState(store, { openCallState: errorCallState(storeError) });
              dispatcher.dispatch(
                directConversationsStoreEvents.openFailed(
                  toStoreFailureEventPayload(storeError, 'The conversation could not be opened.'),
                ),
              );

              return EMPTY;
            }),
          ),
        ),
      ),
    ),

    /**
     * The counterpart member IRI for one conversation, or `undefined` when the
     * row is not loaded. Only the list carries it.
     */
    counterpartFor(conversationId: string): string | undefined {
      return store.directConversationEntityMap()[conversationId]?.counterpartMember;
    },
  })),

  withMethods((store) => ({
    /**
     * Loads the list once per organization, so a deep link into a conversation
     * still resolves its counterpart.
     *
     * The guard reads only `organizationId` (set synchronously by `load`), never
     * the in-flight call state: callers run this inside a reactive effect, and
     * reading the pending state there would make the effect re-fire on every
     * load transition — an infinite reload loop. Retrying a failed load is the
     * caller's explicit job, not this method's.
     */
    ensureLoaded(organizationId: string): void {
      if (store.organizationId() === organizationId) return;

      store.load({ organization: organizationId });
    },
  })),

  withHooks((store, events = inject(Events)) => ({
    onInit(): void {
      // Clear a direct conversation's unread badge the moment it is read,
      // without a refetch — the event's payload is the conversation id.
      events
        .on(messageThreadStoreEvents.conversationRead)
        .pipe(takeUntilDestroyed())
        .subscribe(({ payload }): void => {
          if (store.directConversationEntityMap()[payload] === undefined) return;

          patchState(
            store,
            updateEntity(
              { id: payload, changes: { unreadCount: 0 } },
              { collection: 'directConversation' },
            ),
          );
        });
    },
  })),
);

/**
 * Type DirectConversationsStoreType
 *
 * @description
 * Injection type of {@link DirectConversationsStore}.
 *
 * @since 1.0.0
 */
export type DirectConversationsStoreType = InstanceType<typeof DirectConversationsStore>;
