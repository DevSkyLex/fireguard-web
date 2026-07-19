import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, mergeMap, pipe, switchMap, tap } from 'rxjs';
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
  MessageOutput,
  PresenceOutput,
  SendMessageInput,
} from '@features/organization/features/messaging/models';

/**
 * State of the messaging workspace.
 *
 * @since 1.0.0
 */
interface MessagingWorkspaceState {
  readonly openThreadRootId: string | null;
  readonly repliesCallState: CallState<readonly MessageOutput[]>;
  readonly onlineMemberIds: readonly string[];
  readonly conversationsCallState: CallState<readonly ConversationOutput[]>;
  readonly messagesCallState: CallState<readonly MessageOutput[]>;
  readonly sendCallState: CallState<MessageOutput>;
  readonly activeConversationId: string | null;
}

const INITIAL_STATE: MessagingWorkspaceState = {
  openThreadRootId: null,
  repliesCallState: idleCallState(),
  onlineMemberIds: [],
  conversationsCallState: idleCallState(),
  messagesCallState: idleCallState(),
  sendCallState: idleCallState(),
  activeConversationId: null,
};

/**
 * Removes a member from an emoji's reaction list, dropping the emoji entirely
 * once nobody is left.
 *
 * The API's DELETE returns no body, so the updated message has to be derived
 * locally rather than read back.
 */
function applyReaction(
  message: MessageOutput,
  emoji: string,
  memberId: string,
  reacted: boolean,
): MessageOutput {
  const reactions = message.reactions
    .map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            count: reacted ? reaction.count + 1 : Math.max(0, reaction.count - 1),
            memberIds: reacted
              ? [...reaction.memberIds, memberId]
              : reaction.memberIds.filter((id: string) => id !== memberId),
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
 * Store MessagingWorkspaceStore
 * @const MessagingWorkspaceStore
 *
 * @description
 * Owns the messaging workspace: the conversation list, the active
 * conversation's messages, and sending.
 *
 * Three call states rather than one query: the list, the thread and the
 * composer fail independently, and a failed send must not blank the thread the
 * user is reading.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MessagingWorkspaceStore = signalStore(
  //#region State
  withState<MessagingWorkspaceState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed channels
     *
     * @description
     * Named channels, most recently active first.
     *
     * @type {Signal<readonly ConversationOutput[]>}
     */
    channels: computed<readonly ConversationOutput[]>(() =>
      (store.conversationsCallState().data ?? []).filter(
        (conversation: ConversationOutput): boolean => conversation.isChannel,
      ),
    ),

    /**
     * Computed directConversations
     *
     * @type {Signal<readonly ConversationOutput[]>}
     */
    directConversations: computed<readonly ConversationOutput[]>(() =>
      (store.conversationsCallState().data ?? []).filter(
        (conversation: ConversationOutput): boolean => !conversation.isChannel,
      ),
    ),

    /**
     * Computed activeConversation
     *
     * @type {Signal<ConversationOutput | null>}
     */
    activeConversation: computed<ConversationOutput | null>(() => {
      const id: string | null = store.activeConversationId();
      if (id === null) return null;
      return (
        (store.conversationsCallState().data ?? []).find(
          (conversation: ConversationOutput): boolean => conversation.id === id,
        ) ?? null
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
     * Computed isLoadingConversations
     *
     * @type {Signal<boolean>}
     */
    isLoadingConversations: computed<boolean>(() => isCallPending(store.conversationsCallState())),

    /**
     * Computed isLoadingMessages
     *
     * @type {Signal<boolean>}
     */
    isLoadingMessages: computed<boolean>(() => isCallPending(store.messagesCallState())),

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
  withMethods((store, service = inject(MessagingService), mercure = inject(MercureService)) => {
    const loadMessages = rxMethod<string | null>(
      pipe(
        switchMap((conversationId: string | null) => {
          if (conversationId === null) return EMPTY;

          patchState(store, { messagesCallState: pendingCallState() });

          return service.listMessages(conversationId, { itemsPerPage: 50 }).pipe(
            tapResponse({
              next: (collection: HydraCollection<MessageOutput>) =>
                patchState(store, { messagesCallState: successCallState(collection.member) }),
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
                      : [...current, message],
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
       * Method loadConversations
       *
       * @description
       * Loads every conversation the member can see.
       *
       * @returns {void}
       */
      loadConversations: rxMethod<void>(
        pipe(
          tap(() =>
            patchState(store, {
              conversationsCallState: pendingCallState(store.conversationsCallState().data ?? []),
            }),
          ),
          switchMap(() =>
            service.listConversations({ itemsPerPage: 100 }).pipe(
              tapResponse({
                next: (collection: HydraCollection<ConversationOutput>) =>
                  patchState(store, {
                    conversationsCallState: successCallState(collection.member),
                  }),
                error: (error: unknown) =>
                  patchState(store, {
                    conversationsCallState: errorCallState(
                      toStoreError(error),
                      store.conversationsCallState().data ?? [],
                    ),
                  }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method selectConversation
       *
       * @description
       * Opens a conversation and loads its thread.
       *
       * @param {string | null} conversationId - The conversation to open.
       *
       * @returns {void}
       */
      selectConversation(conversationId: string | null): void {
        patchState(store, { activeConversationId: conversationId });
        loadMessages(conversationId);
        streamMessages(conversationId);
      },

      /**
       * Method toggleReaction
       *
       * @description
       * Adds or removes the current member's reaction, replacing the message
       * in place so only that row re-renders.
       *
       * The reacting member is identified by `currentMemberId`: the API sends
       * `memberIds` per emoji, and without knowing who "I" am the UI cannot
       * tell "3 people reacted" from "3 people including me".
       *
       * @param {{ message: MessageOutput; emoji: string; currentMemberId: string }} request - What to toggle.
       *
       * @returns {void}
       */
      toggleReaction: rxMethod<{
        readonly message: MessageOutput;
        readonly emoji: string;
        readonly currentMemberId: string;
      }>(
        pipe(
          mergeMap((request) => {
            const reacted: boolean =
              request.message.reactions
                .find((reaction) => reaction.emoji === request.emoji)
                ?.memberIds.includes(request.currentMemberId) ?? false;

            const call = reacted
              ? service
                  .removeReaction(request.message.id, request.emoji)
                  .pipe(
                    map(() =>
                      applyReaction(request.message, request.emoji, request.currentMemberId, false),
                    ),
                  )
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
      send: rxMethod<string>(
        pipe(
          switchMap((body: string) => {
            const conversationId: string | null = store.activeConversationId();
            if (conversationId === null || body.trim().length === 0) return EMPTY;

            patchState(store, { sendCallState: pendingCallState() });

            const input: SendMessageInput = { body: body.trim() };

            return service.sendMessage(conversationId, input).pipe(
              tapResponse({
                next: (message: MessageOutput) =>
                  patchState(store, {
                    sendCallState: successCallState(message),
                    messagesCallState: successCallState([
                      ...(store.messagesCallState().data ?? []),
                      message,
                    ]),
                  }),
                error: (error: unknown) =>
                  patchState(store, { sendCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
    };
  }),
  //#endregion
);

/**
 * Type MessagingWorkspaceStoreType
 *
 * @description
 * Injectable instance type of {@link MessagingWorkspaceStore}.
 */
export type MessagingWorkspaceStoreType = InstanceType<typeof MessagingWorkspaceStore>;
