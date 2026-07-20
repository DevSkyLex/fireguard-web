import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, mergeMap, pipe, switchMap, timer } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { MercureService, resilientMercureStream } from '@core/mercure';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type {
  ConversationOutput,
  MessageAttachment,
  MessageOutput,
  PresenceOutput,
  SendMessageInput,
} from '@features/organization/features/messaging/models';
import { ConversationInventoryStore } from '../conversation-inventory';

/**
 * State of the messaging workspace.
 *
 * @since 1.0.0
 */
interface MessagingWorkspaceState {
  readonly attachments: readonly MessageAttachment[];
  readonly openThreadRootId: string | null;
  readonly repliesCallState: CallState<readonly MessageOutput[]>;
  readonly onlineMemberIds: readonly string[];
  readonly messagesCallState: CallState<readonly MessageOutput[]>;
  readonly sendCallState: CallState<MessageOutput>;
  readonly activeConversationId: string | null;

  /**
   * Oldest page already fetched, and how many messages the conversation holds.
   * The API pages at 50 newest-first; without these a long thread stopped dead
   * at its first page with nothing saying so.
   */
  readonly loadedMessagesPage: number;
  readonly messagesTotal: number;
}

const INITIAL_STATE: MessagingWorkspaceState = {
  attachments: [],
  openThreadRootId: null,
  repliesCallState: idleCallState(),
  onlineMemberIds: [],
  messagesCallState: idleCallState(),
  sendCallState: idleCallState(),
  activeConversationId: null,
  loadedMessagesPage: 1,
  messagesTotal: 0,
};

/**
 * Applies the member's own reaction change to one emoji, dropping the emoji
 * entirely once nobody is left.
 *
 * The API's DELETE returns no body, so the updated message has to be derived
 * locally rather than read back.
 */
function applyReaction(message: MessageOutput, emoji: string, reacted: boolean): MessageOutput {
  const reactions = message.reactions
    .map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            count: reacted ? reaction.count + 1 : Math.max(0, reaction.count - 1),
            reactedByMe: reacted,
          }
        : reaction,
    )
    .filter((reaction) => reaction.count > 0);

  return { ...message, reactions };
}

/**
 * Returns the thread with one message's reply count incremented.
 *
 * Kept out of the store body so the update is a named, testable step rather
 * than a spread buried in a `map`.
 */
function bumpReplyCount(
  messages: readonly MessageOutput[],
  rootId: string,
): readonly MessageOutput[] {
  const index: number = messages.findIndex((message: MessageOutput) => message.id === rootId);
  if (index === -1) return messages;

  const root: MessageOutput = messages[index] as MessageOutput;
  const updated: MessageOutput = { ...root, replyCount: root.replyCount + 1 };

  return messages.with(index, updated);
}

/**
 * How many messages the open thread keeps in memory — and therefore in the
 * DOM. The API pages history at 50, but the Mercure stream APPENDS without
 * bound: a channel left open all day would grow the DOM linearly (risk R8 of
 * the refonte plan). Newest wins; scrollback beyond the window reloads.
 */
const THREAD_WINDOW: number = 200;

/**
 * How often this member re-announces itself as online. The server holds a
 * presence for 90 seconds, so the beat sits well inside that window — a single
 * dropped request must not read as "left".
 */
const PRESENCE_PING_INTERVAL_MS: number = 45_000;

/**
 * Caps a thread at {@link THREAD_WINDOW} messages, dropping the oldest.
 * Callers append newest-last, so trimming from the front keeps the live tail.
 */
function trimToWindow(messages: readonly MessageOutput[]): readonly MessageOutput[] {
  return messages.length <= THREAD_WINDOW ? messages : messages.slice(-THREAD_WINDOW);
}

