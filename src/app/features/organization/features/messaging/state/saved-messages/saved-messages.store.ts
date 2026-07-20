import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, mergeMap, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { MessageOutput } from '@features/organization/features/messaging/models';

/**
 * Store SavedMessagesStore
 * @const SavedMessagesStore
 *
 * @description
 * The member's saved messages across the active organization, most recently
 * saved first — the Saved items view. One query concern, page-provided:
 * the list reloads on every visit, which is what a personal reading list
 * wants.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const SavedMessagesStore = signalStore(
  withQueryState<MessageOutput[]>(),

  //#region Methods
  withMethods((store, service = inject(MessagingService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the saved list for an organization; `null` clears to idle-like
     * empty (no organization yet).
     *
     * @param {string | null} organizationId - Active organization identifier.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.listSavedMessages(organizationId).pipe(
            tapResponse({
              next: (collection: HydraCollection<MessageOutput>) =>
                patchState(store, setSuccessQuery([...collection.member])),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),

    /**
     * Method unsave
     *
     * @description
     * Removes a message from the saved list — optimistically, since the
     * DELETE returns no body; restored on failure.
     *
     * @param {MessageOutput} message - The message to unsave.
     *
     * @returns {void}
     */
    unsave: rxMethod<MessageOutput>(
      pipe(
        mergeMap((message: MessageOutput) => {
          const before: MessageOutput[] = store.queryData() ?? [];

          patchState(
            store,
            setSuccessQuery(before.filter((row: MessageOutput): boolean => row.id !== message.id)),
          );

          return service.setSaved(message.id, false).pipe(
            tapResponse({
              next: () => undefined,
              error: () => patchState(store, setSuccessQuery(before)),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type SavedMessagesStoreType
 *
 * @description
 * Injectable instance type of {@link SavedMessagesStore}.
 */
export type SavedMessagesStoreType = InstanceType<typeof SavedMessagesStore>;
