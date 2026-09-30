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
  withProps,
  withState,
} from '@ngrx/signals';
import {
  addEntities,
  removeAllEntities,
  setAllEntities,
  updateEntity,
  upsertEntities,
  upsertEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  catchError,
  concatMap,
  debounceTime,
  defer,
  EMPTY,
  exhaustMap,
  filter,
  map,
  mergeMap,
  type Observable,
  of,
  pipe,
  switchMap,
  Subject,
  takeUntil,
  tap,
  timer,
} from 'rxjs';
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
} from '@features/organization/features/collaboration/data-access';
import type {
  AddReactionInput,
  ConversationReceiptsOutput,
  EditMessageInput,
  MessageOutput,
  MessageReactionOutput,
  PostMessageInput,
} from '@features/organization/features/collaboration/models';
import {
  messagingSyncEvents,
  MessagingSyncCoordinatorService,
} from '@features/organization/features/collaboration/services';
import { memberIriOf } from '@features/organization/features/collaboration/utils';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import {
  MESSAGE_PAGE_SIZE,
  MESSAGE_REALTIME_COALESCE_MS,
  MESSAGE_SUBSCRIPTION_REFRESH_MS,
} from './constants';
import { messageThreadStoreEvents } from './events';
import type { MessageThreadState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Provides the data required by this record.
 *
 * @access public
 *
 * @type {MessageThreadState}
 */
const INITIAL_STATE: MessageThreadState = {
  readGeneration: 0,
  conversationId: null,
  total: 0,
  oldestLoadedPage: 0,
  newestLoadedPage: 0,
  listCallState: idleCallState(),
  postCallState: idleCallState(),
  outboxCallState: idleCallState(),
  interactionCallState: idleCallState(),
  editCallState: idleCallState(),
  deleteCallState: idleCallState(),
  realtimeTopic: null,
  receiptPositions: [],
  receiptsCallState: idleCallState(),
  deliveryCallState: idleCallState(),
  typingCallState: idleCallState(),
  lastDeliveryAttemptId: null,
  lastReadAttemptId: null,
  typingMemberIds: [],
  pendingMessageIds: [],
  failedMessageIds: [],
};

/**
 * Interface LoadedMessagePage
 * @interface
 *
 * @description
 * The number cannot be recovered from the response — Hydra's `view` is not
 * emitted by this endpoint — and every write to the loaded-window bounds needs
 * it, so it travels alongside the collection.
 */
interface LoadedMessagePage {
  /**
   * Property page
   * @readonly
   *
   * @description
   * Selects the page of loaded message page results to request.
   *
   * @access public
   *
   * @type {number}
   */
  readonly page: number;

  /**
   * Property collection
   * @readonly
   *
   * @description
   * Contains the server-paginated messages loaded for the conversation.
   *
   * @access public
   *
   * @type {HydraCollection<MessageOutput>}
   */
  readonly collection: HydraCollection<MessageOutput>;
}

/**
 * Function without
 *
 * @description
 * Removes one message identifier from a collection while preserving the remaining order.
 *
 * @param {readonly string[]} ids - Message identifiers currently in the collection.
 * @param {string} id - Identifier to remove.
 *
 * @returns {readonly string[]} Remaining identifiers in their original order.
 */
function without(ids: readonly string[], id: string): readonly string[] {
  return ids.filter((candidate: string): boolean => candidate !== id);
}

/**
 * Function newestPageOf
 *
 * @description
 * The API returns messages oldest-first from a plain offset, so the newest ones
 * are on the last page rather than the first. An empty conversation still has a
 * page 1.
 *
 * @param {number} totalItems - Number of messages available from the server.
 *
 * @returns {number} One-based page containing the newest messages.
 */
function newestPageOf(totalItems: number): number {
  return Math.max(1, Math.ceil(totalItems / MESSAGE_PAGE_SIZE));
}

/**
 * Function byCreatedAt
 *
 * @description
 * Orders messages chronologically, using the message id to stabilize equal timestamps.
 *
 * @param {MessageOutput} first - First message in the comparison.
 * @param {MessageOutput} second - Second message in the comparison.
 *
 * @returns {number} Negative, zero, or positive ordering result.
 */
function byCreatedAt(first: MessageOutput, second: MessageOutput): number {
  return first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id);
}

