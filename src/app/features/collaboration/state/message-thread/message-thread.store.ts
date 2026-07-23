import { computed, effect, inject } from '@angular/core';
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
  addEntities,
  setAllEntities,
  updateEntity,
  upsertEntities,
  upsertEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, debounceTime, EMPTY, mergeMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService, type MercureConnectionStatus } from '@core/mercure';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import {
  ConversationService,
  MessageService,
  MessagingOutboxRepository,
} from '@features/collaboration/data-access';
import type {
  AddReactionInput,
  EditMessageInput,
  MessageOutput,
  PostMessageInput,
} from '@features/collaboration/models';
import {
  messagingSyncEvents,
  MessagingSyncCoordinatorService,
} from '@features/collaboration/services';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import { messageThreadStoreEvents } from './events';
import type { MessageThreadState } from './models';

const INITIAL_STATE: MessageThreadState = {
  conversationId: null,
  total: 0,
  loadedPage: 0,
  listCallState: idleCallState(),
  postCallState: idleCallState(),
  interactionCallState: idleCallState(),
  realtimeTopic: null,
  pendingMessageIds: [],
  failedMessageIds: [],
};

/**
 * How long bursts of realtime frames are coalesced before the thread refetches.
 *
 * A lively channel emits one frame per message, reaction and pin; refetching
 * per frame would turn a conversation into a request storm for no visible gain.
 */
const REALTIME_COALESCE_MS = 300;

/** Removes one id from a list without mutating it. */
function without(ids: readonly string[], id: string): readonly string[] {
  return ids.filter((candidate: string): boolean => candidate !== id);
}

/**
 * Builds the row shown the instant someone presses send.
 *
 * Everything the server owns is left at its empty value; the fields that
 * matter for rendering — who, what, when — are known locally. The id is the
 * client-minted one, so the confirmed message replaces this row rather than
 * appearing beside it.
 */
