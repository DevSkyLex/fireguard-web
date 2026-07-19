import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
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
  SendMessageInput,
} from '@features/organization/features/messaging/models';

/**
 * State of the messaging workspace.
 *
 * @since 1.0.0
 */
interface MessagingWorkspaceState {
  readonly conversationsCallState: CallState<readonly ConversationOutput[]>;
  readonly messagesCallState: CallState<readonly MessageOutput[]>;
  readonly sendCallState: CallState<MessageOutput>;
  readonly activeConversationId: string | null;
}

const INITIAL_STATE: MessagingWorkspaceState = {
  conversationsCallState: idleCallState(),
  messagesCallState: idleCallState(),
  sendCallState: idleCallState(),
  activeConversationId: null,
};

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
     * Computed isSending
     *
     * @type {Signal<boolean>}
     */
    isSending: computed<boolean>(() => isCallPending(store.sendCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(MessagingService)) => {
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

    return {
      loadMessages,

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
      },

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