/**
 * Function optimisticMessage
 *
 * @description
 * Everything the server owns is left at its empty value; the fields that
 * matter for rendering — who, what, when — are known locally. The id is the
 * client-minted one, so the confirmed message replaces this row rather than
 * appearing beside it.
 *
 * @param {string} clientId - Client-generated identifier used for replacement after sync.
 * @param {string} conversationId - Conversation receiving the message.
 * @param {PostMessageInput} input - Message content and reply metadata.
 * @param {OrganizationMemberAccessPort} memberAccess - Current member profile source.
 * @param {string | null} authorDisplayName - Resolved display name for the current member.
 *
 * @returns {MessageOutput} Locally renderable message awaiting server confirmation.
 */
function optimisticMessage(
  clientId: string,
  conversationId: string,
  input: PostMessageInput,
  memberAccess: OrganizationMemberAccessPort,
  authorDisplayName: string | null,
): MessageOutput {
  const authorMember: string = memberIriOf(memberAccess.profile()) ?? '';
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
 *
 * @description
 * One conversation's message thread.
 * Component-scoped, but the router reuses the page component when only the
 * conversation id changes, so a fresh instance is not guaranteed: the caller
 * must {@link reset} before loading another conversation.
 * **The API pages oldest-first from a plain offset**, so the newest messages
 * are on the *last* page. A thread therefore opens on that page and reads
 * history by walking page numbers down, and a background refresh re-reads the
 * newest page rather than the first — re-reading page 1 would never see a new
 * message in any conversation longer than one page.
 * Two contract hazards are absorbed here.
 * Reaction responses rebuild the message *without* its real reply count or
 * references, always reporting `replyCount: 0` and `references: []`. Merging
 * them whole would silently erase both, so that path patches only the field
 * it owns.
 * And there is no `GET /api/messages/{id}` — a single message cannot be
 * refetched, which is why every mutation has to leave the local copy correct.
 * The API's edit, tombstone-deletion, pin and save flows had store pipelines
 * here with no UI reaching them; they were pruned rather than left dead
 * (2026-08-20).
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @constant MessageThreadStore
 */
export const MessageThreadStore = signalStore(
  withEntities({ entity: type<MessageOutput>(), collection: 'message' }),
  withState<MessageThreadState>(INITIAL_STATE),
  withProps(() => ({
    readsInvalidated: new Subject<void>(),
    typingTimers: new Map<string, ReturnType<typeof setTimeout>>(),
  })),

  withComputed((store) => ({
    isLoading: computed(
      (): boolean =>
        isCallPending(store.listCallState()) ||
        (store.messageEntities().length === 0 && isCallPending(store.outboxCallState())),
    ),
    isPosting: computed((): boolean => isCallPending(store.postCallState())),
    isEditing: computed((): boolean => isCallPending(store.editCallState())),
    isDeleting: computed((): boolean => isCallPending(store.deleteCallState())),
    isInteracting: computed((): boolean => isCallPending(store.interactionCallState())),
    loadError: computed(() => store.listCallState().error ?? store.outboxCallState().error),
    postError: computed(() => store.postCallState().error),
    editError: computed(() => store.editCallState().error),
    deleteError: computed(() => store.deleteCallState().error),

    /**
     * @description
     * Whether older messages remain unfetched — that is, pages below the loaded window.
     */
    hasMore: computed((): boolean => store.oldestLoadedPage() > 1),

    /**
     * @description
     * The thread in reading order.
     * `withEntities` keeps insertion order, and history is paged in *after* the
     * newest messages, so the collection's own order is not chronological.
     * An optimistic row carries a local timestamp of now and sorts last, which
     * is where the sender expects to see it.
     */
    sortedMessages: computed((): readonly MessageOutput[] =>
      store.messageEntities().toSorted(byCreatedAt),
    ),
  })),

  withMethods(
    (
      store,
      outbox = inject(MessagingOutboxRepository),
      memberAccess = inject(ORGANIZATION_MEMBER_ACCESS_PORT),
      identity = inject(USER_IDENTITY_PORT),
    ) => ({
      /**
       * Method restoreQueued
       * @method restoreQueued
       *
       * @description
       * Restores durable local sends after an authorized server read, retaining IDs and timestamps
       * without replacing confirmed rows.
       *
       * @access private
       * @since 1.1.0
       *
       * @param {string} conversationId - Conversation whose read has succeeded.
       *
       * @returns {void}
       */
      restoreQueued: rxMethod<string>(
        pipe(
          switchMap((conversationId) => {
            const generation = store.readGeneration();
            const ownerId = identity.profile()?.id ?? identity.profile()?.sub;
            if (!ownerId) return EMPTY;
            patchState(store, { outboxCallState: pendingCallState() });
            return defer(() => outbox.listForConversation(conversationId)).pipe(
              takeUntil(store.readsInvalidated),
              tapResponse({
                next: (operations) => {
                  if (
                    store.conversationId() !== conversationId ||
                    store.readGeneration() !== generation ||
                    (identity.profile()?.id ?? identity.profile()?.sub) !== ownerId
                  )
                    return;
                  const missing = operations.filter(
                    (operation) => !store.messageEntityMap()[operation.payload.clientId],
                  );
                  const messages = missing.map((operation): MessageOutput => ({
                    ...optimisticMessage(
                      operation.payload.clientId,
                      conversationId,
                      operation.payload.input,
                      memberAccess,
                      identity.displayName(),
                    ),
                    createdAt: operation.createdAt,
                    updatedAt: operation.createdAt,
                  }));
                  patchState(store, addEntities(messages, { collection: 'message' }), {
                    failedMessageIds: [
                      ...new Set([
                        ...store.failedMessageIds(),
                        ...missing
                          .filter((operation) => operation.status === 'failed')
                          .map((operation) => operation.payload.clientId),
                      ]),
                    ],
                    pendingMessageIds: [
                      ...new Set([
                        ...store.pendingMessageIds(),
                        ...missing
                          .filter((operation) => operation.status !== 'failed')
                          .map((operation) => operation.payload.clientId),
                      ]),
                    ],
                    outboxCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  if (
                    store.conversationId() !== conversationId ||
                    store.readGeneration() !== generation ||
                    (identity.profile()?.id ?? identity.profile()?.sub) !== ownerId
                  )
                    return;
                  patchState(store, { outboxCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),

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
       * @description
       * Opens a conversation on its newest messages.
       * Costs one request for a conversation that fits in a page, which is most
       * of them. A longer one costs two: the first read is also the only way to
       * learn `totalItems`, and the newest page cannot be named without it.
       */
      load: rxMethod<string>(
        pipe(
          switchMap((conversationId: string) => {
            const generation = store.readGeneration() + 1;
            store.readsInvalidated.next();
            patchState(store, removeAllEntities({ collection: 'message' }), {
              ...INITIAL_STATE,
              conversationId,
              readGeneration: generation,
              listCallState: pendingCallState(),
            });
            return service.list(conversationId, { page: 1, itemsPerPage: MESSAGE_PAGE_SIZE }).pipe(
              switchMap((probe: HydraCollection<MessageOutput>): Observable<LoadedMessagePage> => {
                const newestPage: number = newestPageOf(probe.totalItems);

                return newestPage === 1
                  ? of({ page: 1, collection: probe })
                  : service
                      .list(conversationId, { page: newestPage, itemsPerPage: MESSAGE_PAGE_SIZE })
                      .pipe(
                        map((collection: HydraCollection<MessageOutput>): LoadedMessagePage => ({
                          page: newestPage,
                          collection,
                        })),
                      );
              }),
              takeUntil(store.readsInvalidated),
              tapResponse({
                next: ({ page, collection }: LoadedMessagePage): void => {
                  if (
                    store.conversationId() !== conversationId ||
                    store.readGeneration() !== generation
                  )
                    return;
                  patchState(
                    store,
                    setAllEntities([...collection.member], { collection: 'message' }),
                    {
                      total: collection.totalItems,
                      oldestLoadedPage: page,
                      newestLoadedPage: page,
                      listCallState: successCallState(null),
                    },
                  );
                  store.restoreQueued(conversationId);
                },
                error: (error: unknown): void => {
                  if (
                    store.conversationId() !== conversationId ||
                    store.readGeneration() !== generation
                  )
                    return;
                  const storeError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Messages could not be loaded.'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * @description
       * Pages in the history immediately before the loaded window.
       * `exhaustMap` because a scroller can ask twice for the same page before
       * the first answer lands, and the second request would fetch rows the
       * first is already bringing.
       */
      loadOlder: rxMethod<void>(
        pipe(
          exhaustMap(() => {
            const conversationId = store.conversationId();
            const generation = store.readGeneration();
            const page = store.oldestLoadedPage() - 1;
            if (conversationId === null || page < 1) return EMPTY;
            const current = (): boolean =>
              store.conversationId() === conversationId &&
              store.readGeneration() === generation &&
              store.oldestLoadedPage() === page + 1;
            patchState(store, { listCallState: pendingCallState() });
            return service.list(conversationId, { page, itemsPerPage: MESSAGE_PAGE_SIZE }).pipe(
              takeUntil(store.readsInvalidated),
              tapResponse({
                next: (collection: HydraCollection<MessageOutput>): void => {
                  if (!current()) return;
                  patchState(
                    store,
                    addEntities([...collection.member], { collection: 'message' }),
                    {
                      total: collection.totalItems,
                      oldestLoadedPage: page,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  if (!current()) return;
                  const storeError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.loadFailed(
                      toStoreFailureEventPayload(storeError, 'Messages could not be loaded.'),
                    ),
                  );
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method reset
       *
       * @description
       * Required rather than optional: the router reuses the page component
       * across a conversation-id change, so this instance outlives the
       * conversation it was built for. Without it the previous thread's
       * messages render under the new header until the first page lands, and
       * its unsent rows keep a Retry control that would target the wrong
       * conversation.
       */
      reset(): void {
        const generation = store.readGeneration() + 1;
        store.readsInvalidated.next();
        for (const timeout of store.typingTimers.values()) clearTimeout(timeout);
        store.typingTimers.clear();
        patchState(store, removeAllEntities({ collection: 'message' }), {
          ...INITIAL_STATE,
          readGeneration: generation,
        });
      },

      /**
       * @description
       * Posts a message under a client-minted id.
       * The id being ours is what makes the rest safe: the confirmation lands
       * on the optimistic row rather than beside it, the Mercure echo of our
       * own message upserts onto it too, a `409` means the message is already
       * stored and is therefore success, and a failure can be queued for replay
       * without risking a duplicate.
       * Both handlers check the thread is still on the conversation the message
       * was written in. `mergeMap` deliberately lets a send outlive the route
       * change that started it, so without that check a message sent in one
       * conversation lands in whichever one the reader opened next. The outbox
       * queue is outside that check: the message was written and is owed a
       * delivery wherever the reader has gone.
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
                  dispatcher.dispatch(messageThreadStoreEvents.posted(message));

                  if (store.conversationId() !== conversationId) return;

                  patchState(store, upsertEntity(message, { collection: 'message' }), {
                    postCallState: successCallState(null),
                    pendingMessageIds: without(store.pendingMessageIds(), clientId),
                  });
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  const isCurrent: boolean = store.conversationId() === conversationId;

                  if (storeError.code === 409) {
                    if (isCurrent) {
                      patchState(store, {
                        postCallState: successCallState(null),
                        pendingMessageIds: without(store.pendingMessageIds(), clientId),
                      });
                    }

                    return;
                  }

                  if (isCurrent) {
                    patchState(store, {
                      postCallState: errorCallState(storeError),
                      pendingMessageIds: without(store.pendingMessageIds(), clientId),
                      failedMessageIds: [...store.failedMessageIds(), clientId],
                    });
                  }

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
       * @description
       * Adds a reaction.
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
       * @description
       * Removes the acting member's reaction with an emoji.
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
       * @description
       * Replaces a message's body.
       * Author-only server-side; the UI never offers it to anyone else, and a
       * `403` still surfaces through the edit dialog's own error. Only the
       * fields the edit owns are patched from the response — the entity keeps
       * everything the response could not have changed.
       */
      editMessage: rxMethod<{ readonly messageId: string; readonly input: EditMessageInput }>(
        pipe(
          tap(() => patchState(store, { editCallState: pendingCallState() })),
          switchMap(({ messageId, input }) =>
            service.editMessage(messageId, input).pipe(
              tapResponse({
                next: (message: MessageOutput): void => {
                  patchState(
                    store,
                    updateEntity(
                      {
                        id: messageId,
                        changes: {
                          body: message.body,
                          mentions: message.mentions,
                          mentionNames: message.mentionNames,
                          references: message.references,
                          editedAt: message.editedAt,
                          updatedAt: message.updatedAt,
                        },
                      },
                      { collection: 'message' },
                    ),
                    { editCallState: successCallState(null) },
                  );
                  dispatcher.dispatch(messageThreadStoreEvents.edited(message));
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { editCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.editFailed(
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
       * @description
       * Tombstones a message.
       * The server answers `204` and keeps the row, redacting its content at
       * the API boundary — so the local copy is redacted the same way rather
       * than removed: readers see "deleted", never a hole. `replyCount` and
       * the pin survive deliberately, mirroring the contract.
       */
      deleteMessage: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { deleteCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.deleteMessage(messageId).pipe(
              tapResponse({
                next: (): void => {
                  patchState(
                    store,
                    updateEntity(
                      {
                        id: messageId,
                        changes: {
                          isDeleted: true,
                          deletedAt: new Date().toISOString(),
                          body: undefined,
                          mentions: [],
                          mentionNames: {},
                          attachments: [],
                          reactions: [],
                          references: [],
                        },
                      },
                      { collection: 'message' },
                    ),
                    { deleteCallState: successCallState(null) },
                  );
                  dispatcher.dispatch(messageThreadStoreEvents.deleted(messageId));
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { deleteCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.deleteFailed(
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
       * @description
       * Pins a message in its conversation.
       * Only `pinnedAt`/`pinnedBy` are taken from the response, out of the
       * same caution the reaction path applies — a fabricated field merged
       * whole is a silent erasure.
       */
      pin: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.pinMessage(messageId).pipe(
              tapResponse({
                next: (message: MessageOutput): void =>
                  patchState(
                    store,
                    updateEntity(
                      {
                        id: messageId,
                        changes: { pinnedAt: message.pinnedAt, pinnedBy: message.pinnedBy },
                      },
                      { collection: 'message' },
                    ),
                    { interactionCallState: successCallState(null) },
                  ),
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
       * @description
       * Unpins a message. `204` with no body, so the pin fields are cleared
       * locally on success — the server treats unpinning an unpinned message
       * as a no-op, so this can never disagree with it.
       */
      unpin: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.unpinMessage(messageId).pipe(
              tapResponse({
                next: (): void =>
                  patchState(
                    store,
                    updateEntity(
                      { id: messageId, changes: { pinnedAt: undefined, pinnedBy: undefined } },
                      { collection: 'message' },
                    ),
                    { interactionCallState: successCallState(null) },
                  ),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { interactionCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.interactionFailed(
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
       * @description
       * Bookmarks a message for the acting member.
       * Only `isSaved` is taken from the response: the save handler rebuilds
       * the message without its real reply count or references.
       */
      save: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.saveMessage(messageId).pipe(
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
       * @description
       * Withdraws the acting member's bookmark. Idempotent `204`, so the flag
       * is cleared locally on success.
       */
      unsave: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { interactionCallState: pendingCallState() })),
          switchMap((messageId: string) =>
            service.unsaveMessage(messageId).pipe(
              tapResponse({
                next: (): void =>
                  patchState(
                    store,
                    updateEntity(
                      { id: messageId, changes: { isSaved: false } },
                      { collection: 'message' },
                    ),
                    { interactionCallState: successCallState(null) },
                  ),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { interactionCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    messageThreadStoreEvents.interactionFailed(
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

      /**
       * Method noteReplyPosted
       *
       * @description
       * reply sheet owns the write; this keeps the row's counter honest
       * without a refetch that cannot target one message anyway.
       */
      noteReplyPosted(parentMessageId: string): void {
        const parent: MessageOutput | undefined = store.messageEntityMap()[parentMessageId];

        if (parent === undefined) return;

        patchState(
          store,
          updateEntity(
            { id: parentMessageId, changes: { replyCount: parent.replyCount + 1 } },
            { collection: 'message' },
          ),
        );
      },

      /**
       * Method noteUnpinned
       *
       * @description
       * store — the channel info sheet keeps its own pinned list and owns
       * that write.
       */
      noteUnpinned(messageId: string): void {
        if (store.messageEntityMap()[messageId] === undefined) return;

        patchState(
          store,
          updateEntity(
            { id: messageId, changes: { pinnedAt: undefined, pinnedBy: undefined } },
            { collection: 'message' },
          ),
        );
      },

      /**
       * Method retryFailed
       *
       * @description
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
    /**
     * @description
     * Health of the thread's realtime topic, or `null` when not connected.
     */
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
      memberAccess = inject<OrganizationMemberAccessPort>(ORGANIZATION_MEMBER_ACCESS_PORT),
    ) => {
      /**
       * @description
       * Re-reads the newest page and folds it into what is already loaded.
       * The newest page, not the first: messages page oldest-first, so a new
       * message lands at the *end* of the collection and re-reading page 1
       * would never see it in any conversation longer than one page.
       * A message can also arrive that pushes the conversation onto a page that
       * did not exist when the thread opened, which the fresh `totalItems`
       * reveals — hence the second read, taken only when the boundary moved.
       * Deliberately silent: it never touches `listCallState`, because a
       * background refresh that flashes a spinner over a conversation someone
       * is reading is worse than the staleness it fixes. A failure is dropped
       * for the same reason — the next frame or reconnection tries again.
       * It upserts rather than replaces, so history the member scrolled back
       * through survives. The limit is honest and worth knowing: a change to a
       * message outside the loaded window is not picked up, and cannot be —
       * there is no `GET /api/messages/{id}` to refetch a single message with.
       */
      const refresh = rxMethod<void>(
        pipe(
          switchMap(() => {
            const conversationId: string | null = store.conversationId();

            if (conversationId === null) return EMPTY;

            const generation = store.readGeneration();
            const page: number = Math.max(1, store.newestLoadedPage());

            return service.list(conversationId, { page, itemsPerPage: MESSAGE_PAGE_SIZE }).pipe(
              switchMap((collection: HydraCollection<MessageOutput>) => {
                if (
                  store.readGeneration() !== generation ||
                  store.conversationId() !== conversationId
                )
                  return EMPTY;
                patchState(
                  store,
                  upsertEntities([...collection.member], { collection: 'message' }),
                  { total: collection.totalItems },
                );

                const newestPage: number = newestPageOf(collection.totalItems);

                if (newestPage <= page) return EMPTY;

                return service
                  .list(conversationId, { page: newestPage, itemsPerPage: MESSAGE_PAGE_SIZE })
                  .pipe(
                    tap((tail: HydraCollection<MessageOutput>): void =>
                      patchState(
                        store,
                        upsertEntities([...tail.member], { collection: 'message' }),
                        { total: tail.totalItems, newestLoadedPage: newestPage },
                      ),
                    ),
                  );
              }),
              takeUntil(store.readsInvalidated),
              catchError(() => EMPTY),
            );
          }),
        ),
      );

      const loadReceipts = rxMethod<string>(
        pipe(
          switchMap((conversationId: string) => {
            if (conversationId !== store.conversationId()) return EMPTY;
            const generation = store.readGeneration();
            patchState(store, { receiptsCallState: pendingCallState() });
            return conversations.getReceipts(conversationId).pipe(
              takeUntil(store.readsInvalidated),
              tapResponse({
                next: (response: ConversationReceiptsOutput): void => {
                  if (
                    store.conversationId() !== conversationId ||
                    store.readGeneration() !== generation
                  )
                    return;
                  patchState(store, {
                    receiptPositions: response.receipts,
                    receiptsCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  if (
                    store.conversationId() !== conversationId ||
                    store.readGeneration() !== generation
                  )
                    return;
                  patchState(store, { receiptsCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );

      const applyTyping = (frame: unknown): void => {
        if (typeof frame !== 'object' || frame === null) return;
        const memberId = Reflect.get(frame, 'memberId');
        const active = Reflect.get(frame, 'active');
        if (
          typeof memberId !== 'string' ||
          typeof active !== 'boolean' ||
          memberId === memberAccess.profile()?.id
        )
          return;
        const previous = store.typingTimers.get(memberId);
        if (previous !== undefined) clearTimeout(previous);
        store.typingTimers.delete(memberId);
        if (!active) {
          patchState(store, {
            typingMemberIds: store
              .typingMemberIds()
              .filter((id: string): boolean => id !== memberId),
          });
          return;
        }
        patchState(store, {
          typingMemberIds: [...new Set([...store.typingMemberIds(), memberId])],
        });
        store.typingTimers.set(
          memberId,
          setTimeout((): void => {
            store.typingTimers.delete(memberId);
            patchState(store, {
              typingMemberIds: store
                .typingMemberIds()
                .filter((id: string): boolean => id !== memberId),
            });
          }, 5_000),
        );
      };

      return {
        refresh,
        loadReceipts,

        /**
         * @description
         * Confirms one loaded incoming message from this browser.
         */
        acknowledgeDelivery: rxMethod<{
          readonly conversationId: string;
          readonly messageId: string;
        }>(
          pipe(
            concatMap(({ conversationId, messageId }) => {
              if (
                conversationId !== store.conversationId() ||
                store.lastDeliveryAttemptId() === messageId
              )
                return EMPTY;
              patchState(store, {
                lastDeliveryAttemptId: messageId,
                deliveryCallState: pendingCallState(),
              });
              return conversations.acknowledgeDelivery(conversationId, messageId).pipe(
                tapResponse({
                  next: (): void =>
                    patchState(store, { deliveryCallState: successCallState(null) }),
                  error: (error: unknown): void =>
                    patchState(store, {
                      lastDeliveryAttemptId: null,
                      deliveryCallState: errorCallState(toStoreError(error)),
                    }),
                }),
              );
            }),
          ),
        ),

        /**
         * @description
         * Publishes a temporary typing signal without sending draft content.
         */
        publishTyping: rxMethod<{ readonly conversationId: string; readonly active: boolean }>(
          pipe(
            concatMap(({ conversationId, active }) => {
              if (conversationId !== store.conversationId()) return EMPTY;
              patchState(store, { typingCallState: pendingCallState() });
              return conversations.publishTyping(conversationId, active).pipe(
                tapResponse({
                  next: (): void => patchState(store, { typingCallState: successCallState(null) }),
                  error: (error: unknown): void =>
                    patchState(store, { typingCallState: errorCallState(toStoreError(error)) }),
                }),
              );
            }),
          ),
        ),

        /**
         * Method toggleReaction
         *
         * @description
         * The direction lives here because the store holds the tally: a
         * surface handed only an emoji would have to look the row up again to
         * answer a question already answered.
         */
        toggleReaction(messageId: string, emoji: string): void {
          const message: MessageOutput | undefined = store.messageEntityMap()[messageId];
          const reacted: boolean =
            message?.reactions.some(
              (reaction: MessageReactionOutput): boolean =>
                reaction.emoji === emoji && reaction.reactedByMe,
            ) ?? false;

          if (reacted) {
            store.removeReaction({ messageId, emoji });

            return;
          }

          store.react({ messageId, input: { emoji } });
        },

        /**
         * @description
         * Moves the acting member's read marker, clearing the conversation's
         * unread count.
         * With no `lastReadMessageId` the marker moves to now for legacy
         * callers. Conversation pages supply the last displayed message only
         * after the visible thread catches up. The API records that position
         * along with the instant used for unread counts.
         * Fire-and-forget: a read marker that fails to move is not worth
         * interrupting the member for. On success it emits `conversationRead`
         * so the sidebar lists — separate store instances — can zero the badge
         * without a refetch. The response's own `unreadCount` is the pre-write
         * snapshot and is deliberately ignored.
         */
        markRead: rxMethod<{
          readonly conversationId: string;
          readonly lastReadMessageId?: string;
        }>(
          pipe(
            concatMap(({ conversationId, lastReadMessageId }) => {
              if (
                lastReadMessageId !== undefined &&
                store.lastReadAttemptId() === lastReadMessageId
              )
                return EMPTY;
              if (lastReadMessageId !== undefined)
                patchState(store, { lastReadAttemptId: lastReadMessageId });
              return conversations
                .markRead(
                  conversationId,
                  lastReadMessageId === undefined ? undefined : { lastReadMessageId },
                )
                .pipe(
                  tap(() =>
                    dispatcher.dispatch(messageThreadStoreEvents.conversationRead(conversationId)),
                  ),
                  catchError(() => {
                    if (lastReadMessageId !== undefined)
                      patchState(store, { lastReadAttemptId: null });
                    return EMPTY;
                  }),
                );
            }),
          ),
        ),

        /**
         * @description
         * Starts listening for the conversation's realtime updates.
         * Message frames are **invalidation signals, not message data**. A
         * Mercure frame carries six fields where `MessageOutput` needs twelve,
         * and there is no endpoint to hydrate one message. Typing frames carry
         * only ephemeral identity and activity; receipt frames invalidate the
         * durable receipt snapshot without refetching message bodies.
         * Bursts are coalesced, and a reconnection triggers the same catch-up
         * because the hub replays nothing — see the reconnect effect below.
         * The subscriber token expires after 15 minutes and `MercureService`
         * never re-mints one, so a long-open conversation would go quiet with
         * no visible symptom: every reconnection retries with the same dead
         * token. `timer(0, …)` re-mints ahead of that, and the inner
         * `switchMap` reopening the socket is required rather than incidental —
         * the token travels in the `EventSource` URL, so a fresh one only takes
         * effect on reopen. A failed re-mint skips its tick and leaves the
         * live socket alone.
         */
        connect: rxMethod<string>(
          pipe(
            switchMap((conversationId: string) =>
              timer(0, MESSAGE_SUBSCRIPTION_REFRESH_MS).pipe(
                concatMap(() =>
                  conversations.getSubscription(conversationId).pipe(catchError(() => EMPTY)),
                ),
                tap((subscription) => patchState(store, { realtimeTopic: subscription.topic })),
                switchMap((subscription) =>
                  mercure.subscribe<unknown>(subscription.topic, subscription.token).pipe(
                    tap((frame: unknown): void => {
                      if (typeof frame !== 'object' || frame === null) return;
                      const eventType = Reflect.get(frame, 'type');
                      if (eventType === 'typing.changed') applyTyping(frame);
                      else if (eventType === 'receipt.changed') loadReceipts(conversationId);
                    }),
                    filter((frame: unknown): boolean => {
                      if (typeof frame !== 'object' || frame === null) return true;
                      const eventType = Reflect.get(frame, 'type');
                      return eventType !== 'typing.changed' && eventType !== 'receipt.changed';
                    }),
                    debounceTime(MESSAGE_REALTIME_COALESCE_MS),
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
          const conversationId = store.conversationId();
          if (conversationId !== null) store.loadReceipts(conversationId);
        }
      });
    },
    onDestroy(): void {
      for (const timeout of store.typingTimers.values()) clearTimeout(timeout);
      store.typingTimers.clear();
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
 *
 * @type
 */
export type MessageThreadStoreType = InstanceType<typeof MessageThreadStore>;
