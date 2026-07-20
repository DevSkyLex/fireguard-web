import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, mergeMap, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type {
  ChannelOutput,
  ConversationOutput,
} from '@features/organization/features/messaging/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
} from '@features/organization/ports';

/**
 * State of the conversation inventory.
 *
 * @since 1.0.0
 */
interface ConversationInventoryState {
  readonly conversationsCallState: CallState<readonly ConversationOutput[]>;

  /**
   * The id of the conversation the last create/open call produced. Held rather
   * than the whole payload because `POST /channels` answers a `ChannelOutput`,
   * whose shape does not match the list's `ConversationOutput` — the list is
   * reloaded instead, and the caller only needs the id to navigate.
   */
  readonly openedConversationCallState: CallState<string>;
}

const INITIAL_STATE: ConversationInventoryState = {
  conversationsCallState: idleCallState(),
  openedConversationCallState: idleCallState(),
};

/**
 * Returns the list with one conversation swapped by id.
 */
function replaceConversation(
  conversations: readonly ConversationOutput[],
  updated: ConversationOutput,
): readonly ConversationOutput[] {
  return conversations.map(
    (conversation: ConversationOutput): ConversationOutput =>
      conversation.id === updated.id ? updated : conversation,
  );
}

/**
 * Store ConversationInventoryStore
 * @const ConversationInventoryStore
 *
 * @description
 * The single owner of the member's conversation list — channels, direct
 * conversations, unread counts and favorites. Provided once per dashboard
 * shell by `provideOrganizationFeature()` — NOT root, because its hooks
 * inject the organization ports, which are bound in that same route
 * injector — and shared by the two surfaces that render it at once: the
 * shell sidebar's channel sections and the messaging workspace page. Two
 * instances would show two different unread badges for the same
 * conversation.
 *
 * Loads itself: it watches the active organization through the context port
 * and only fetches when the member holds `messaging.read` — the sidebar is
 * mounted for every member, including those without messaging access.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ConversationInventoryStore = signalStore(
  //#region State
  withState<ConversationInventoryState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed conversations
     *
     * @type {Signal<readonly ConversationOutput[]>}
     */
    conversations: computed<readonly ConversationOutput[]>(
      () => store.conversationsCallState().data ?? [],
    ),

    /**
     * Computed channels
     *
     * @description
     * Named channels, in API order (most recently active first).
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
     * Computed favorites
     *
     * @description
     * The member's favorited conversations — the sidebar's Favorites section.
     *
     * @type {Signal<readonly ConversationOutput[]>}
     */
    favorites: computed<readonly ConversationOutput[]>(() =>
      (store.conversationsCallState().data ?? []).filter(
        (conversation: ConversationOutput): boolean => conversation.isFavorite,
      ),
    ),

    /**
     * Computed isLoading
     *
     * @type {Signal<boolean>}
     */
    isLoading: computed<boolean>(() => isCallPending(store.conversationsCallState())),

    /**
     * Computed totalUnread
     *
     * @description
     * Unread messages across every conversation, for the shell's Messages
     * badge. Summed here rather than in the navigation provider so both the
     * sidebar rows and the nav entry read one source.
     *
     * @type {Signal<number>}
     */
    totalUnread: computed<number>(() =>
      (store.conversationsCallState().data ?? []).reduce(
        (total: number, conversation: ConversationOutput): number =>
          total + conversation.unreadCount,
        0,
      ),
    ),

    /**
     * Computed isOpening
     *
     * @description
     * A channel is being created, or a direct conversation opened.
     *
     * @type {Signal<boolean>}
     */
    isOpening: computed<boolean>(() => isCallPending(store.openedConversationCallState())),

    /**
     * Computed openedConversationId
     *
     * @description
     * The conversation the last create/open produced, for the caller to
     * navigate to. Null until one succeeds.
     *
     * @type {Signal<string | null>}
     */
    openedConversationId: computed<string | null>(() => {
      const state: CallState<string> = store.openedConversationCallState();

      return isCallSuccess(state) ? state.data : null;
    }),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(MessagingService)) => {
    const load = rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) {
            patchState(store, { conversationsCallState: idleCallState() });
            return EMPTY;
          }

          patchState(store, {
            conversationsCallState: pendingCallState(store.conversationsCallState().data ?? []),
          });

          return service.listConversations(organizationId, { itemsPerPage: 100 }).pipe(
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
          );
        }),
      ),
    );

    return {
      load,

      /**
       * Method createChannel
       *
       * @description
       * Opens a new channel and reloads the inventory. The list is refetched
       * rather than patched: the endpoint answers a `ChannelOutput`, whose
       * shape is not the list's `ConversationOutput`.
       *
       * @param {{ organizationId: string; name: string }} input - Owning
       * organization and channel name (the backend rejects under 2 or over 80
       * characters).
       *
       * @returns {void}
       */
      createChannel: rxMethod<{ readonly organizationId: string; readonly name: string }>(
        pipe(
          switchMap((input: { readonly organizationId: string; readonly name: string }) => {
            patchState(store, { openedConversationCallState: pendingCallState() });

            return service.createChannel(input.organizationId, input.name).pipe(
              tapResponse({
                next: (channel: ChannelOutput) => {
                  patchState(store, {
                    openedConversationCallState: successCallState(channel.id),
                  });
                  load(input.organizationId);
                },
                error: (error: unknown) =>
                  patchState(store, {
                    openedConversationCallState: errorCallState(toStoreError(error)),
                  }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method openDirectConversation
       *
       * @description
       * Get-or-create against a member: addressing someone already spoken to
       * returns the existing conversation, so this doubles as "open".
       *
       * @param {{ organizationId: string; memberId: string }} input - Owning
       * organization and the addressed **organization member** id.
       *
       * @returns {void}
       */
      openDirectConversation: rxMethod<{
        readonly organizationId: string;
        readonly memberId: string;
      }>(
        pipe(
          switchMap((input: { readonly organizationId: string; readonly memberId: string }) => {
            patchState(store, { openedConversationCallState: pendingCallState() });

            return service.openDirectConversation(input.organizationId, input.memberId).pipe(
              tapResponse({
                next: (conversation: ConversationOutput) => {
                  patchState(store, {
                    openedConversationCallState: successCallState(conversation.id),
                  });
                  load(input.organizationId);
                },
                error: (error: unknown) =>
                  patchState(store, {
                    openedConversationCallState: errorCallState(toStoreError(error)),
                  }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method clearOpenedConversation
       *
       * @description
       * Resets the create/open result once the caller has navigated, so the
       * next success is a fresh transition rather than a stale id.
       *
       * @returns {void}
       */
      clearOpenedConversation(): void {
        patchState(store, { openedConversationCallState: idleCallState() });
      },

      /**
       * Method markRead
       *
       * @description
       * Clears a conversation's unread count — locally first so the sidebar
       * badge reacts on open, then on the server. The server's answer wins
       * when it comes back.
       *
       * @param {string} conversationId - The conversation just opened.
       *
       * @returns {void}
       */
      markRead: rxMethod<string>(
        pipe(
          mergeMap((conversationId: string) => {
            const current: readonly ConversationOutput[] =
              store.conversationsCallState().data ?? [];
            const known: ConversationOutput | undefined = current.find(
              (conversation: ConversationOutput): boolean => conversation.id === conversationId,
            );

            if (known && known.unreadCount > 0) {
              patchState(store, {
                conversationsCallState: successCallState(
                  replaceConversation(current, { ...known, unreadCount: 0 }),
                ),
              });
            }

            return service.markRead(conversationId).pipe(
              tapResponse({
                next: (updated: ConversationOutput) =>
                  patchState(store, {
                    conversationsCallState: successCallState(
                      replaceConversation(store.conversationsCallState().data ?? [], updated),
                    ),
                  }),
                error: () => undefined,
              }),
            );
          }),
        ),
      ),

      /**
       * Method toggleFavorite
       *
       * @description
       * Flips a conversation's favorite flag optimistically — the sidebar
       * section moves immediately — then confirms with the API. Unfavoriting
       * returns no body, so the local flip stands; on error the flag reverts.
       *
       * @param {ConversationOutput} conversation - The conversation to flip.
       *
       * @returns {void}
       */
      toggleFavorite: rxMethod<ConversationOutput>(
        pipe(
          mergeMap((conversation: ConversationOutput) => {
            const favorite: boolean = !conversation.isFavorite;

            patchState(store, {
              conversationsCallState: successCallState(
                replaceConversation(store.conversationsCallState().data ?? [], {
                  ...conversation,
                  isFavorite: favorite,
                }),
              ),
            });

            return service.setFavorite(conversation.id, favorite).pipe(
              tapResponse({
                next: (updated: ConversationOutput | void) => {
                  if (updated) {
                    patchState(store, {
                      conversationsCallState: successCallState(
                        replaceConversation(store.conversationsCallState().data ?? [], updated),
                      ),
                    });
                  }
                },
                error: () =>
                  patchState(store, {
                    conversationsCallState: successCallState(
                      replaceConversation(store.conversationsCallState().data ?? [], conversation),
                    ),
                  }),
              }),
            );
          }),
        ),
      ),

      /**
       * Method reload
       *
       * @description
       * Re-fetches the list for the given organization — the retry path of
       * whichever surface hit the error state.
       *
       * @param {string} organizationId - The active organization identifier.
       *
       * @returns {void}
       */
      reload(organizationId: string): void {
        load(organizationId);
      },
    };
  }),
  //#endregion

  //#region Hooks
  withHooks((store) => {
    const context = inject(ORGANIZATION_CONTEXT_PORT);
    const memberAccess = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

    return {
      /**
       * Follows the active organization, fetching only when the member may
       * read messaging — for everyone else the inventory stays idle and the
       * sidebar sections simply do not render.
       */
      onInit(): void {
        store.load(
          computed((): string | null => {
            const organization = context.selectedOrganization();
            if (!organization) return null;

            const granted: ReadonlySet<string> = new Set(memberAccess.permissions());
            const canRead: boolean =
              granted.has(ORGANIZATION_PERMISSION.MESSAGING_READ) ||
              Array.from(granted).some(
                (permission: string): boolean =>
                  permission.endsWith('.*') &&
                  ORGANIZATION_PERMISSION.MESSAGING_READ.startsWith(permission.slice(0, -1)),
              );

            return canRead ? organization.id : null;
          }),
        );
      },
    };
  }),
  //#endregion
);

/**
 * Type ConversationInventoryStoreType
 *
 * @description
 * Injectable instance type of {@link ConversationInventoryStore}.
 */
export type ConversationInventoryStoreType = InstanceType<typeof ConversationInventoryStore>;
