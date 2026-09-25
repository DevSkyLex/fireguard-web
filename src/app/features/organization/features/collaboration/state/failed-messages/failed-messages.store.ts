import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, defer, EMPTY, from, map, mergeMap, of, pipe, switchMap, toArray } from 'rxjs';
import { isApiError } from '@core/api/utils';
import {
  resetQuery,
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { USER_IDENTITY_PORT } from '@features/account/ports';
import {
  ConversationService,
  MessagingOutboxRepository,
} from '@features/organization/features/collaboration/data-access';
import type { FailedMessageItem } from './models';

/**
 * Constant FailedMessagesStore
 * @const FailedMessagesStore
 * @description Browser-only, page-scoped outbox read. Conversation reads recheck server access before local drafts become visible.
 * @since 1.0.0
 */
export const FailedMessagesStore = signalStore(
  withEntities({ entity: type<FailedMessageItem>(), collection: 'failedMessage' }),
  withQueryState<void>(),
  withState({ organizationId: null as string | null, ownerId: null as string | null }),
  withComputed((store, identity = inject(USER_IDENTITY_PORT)) => ({
    items: computed(() =>
      (identity.profile()?.id ?? identity.profile()?.sub) === store.ownerId()
        ? store.failedMessageEntities()
        : [],
    ),
  })),
  withMethods(
    (
      store,
      outbox = inject(MessagingOutboxRepository),
      conversations = inject(ConversationService),
      identity = inject(USER_IDENTITY_PORT),
      platform = inject(PLATFORM_ID),
    ) => ({
      /**
       * Method load
       * @method load
       * @description Resolves each distinct conversation once with bounded concurrency. A scope change clears drafts and cancels prior reads.
       * @access public
       * @since 1.0.0
       * @param {string | null} organizationId - Current organization, or null to clear.
       * @returns {void}
       */
      load: rxMethod<string | null>(
        pipe(
          switchMap((organizationId) => {
            const ownerId = identity.profile()?.id ?? identity.profile()?.sub ?? null;
            patchState(store, removeAllEntities({ collection: 'failedMessage' }), resetQuery(), {
              organizationId,
              ownerId,
            });
            if (!isPlatformBrowser(platform) || !ownerId || !organizationId) return EMPTY;
            patchState(store, setPendingQuery());
            return defer(() => outbox.list()).pipe(
              switchMap((operations) => {
                const failed = operations.filter((operation) => operation.status === 'failed');
                const ids = [...new Set(failed.map((operation) => operation.conversationId))];
                return from(ids).pipe(
                  mergeMap(
                    (id) =>
                      conversations.get(id).pipe(
                        catchError((error: unknown) => {
                          if (isApiError(error) && (error.status === 403 || error.status === 404)) {
                            return of(null);
                          }
                          throw error;
                        }),
                      ),
                    4,
                  ),
                  toArray(),
                  map((resolved): FailedMessageItem[] => {
                    const allowed = new Map(
                      resolved.flatMap((conversation) =>
                        conversation !== null &&
                        conversation.organization.split('/').at(-1) === organizationId
                          ? [[conversation.id, conversation] as const]
                          : [],
                      ),
                    );
                    return failed.flatMap((operation) => {
                      const conversation = allowed.get(operation.conversationId);
                      if (!conversation) return [];
                      return [
                        {
                          id: operation.id,
                          body: operation.payload.input.body,
                          createdAt: operation.createdAt,
                          conversationLabel:
                            conversation.name ??
                            conversation.subjectLabel ??
                            $localize`:@@messages.saved.directConversation:Direct conversation`,
                          link: [
                            '/organizations',
                            organizationId,
                            conversation.isChannel ? 'channels' : 'messages',
                            conversation.id,
                          ],
                        },
                      ];
                    });
                  }),
                );
              }),
              tapResponse({
                next: (items) => {
                  if ((identity.profile()?.id ?? identity.profile()?.sub) !== ownerId) return;
                  patchState(
                    store,
                    setAllEntities(items, { collection: 'failedMessage' }),
                    setSuccessQuery<void>(undefined),
                  );
                },
                error: (error: unknown) => {
                  if ((identity.profile()?.id ?? identity.profile()?.sub) !== ownerId) return;
                  patchState(store, setErrorQuery(toStoreError(error)));
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
);

/**
 * Type FailedMessagesStoreType
 * @type FailedMessagesStoreType
 * @description Instance contract for the local failure list.
 * @since 1.0.0
 */
export type FailedMessagesStoreType = InstanceType<typeof FailedMessagesStore>;