/**
 * Store MessagingWorkspaceStore
 * @const MessagingWorkspaceStore
 *
 * @description
 * Owns the open messaging workspace: the active conversation's messages,
 * replies, presence and sending. The conversation LIST is deliberately not
 * here — it lives in the root {@link ConversationInventoryStore}, shared with
 * the shell sidebar, and this store delegates to it so both surfaces read the
 * same unread counts.
 *
 * Separate call states rather than one query: the thread and the composer
 * fail independently, and a failed send must not blank the thread the user is
 * reading.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MessagingWorkspaceStore = signalStore(
  //#region State
  withState<MessagingWorkspaceState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store, inventory = inject(ConversationInventoryStore)) => ({
    /**
     * Computed activeConversation
     *
     * @type {Signal<ConversationOutput | null>}
     */
    activeConversation: computed<ConversationOutput | null>(() => {
      const id: string | null = store.activeConversationId();
      if (id === null) return null;
      return (
        inventory
          .conversations()
          .find((conversation: ConversationOutput): boolean => conversation.id === id) ?? null
      );
    }),

    /**
     * Computed messages
     *
     * @description
     * The active thread, oldest first — the API returns newest-first, which is
     * the wrong order to read a conversation in.
     *
     * @type {Signal<readonly MessageOutput[]>}
     */
    messages: computed<readonly MessageOutput[]>(() =>
      (store.messagesCallState().data ?? []).toSorted(
        (left: MessageOutput, right: MessageOutput): number =>
          left.createdAt.localeCompare(right.createdAt),
      ),
    ),

    /**
     * Computed attachmentsByMessage
     *
     * @description
     * Attachments keyed by their message id, so a message row can show its
     * files without a per-row lookup.
     *
     * @type {Signal<ReadonlyMap<string, readonly MessageAttachment[]>>}
     */
    attachmentsByMessage: computed<ReadonlyMap<string, readonly MessageAttachment[]>>(() => {
      const grouped = new Map<string, MessageAttachment[]>();
      for (const attachment of store.attachments()) {
        const list = grouped.get(attachment.message) ?? [];
        list.push(attachment);
        grouped.set(attachment.message, list);
      }
      return grouped;
    }),

    /**
     * Computed isLoadingMessages
     *
     * @type {Signal<boolean>}
     */
    isLoadingMessages: computed<boolean>(() => isCallPending(store.messagesCallState())),

    /**
     * Computed hasOlderMessages
     *
     * @description
     * Whether the conversation holds messages older than what is loaded. Drives
     * the scrollback affordance — without it a long thread simply stopped, and
     * nothing told the reader there was more above.
     *
     * @type {Signal<boolean>}
     */
    hasOlderMessages: computed<boolean>(
      () => (store.messagesCallState().data ?? []).length < store.messagesTotal(),
    ),

    /**
     * Computed threadRoot
     *
     * @description
     * The message whose replies are open, if any.
     *
     * @type {Signal<MessageOutput | null>}
     */
    threadRoot: computed<MessageOutput | null>(() => {
      const rootId: string | null = store.openThreadRootId();
      if (rootId === null) return null;
      return (
        (store.messagesCallState().data ?? []).find((m: MessageOutput) => m.id === rootId) ?? null
      );
    }),

    /**
     * Computed replies
     *
     * @description
     * The open thread's replies, oldest first.
     *
     * @type {Signal<readonly MessageOutput[]>}
     */
    replies: computed<readonly MessageOutput[]>(() =>
      (store.repliesCallState().data ?? []).toSorted((left, right) =>
        left.createdAt.localeCompare(right.createdAt),
      ),
    ),

    /**
     * Computed isLoadingReplies
     *
     * @type {Signal<boolean>}
     */
    isLoadingReplies: computed<boolean>(() => isCallPending(store.repliesCallState())),

    /**
     * Computed onlineMembers
     *
     * @description
     * Online member ids as a set, for O(1) lookup per rendered message.
     *
     * @type {Signal<ReadonlySet<string>>}
     */
    onlineMembers: computed<ReadonlySet<string>>(() => new Set(store.onlineMemberIds())),

    /**
     * Computed isSending
     *
     * @type {Signal<boolean>}
     */
    isSending: computed<boolean>(() => isCallPending(store.sendCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      service = inject(MessagingService),
      mercure = inject(MercureService),
      inventory = inject(ConversationInventoryStore),
    ) => {
      const loadAttachments = rxMethod<string | null>(
        pipe(
          switchMap((conversationId: string | null) => {
            if (conversationId === null) {
              patchState(store, { attachments: [] });
              return EMPTY;
            }

            return service.listAttachments(conversationId).pipe(
              tapResponse({
                next: (collection: HydraCollection<MessageAttachment>) =>
                  patchState(store, { attachments: collection.member }),
                error: () => patchState(store, { attachments: [] }),
              }),
            );
          }),
        ),
      );

      const loadMessages = rxMethod<string | null>(
        pipe(
          switchMap((conversationId: string | null) => {
            if (conversationId === null) return EMPTY;

            patchState(store, { messagesCallState: pendingCallState() });

            return service.listMessages(conversationId, { itemsPerPage: 50 }).pipe(
              tapResponse({
                next: (collection: HydraCollection<MessageOutput>) =>
                  patchState(store, {
                    messagesCallState: successCallState(collection.member),
                    loadedMessagesPage: 1,
                    messagesTotal: collection.totalItems,
                  }),
                error: (error: unknown) =>
                  patchState(store, { messagesCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      );

      /**
       * Live thread updates.
       *
       * Goes through `resilientMercureStream` rather than `MercureService`
       * directly: the raw service errors its subscriber on the transport `error`
       * event, which kills EventSource's own reconnect and leaves the channel
       * silently dead. The factory re-requests the subscription each attempt
       * because the token is short-lived.
       *
       * A message already in the thread is replaced, not appended — the sender's
       * own message arrives twice, once from the POST and once from the hub.
       */
      const streamMessages = rxMethod<string | null>(
        pipe(
          switchMap((conversationId: string | null) => {
            if (conversationId === null) return EMPTY;

            return resilientMercureStream<MessageOutput>(() =>
              service
                .getSubscription(conversationId)
                .pipe(
                  map((subscription) =>
                    mercure.subscribe<MessageOutput>(subscription.topic, subscription.token),
                  ),
                ),
            ).pipe(
              tapResponse({
                next: (message: MessageOutput) => {
                  const current: readonly MessageOutput[] = store.messagesCallState().data ?? [];
                  const known: boolean = current.some((m: MessageOutput) => m.id === message.id);

                  patchState(store, {
                    messagesCallState: successCallState(
                      known
                        ? current.map((m: MessageOutput) => (m.id === message.id ? message : m))
                        : trimToWindow([...current, message]),
                    ),
                  });
                },
                error: () => undefined,
              }),
            );
          }),
        ),
      );

      /** Swaps one message in the thread, leaving the rest untouched. */
      const replaceMessage = (updated: MessageOutput): void => {
        patchState(store, {
          messagesCallState: successCallState(
            (store.messagesCallState().data ?? []).map((message: MessageOutput) =>
              message.id === updated.id ? updated : message,
            ),
          ),
        });
      };

      return {
        loadMessages,
        streamMessages,

        /**
         * Method loadOlderMessages
         *
         * @description
         * Fetches the next page back and merges it in. Deliberately does NOT
         * trim to the thread window: that cap exists to bound the live tail's
         * growth, and applying it here would drop the very history just asked
         * for.
         *
         * @returns {void}
         */
        loadOlderMessages: rxMethod<void>(
          pipe(
            switchMap(() => {
              const conversationId: string | null = store.activeConversationId();
              const loaded: readonly MessageOutput[] = store.messagesCallState().data ?? [];

              if (conversationId === null || loaded.length >= store.messagesTotal()) return EMPTY;

              const page: number = store.loadedMessagesPage() + 1;

              return service.listMessages(conversationId, { itemsPerPage: 50, page }).pipe(
                tapResponse({
                  next: (collection: HydraCollection<MessageOutput>) => {
                    // Merge by id: a message can straddle two pages when one
                    // arrives between the requests.
                    const known = new Set(loaded.map((message: MessageOutput) => message.id));
                    const older = collection.member.filter(
                      (message: MessageOutput) => !known.has(message.id),
                    );

                    patchState(store, {
                      messagesCallState: successCallState([...older, ...loaded]),
                      loadedMessagesPage: page,
                      messagesTotal: collection.totalItems,
                    });
                  },
                  error: (): void => undefined,
                }),
              );
            }),
          ),
        ),

        /**
         * Method selectConversation
         *
         * @description
         * Opens a conversation, loads its thread and clears its unread count —
         * opening IS reading, and the sidebar badge must agree.
         *
         * @param {string | null} conversationId - The conversation to open.
         *
         * @returns {void}
         */
        selectConversation(conversationId: string | null): void {
          patchState(store, { activeConversationId: conversationId });
          loadAttachments(conversationId);
          loadMessages(conversationId);
          streamMessages(conversationId);

          if (conversationId !== null) {
            inventory.markRead(conversationId);
          }
        },

        /**
         * Method toggleReaction
         *
         * @description
         * Adds or removes the acting member's reaction, replacing the message
         * in place so only that row re-renders.
         *
         * Whether it is already mine comes from `reactedByMe`, which the API
         * aggregates server-side — it never sends the reactor ids, so there is
         * nothing to search client-side.
         *
         * @param {{ message: MessageOutput; emoji: string }} request - What to toggle.
         *
         * @returns {void}
         */
        toggleReaction: rxMethod<{
          readonly message: MessageOutput;
          readonly emoji: string;
        }>(
          pipe(
            mergeMap((request) => {
              const reacted: boolean =
                request.message.reactions.find((reaction) => reaction.emoji === request.emoji)
                  ?.reactedByMe ?? false;

              const call = reacted
                ? service
                    .removeReaction(request.message.id, request.emoji)
                    .pipe(map(() => applyReaction(request.message, request.emoji, false)))
                : service.addReaction(request.message.id, request.emoji);

              return call.pipe(
                tapResponse({
                  next: (updated: MessageOutput) =>
                    patchState(store, {
                      messagesCallState: successCallState(
                        (store.messagesCallState().data ?? []).map((message: MessageOutput) =>
                          message.id === updated.id ? updated : message,
                        ),
                      ),
                    }),
                  error: () => undefined,
                }),
              );
            }),
          ),
        ),

        /**
         * Method openThread
         *
         * @description
         * Opens a message's replies, or closes the panel when passed `null`.
         *
         * @param {string | null} rootId - The message whose replies to show.
         *
         * @returns {void}
         */
        openThread: rxMethod<string | null>(
          pipe(
            switchMap((rootId: string | null) => {
              patchState(store, { openThreadRootId: rootId });

              if (rootId === null) {
                patchState(store, { repliesCallState: idleCallState() });
                return EMPTY;
              }

              patchState(store, { repliesCallState: pendingCallState() });

              return service.listReplies(rootId).pipe(
                tapResponse({
                  next: (collection: HydraCollection<MessageOutput>) =>
                    patchState(store, { repliesCallState: successCallState(collection.member) }),
                  error: (error: unknown) =>
                    patchState(store, { repliesCallState: errorCallState(toStoreError(error)) }),
                }),
              );
            }),
          ),
        ),

        /**
         * Method reply
         *
         * @description
         * Posts a reply into the open thread and appends it, bumping the root's
         * reply count so the thread link in the main view stays truthful.
         *
         * @param {string} body - The reply body.
         *
         * @returns {void}
         */
        reply: rxMethod<string>(
          pipe(
            switchMap((body: string) => {
              const rootId: string | null = store.openThreadRootId();
              if (rootId === null || body.trim().length === 0) return EMPTY;

              return service.reply(rootId, { body: body.trim() }).pipe(
                tapResponse({
                  next: (created: MessageOutput) => {
                    patchState(store, {
                      repliesCallState: successCallState([
                        ...(store.repliesCallState().data ?? []),
                        created,
                      ]),
                      // Bumped through the shared replace helper so the lint rule
                      // against spreading inside `map` stays satisfied and the
                      // update path stays in one place.
                      messagesCallState: successCallState(
                        bumpReplyCount(store.messagesCallState().data ?? [], rootId),
                      ),
                    });
                  },
                  error: () => undefined,
                }),
              );
            }),
          ),
        ),

        /**
         * Method loadPresence
         *
         * @description
         * Reads who is online among the thread's authors.
         *
         * The API has no "list all online members" mode, so the caller passes the
         * ids it cares about — here, the distinct authors currently on screen.
         *
         * @param {{ organization: string; memberIds: readonly string[] }} request - Who to check.
         *
         * @returns {void}
         */
        /**
         * Method publishPresence
         *
         * @description
         * Announces this member as online, and keeps announcing while the
         * workspace stays open.
         *
         * Nothing called `pingPresence` before, so the app read everyone else's
         * presence while never publishing its own — the dot could only ever
         * appear for members using some other client. The server holds a
         * presence for 90s, so the beat is well inside that: a missed request
         * must not read as "left".
         *
         * @returns {void}
         */
        publishPresence: rxMethod<boolean>(
          pipe(
            switchMap((active: boolean) => {
              if (!active) return EMPTY;

              return timer(0, PRESENCE_PING_INTERVAL_MS).pipe(
                switchMap(() =>
                  service.pingPresence().pipe(
                    // A failed beat is not worth surfacing: the next one is
                    // seconds away and presence is ambient, not an action.
                    tapResponse({ next: (): void => undefined, error: (): void => undefined }),
                  ),
                ),
              );
            }),
          ),
        ),

        loadPresence: rxMethod<{
          readonly organization: string;
          readonly memberIds: readonly string[];
        }>(
          pipe(
            switchMap((request) => {
              if (request.memberIds.length === 0) return EMPTY;

              return service.getPresence(request.organization, request.memberIds).pipe(
                tapResponse({
                  next: (collection: HydraCollection<PresenceOutput>) =>
                    patchState(store, {
                      onlineMemberIds: collection.member
                        .filter((presence: PresenceOutput): boolean => presence.online)
                        .map((presence: PresenceOutput): string => presence.memberId),
                    }),
                  error: () => undefined,
                }),
              );
            }),
          ),
        ),

        /**
         * Method editMessage
         *
         * @description
         * Rewrites a message. The backend allows this to the author only, so a
         * failure leaves the thread untouched rather than showing an edit that
         * did not happen.
         *
         * @param {{ message: MessageOutput; body: string }} request - What to change.
         *
         * @returns {void}
         */
        editMessage: rxMethod<{ readonly message: MessageOutput; readonly body: string }>(
          pipe(
            mergeMap((request) =>
              service
                .editMessage(request.message.id, request.body)
                .pipe(tapResponse({ next: replaceMessage, error: () => undefined })),
            ),
          ),
        ),

        /**
         * Method deleteMessage
         *
         * @description
         * Soft-deletes a message. The row stays so replies and reactions keep
         * their anchor — it is marked `isDeleted` locally, not dropped from the
         * list, which is also what a reload would show.
         *
         * @param {MessageOutput} message - The message to delete.
         *
         * @returns {void}
         */
        deleteMessage: rxMethod<MessageOutput>(
          pipe(
            mergeMap((message: MessageOutput) =>
              service.deleteMessage(message.id).pipe(
                tapResponse({
                  next: (): void =>
                    replaceMessage({
                      ...message,
                      isDeleted: true,
                      body: null,
                      deletedAt: new Date().toISOString(),
                    }),
                  error: (): void => undefined,
                }),
              ),
            ),
          ),
        ),

        /**
         * Method setPinned
         *
         * @description
         * Pins or unpins a message for the whole conversation.
         *
         * @param {{ message: MessageOutput; pinned: boolean }} request - What to change.
         *
         * @returns {void}
         */
        setPinned: rxMethod<{ readonly message: MessageOutput; readonly pinned: boolean }>(
          pipe(
            mergeMap((request) =>
              service.setPinned(request.message.id, request.pinned).pipe(
                map(
                  (updated: MessageOutput | void): MessageOutput =>
                    // Unpinning returns no body, so the new state is derived here
                    // — and it must follow the requested direction, not assume one.
                    updated ??
                    (request.pinned
                      ? { ...request.message, pinnedAt: request.message.createdAt }
                      : { ...request.message, pinnedAt: null, pinnedBy: null }),
                ),
                tapResponse({ next: replaceMessage, error: () => undefined }),
              ),
            ),
          ),
        ),

        /**
         * Method setSaved
         *
         * @description
         * Adds or removes a message from the member's own saved list — personal,
         * unlike a pin.
         *
         * @param {{ message: MessageOutput; saved: boolean }} request - What to change.
         *
         * @returns {void}
         */
        setSaved: rxMethod<{ readonly message: MessageOutput; readonly saved: boolean }>(
          pipe(
            mergeMap((request) =>
              service.setSaved(request.message.id, request.saved).pipe(
                map(
                  (updated: MessageOutput | void): MessageOutput =>
                    updated ?? { ...request.message, isSaved: request.saved },
                ),
                tapResponse({ next: replaceMessage, error: () => undefined }),
              ),
            ),
          ),
        ),

        /**
         * Method send
         *
         * @description
         * Posts a message to the active conversation and appends it to the
         * thread, so the sender sees it without waiting for the hub to echo it
         * back.
         *
         * @param {string} body - The message body.
         *
         * @returns {void}
         */
        send: rxMethod<{ readonly body: string; readonly file: File | null }>(
          pipe(
            switchMap((request: { readonly body: string; readonly file: File | null }) => {
              const conversationId: string | null = store.activeConversationId();
              const body: string = request.body.trim();

              // A file with no text is a valid message: the API accepts an empty
              // body, and "here is the report" is often just the report.
              if (conversationId === null || (body.length === 0 && request.file === null)) {
                return EMPTY;
              }

              patchState(store, { sendCallState: pendingCallState() });

              const input: SendMessageInput = { body };

              return service.sendMessage(conversationId, input).pipe(
                switchMap((message: MessageOutput) => {
                  patchState(store, {
                    sendCallState: successCallState(message),
                    messagesCallState: successCallState(
                      trimToWindow([...(store.messagesCallState().data ?? []), message]),
                    ),
                  });

                  // Upload only after the message exists — the attachment hangs
                  // off its id. A failed upload leaves the message; it is not
                  // rolled back.
                  if (request.file === null) return EMPTY;

                  return service.uploadAttachment(message.id, request.file).pipe(
                    tapResponse({
                      next: (attachment: MessageAttachment) =>
                        patchState(store, { attachments: [...store.attachments(), attachment] }),
                      error: () => undefined,
                    }),
                  );
                }),
                tapResponse({
                  next: () => undefined,
                  error: (error: unknown) =>
                    patchState(store, { sendCallState: errorCallState(toStoreError(error)) }),
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
  //#endregion
);

/**
 * Type MessagingWorkspaceStoreType
 *
 * @description
 * Injectable instance type of {@link MessagingWorkspaceStore}.
 */
export type MessagingWorkspaceStoreType = InstanceType<typeof MessagingWorkspaceStore>;
