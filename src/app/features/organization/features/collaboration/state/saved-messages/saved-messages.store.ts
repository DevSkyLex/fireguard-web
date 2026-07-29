import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { addEntities, removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
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
import type {
  ListSavedMessagesQuery,
  MessageOutput,
} from '@features/organization/features/collaboration/models';
import { savedMessagesStoreEvents } from './events';
import type { SavedMessagesState } from './models';

const INITIAL_STATE: SavedMessagesState = {
  organization: null,
  total: 0,
  loadedPage: 1,
  listCallState: idleCallState(),
  interactionCallState: idleCallState(),
};

/**
 * Constant SavedMessagesStore
 * @const SavedMessagesStore
 *
 * @description
 * The acting member's bookmarks across one organization.
 *
 * Component-scoped: the list is a route surface, and its paging should reset
 * when the member leaves it.
 *
 * Unsaving drops the row locally. The `204` carries no body, and the message
 * has by definition left this collection, so there is nothing to merge back.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const SavedMessagesStore = signalStore(
  withEntities({ entity: type<MessageOutput>(), collection: 'saved' }),
  withState<SavedMessagesState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    loadError: computed(() => store.listCallState().error),

    /** Whether the server reports more bookmarks than are currently loaded. */
    hasMore: computed((): boolean => store.savedEntities().length < store.total()),
  })),

  withMethods((store, service = inject(MessageService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Loads one page of bookmarks.
     */
    load: rxMethod<ListSavedMessagesQuery>(
      pipe(
        tap((query: ListSavedMessagesQuery) =>
          patchState(store, {
            organization: query.organization,
            loadedPage: query.page ?? 1,
            listCallState: pendingCallState(),
          }),
        ),
        switchMap((query: ListSavedMessagesQuery) =>
          service.listSaved(query).pipe(
            tapResponse({
              next: (collection: HydraCollection<MessageOutput>): void => {
                const rows: MessageOutput[] = [...collection.member];
                // Page 1 replaces — it is either a first load or a reload;
                // any further page appends.
                patchState(
                  store,
                  (query.page ?? 1) === 1
                    ? setAllEntities(rows, { collection: 'saved' })
                    : addEntities(rows, { collection: 'saved' }),
                  { total: collection.totalItems, listCallState: successCallState(null) },
                );
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { listCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  savedMessagesStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Saved messages could not be loaded.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Removes a bookmark, and with it the row.
     */
    unsave: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { interactionCallState: pendingCallState() })),
        switchMap((messageId: string) =>
          service.unsave(messageId).pipe(
            tapResponse({
              next: (): void => {
                patchState(store, removeEntity(messageId, { collection: 'saved' }), {
                  total: Math.max(0, store.total() - 1),
                  interactionCallState: successCallState(null),
                });
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { interactionCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  savedMessagesStoreEvents.interactionFailed(
                    toStoreFailureEventPayload(storeError, 'The bookmark could not be removed.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),
  })),
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
