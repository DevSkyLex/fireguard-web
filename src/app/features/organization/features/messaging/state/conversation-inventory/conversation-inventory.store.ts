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
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type { ConversationOutput } from '@features/organization/features/messaging/models';
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
}

const INITIAL_STATE: ConversationInventoryState = {
  conversationsCallState: idleCallState(),
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

          return service.listConversations({ itemsPerPage: 100 }).pipe(
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