function optimisticMessage(
  clientId: string,
  conversationId: string,
  input: PostMessageInput,
  memberAccess: OrganizationMemberAccessPort,
  authorDisplayName: string | null,
): MessageOutput {
  const profile = memberAccess.profile();
  const authorMember: string =
    profile === null ? '' : `/api/organizations/${profile.organizationId}/members/${profile.id}`;
  const now: string = new Date().toISOString();

  return {
    '@id': `/api/messages/${clientId}`,
    '@type': 'Message',
    id: clientId,
    conversation: `/api/conversations/${conversationId}`,
    authorMember,
    // The sender's own name, so a message they just wrote is not headed
    // "Unknown member" until the server confirms it.
    authorDisplayName: authorDisplayName ?? undefined,
    body: input.body,
    mentions: [],
    mentionNames: {},
    isDeleted: false,
    attachments: [],
    reactions: [],
    isSaved: false,
    replyCount: 0,
    references: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Constant MessageThreadStore
 * @const MessageThreadStore
 *
 * @description
 * One conversation's message thread.
 *
 * Component-scoped: opening another conversation should start from a clean
 * thread rather than inherit the previous one's pages.
 *
 * Three contract hazards are absorbed here.
 *
 * Reaction and save responses rebuild the message *without* its real reply
 * count or references, always reporting `replyCount: 0` and `references: []`.
 * Merging them whole would silently erase both, so those two paths patch only
 * the field they own.
 *
 * Deletion is a tombstone answering `204`: the row stays, redacted. There is
 * nothing to merge, so `isDeleted` is flipped locally.
 *
 * And there is no `GET /api/messages/{id}` — a single message cannot be
 * refetched, which is why every mutation has to leave the local copy correct.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MessageThreadStore = signalStore(
  withEntities({ entity: type<MessageOutput>(), collection: 'message' }),
  withState<MessageThreadState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isPosting: computed((): boolean => isCallPending(store.postCallState())),
    loadError: computed(() => store.listCallState().error),
    postError: computed(() => store.postCallState().error),

    /** Whether older messages remain unfetched. */
    hasMore: computed((): boolean => store.messageEntities().length < store.total()),

    /** Messages that survived redaction, for surfaces that hide tombstones. */
    visibleMessages: computed((): readonly MessageOutput[] =>
      store.messageEntities().filter((message: MessageOutput): boolean => !message.isDeleted),
    ),

    /** Pinned messages, most recently pinned first. */
    pinnedMessages: computed((): readonly MessageOutput[] =>
      store
        .messageEntities()
        .filter((message: MessageOutput): boolean => Boolean(message.pinnedAt))
        .toSorted((a: MessageOutput, b: MessageOutput): number =>
          (b.pinnedAt ?? '').localeCompare(a.pinnedAt ?? ''),
        ),
    ),
  })),

  withMethods(
    (
      store,
      service = inject(MessageService),
      dispatcher = inject(Dispatcher),
      outbox = inject(MessagingOutboxRepository),
      coordinator = inject(MessagingSyncCoordinatorService),
      memberAccess = inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT),
      userIdentity = inject<UserIdentityPort>(USER_IDENTITY_PORT),
    ) => ({
      /**
       * Loads one page of a conversation's messages.
       *
       * Switching conversation resets the collection; paging within the same one
       * appends, because messages arrive oldest-first and history is fetched by
       * asking for further pages.
       */
      load: rxMethod<{ readonly conversationId: string; readonly page?: number }>(
        pipe(
          tap(({ conversationId, page }) =>
            patchState(store, {
              conversationId,
              loadedPage: page ?? 1,
              listCallState: pendingCallState(),
            }),
          ),
          switchMap(({ conversationId, page }) =>
            service.list(conversationId, { page: page ?? 1 }).pipe(
              tapResponse({
                next: (collection: HydraCollection<MessageOutput>): void => {
                  const rows: MessageOutput[] = [...collection.member];
                  // Page 1 is either a first load or a conversation switch, so it
                  // replaces; any further page is history and appends.
                  patchState(
                    store,
                    (page ?? 1) === 1
                      ? setAllEntities(rows, { collection: 'message' })
                      : addEntities(rows, { collection: 'message' }),
                    { total: collection.totalItems, listCallState: successCallState(null) },
                  );
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Messages could not be loaded.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Posts a message. The response is complete, so it is merged whole.
       */
      send: rxMethod<{ readonly conversationId: string; readonly input: PostMessageInput }>(
        pipe(
          // `mergeMap`, not `switchMap`: two messages sent in quick succession
          // are two independent intentions, and cancelling the first would clear
          // the composer for a message that never left.
          mergeMap(({ conversationId, input }) => {
            const clientId: string = crypto.randomUUID();

            patchState(
              store,
              upsertEntity(
                optimisticMessage(
                  clientId,
                  conversationId,
                  input,
                  memberAccess,
                  userIdentity.displayName(),
                ),
                { collection: 'message' },
              ),
              {
                total: store.total() + 1,
                postCallState: pendingCallState(),
                pendingMessageIds: [...store.pendingMessageIds(), clientId],
              },
            );

            return service.postMessageWithClientId(conversationId, clientId, input).pipe(
              tapResponse({
                next: (message: MessageOutput): void => {
                  // The id was ours, so the confirmed message lands on the very
                  // same row — nothing to swap, and the Mercure echo of our own
                  // message upserts onto it too rather than duplicating.
                  patchState(store, upsertEntity(message, { collection: 'message' }), {
                    postCallState: successCallState(null),
                    pendingMessageIds: without(store.pendingMessageIds(), clientId),
                  });
                  dispatcher.dispatch(messageThreadStoreEvents.posted(message));
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);

                  // A replayed client id means the message is already stored —
                  // that is success, not failure. `code` is where
                  // `toStoreError` puts the HTTP status.
                  if (storeError.code === 409) {
                    patchState(store, {
                      postCallState: successCallState(null),
                      pendingMessageIds: without(store.pendingMessageIds(), clientId),
                    });

                    return;
                  }

                  patchState(store, {
                    postCallState: errorCallState(storeError),
                    pendingMessageIds: without(store.pendingMessageIds(), clientId),
                    failedMessageIds: [...store.failedMessageIds(), clientId],
                  });

                  // Durable: the message survives a reload and is replayed on
                  // reconnection. Safe to replay because the id is ours.
                  void outbox
                    .queue(conversationId, 'message.send', { conversationId, clientId, input })
                    .catch(() => undefined);

                  dispatcher.dispatch(
                    messageThreadStoreEvents.postFailed(
                      toStoreFailureEventPayload(storeError, 'The message could not be sent.'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Edits a message. The response is complete.
       */
      edit: rxMethod<{ readonly messageId: string; readonly input: EditMessageInput }>(
        pipe(
          tap(() => patchState(store, { postCallState: pendingCallState() })),
          switchMap(({ messageId, input }) =>
            service.edit(messageId, input).pipe(
              tapResponse({
                next: (message: MessageOutput): void =>
                  patchState(store, upsertEntity(message, { collection: 'message' }), {
                    postCallState: successCallState(null),
                  }),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { postCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.postFailed(
                      toStoreFailureEventPayload(storeError, 'The message could not be edited.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Tombstones a message.
       *
       * The `204` carries no body and the row is *kept* server-side, redacted.
       * The local copy is redacted to match rather than removed, so the thread
       * keeps its shape.
       */
      remove: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { postCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.remove(messageId).pipe(
              tapResponse({
                next: (): void =>
                  patchState(
                    store,
                    updateEntity(
                      {
                        id: messageId,
                        changes: {
                          isDeleted: true,
                          body: undefined,
                          mentions: [],
                          attachments: [],
                          reactions: [],
                        },
                      },
                      { collection: 'message' },
                    ),
                    { postCallState: successCallState(null) },
                  ),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { postCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.postFailed(
                      toStoreFailureEventPayload(storeError, 'The message could not be deleted.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Adds a reaction.
       *
       * Only `reactions` is taken from the response: the reaction handler
       * rebuilds the message without its reply count or references, so the rest
       * of that payload is fabricated.
       */
      react: rxMethod<{ readonly messageId: string; readonly input: AddReactionInput }>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap(({ messageId, input }) =>
            service.addReaction(messageId, input).pipe(
              tapResponse({
                next: (message: MessageOutput): void =>
                  patchState(
                    store,
                    updateEntity(
                      { id: messageId, changes: { reactions: message.reactions } },
                      { collection: 'message' },
                    ),
                    { interactionCallState: successCallState(null) },
                  ),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { interactionCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.interactionFailed(
                      toStoreFailureEventPayload(storeError, 'The reaction could not be added.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Removes the acting member's reaction with an emoji.
       *
       * The endpoint answers `204` with no body, so the tally is recomputed
       * locally on success — the member is dropped from it and the chip
       * disappears once its count reaches zero. Applied only after the call
       * succeeds, mirroring {@link react}, so a failure leaves the tally intact.
       */
      removeReaction: rxMethod<{ readonly messageId: string; readonly emoji: string }>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap(({ messageId, emoji }) =>
            service.removeReaction(messageId, emoji).pipe(
              tapResponse({
                next: (): void => {
                  const message: MessageOutput | undefined = store.messageEntityMap()[messageId];

                  if (message === undefined) {
                    patchState(store, { interactionCallState: successCallState(null) });

                    return;
                  }

                  const reactions = message.reactions
                    .map((reaction) =>
                      reaction.emoji === emoji
                        ? {
                            emoji: reaction.emoji,
                            count: Math.max(0, reaction.count - 1),
                            reactedByMe: false,
                          }
                        : reaction,
                    )
                    .filter((reaction) => reaction.count > 0);

                  patchState(
                    store,
                    updateEntity(
                      { id: messageId, changes: { reactions } },
                      { collection: 'message' },
                    ),
                    { interactionCallState: successCallState(null) },
                  );
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { interactionCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.interactionFailed(
                      toStoreFailureEventPayload(storeError, 'The reaction could not be removed.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Saves a message for the acting member.
       *
       * Same hazard as {@link react}: only `isSaved` is trustworthy here.
       */
      save: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.save(messageId).pipe(
              tapResponse({
                next: (message: MessageOutput): void =>
                  patchState(
                    store,
                    updateEntity(
                      { id: messageId, changes: { isSaved: message.isSaved } },
                      { collection: 'message' },
                    ),
                    { interactionCallState: successCallState(null) },
                  ),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { interactionCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.interactionFailed(
                      toStoreFailureEventPayload(storeError, 'The message could not be saved.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Pins a message. Unlike reactions and saves, this response is complete.
       */
      pin: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.pin(messageId).pipe(
              tapResponse({
                next: (message: MessageOutput): void =>
                  patchState(store, upsertEntity(message, { collection: 'message' }), {
                    interactionCallState: successCallState(null),
                  }),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { interactionCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.interactionFailed(
                      toStoreFailureEventPayload(storeError, 'The message could not be pinned.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Puts a failed message back in the queue and asks for a drain now.
       *
       * The row itself never left the thread, so nothing is re-composed — the
       * member is retrying the same message under the same id, which is why
       * this cannot duplicate.
       */
      async retryFailed(clientId: string): Promise<void> {
        const conversationId: string | null = store.conversationId();

        if (conversationId === null) return;

        const queued = await outbox.listForConversation(conversationId);
        const operation = queued.find(
          (candidate): boolean => candidate.payload.clientId === clientId,
        );

        if (!operation) return;

        await outbox.retry(operation.id);
        patchState(store, {
          failedMessageIds: without(store.failedMessageIds(), clientId),
          pendingMessageIds: [...store.pendingMessageIds(), clientId],
        });

        await coordinator.flush();
      },
    }),
  ),

  withComputed((store, mercure = inject(MercureService)) => ({
    /** Health of the thread's realtime topic, or `null` when not connected. */
    realtimeStatus: computed((): MercureConnectionStatus | null =>
      store.realtimeTopic() === null
        ? null
        : (mercure.status().get(store.realtimeTopic() ?? '') ?? null),
    ),
  })),

  withMethods(
    (
      store,
      service = inject(MessageService),
      conversations = inject(ConversationService),
      mercure = inject(MercureService),
      dispatcher = inject(Dispatcher),
    ) => {
      /**
       * Re-reads the most recent page and folds it into what is already
       * loaded.
       *
       * Deliberately silent: it never touches `listCallState`, because a
       * background refresh that flashes a spinner over a conversation someone
       * is reading is worse than the staleness it fixes. A failure is dropped
       * for the same reason — the next frame or reconnection tries again.
       *
       * It upserts rather than replaces, so history the member scrolled back
       * through survives. The limit is honest and worth knowing: a change to a
       * message that has fallen off page 1 is not picked up, and cannot be —
       * there is no `GET /api/messages/{id}` to refetch a single message with.
       */
      const refresh = rxMethod<void>(
        pipe(
          switchMap(() => {
            const conversationId: string | null = store.conversationId();

            if (conversationId === null) return EMPTY;

            return service.list(conversationId, { page: 1 }).pipe(
              tapResponse({
                next: (collection: HydraCollection<MessageOutput>): void =>
                  patchState(
                    store,
                    upsertEntities([...collection.member], { collection: 'message' }),
                    { total: collection.totalItems },
                  ),
                error: (): void => undefined,
              }),
            );
          }),
        ),
      );

      return {
        refresh,

        /**
         * Moves the acting member's read marker to now, clearing the
         * conversation's unread count.
         *
         * Fire-and-forget: a read marker that fails to move is not worth
         * interrupting the member for. On success it emits `conversationRead`
         * so the sidebar lists — separate store instances — can zero the badge
         * without a refetch. The response's own `unreadCount` is the pre-write
         * snapshot and is deliberately ignored.
         */
        markRead: rxMethod<string>(
          pipe(
            switchMap((conversationId: string) =>
              conversations.markRead(conversationId).pipe(
                tap(() =>
                  dispatcher.dispatch(messageThreadStoreEvents.conversationRead(conversationId)),
                ),
                catchError(() => EMPTY),
              ),
            ),
          ),
        ),

        /**
         * Starts listening for the conversation's realtime updates.
         *
         * Frames are treated as **invalidation signals, not data**. A Mercure
         * frame carries six fields where `MessageOutput` needs twelve, there
         * is no endpoint to hydrate one message, `message.created` doubles as
         * the threaded-reply event, and the frames emit explicit `null`s where
         * REST omits the key. Building a message out of that would be wrong in
         * several ways at once; re-reading the page is right in all of them.
         *
         * Bursts are coalesced, and a reconnection triggers the same catch-up
         * because the hub replays nothing — see the reconnect effect below.
         */
        connect: rxMethod<string>(
          pipe(
            switchMap((conversationId: string) =>
              conversations.getSubscription(conversationId).pipe(
                tap((subscription) => patchState(store, { realtimeTopic: subscription.topic })),
                switchMap((subscription) =>
                  mercure.subscribe<unknown>(subscription.topic, subscription.token).pipe(
                    debounceTime(REALTIME_COALESCE_MS),
                    tap(() => refresh()),
                  ),
                ),
                // Realtime is an enhancement: without it the thread still
                // works, it just stops updating on its own.
                catchError(() => EMPTY),
              ),
            ),
          ),
        ),
      };
    },
  ),

  withHooks((store, events = inject(Events)) => ({
    onInit(): void {
      // The outbox knows the message left; the thread knows which row was
      // showing as unsent. Without this the row stays marked failed until the
      // member reloads.
      events
        .on(messagingSyncEvents.replayed)
        .pipe(takeUntilDestroyed())
        .subscribe(({ payload }): void => {
          if (payload.conversationId !== store.conversationId()) return;

          patchState(store, {
            failedMessageIds: store
              .failedMessageIds()
              .filter((id: string): boolean => !payload.clientIds.includes(id)),
          });
          store.refresh();
        });

      let missedUpdates = false;

      effect((): void => {
        const status: MercureConnectionStatus | null = store.realtimeStatus();

        if (status === 'reconnecting') {
          missedUpdates = true;

          return;
        }

        // Anything published while the connection was down is simply gone —
        // there is no replay — so coming back up is exactly when to refetch.
        if (status === 'connected' && missedUpdates) {
          missedUpdates = false;
          store.refresh();
        }
      });
    },
  })),
);

/**
 * Type MessageThreadStoreType
 *
 * @description
 * Injection type of {@link MessageThreadStore}.
 *
 * @since 1.0.0
 */
export type MessageThreadStoreType = InstanceType<typeof MessageThreadStore>;
