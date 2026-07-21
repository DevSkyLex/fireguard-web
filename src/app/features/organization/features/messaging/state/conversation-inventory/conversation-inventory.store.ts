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
import { EMPTY, forkJoin, mergeMap, pipe, switchMap } from 'rxjs';
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
import {
  MessagingService,
  toConversation,
} from '@features/organization/features/messaging/data-access';
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

  /**
   * Direct conversations opened during THIS session.
   *
   * The API has no `GET /api/direct-conversations` collection — a DM is only
   * ever returned by the get-or-create POST — so a reload loses them. Holding
   * them here at least keeps a DM in the sidebar for as long as the tab lives,
   * instead of it vanishing the instant the dialog closes. Remove this the day
   * the backend ships a DM list endpoint.
   */
  readonly sessionDirectConversations: readonly ConversationOutput[];
}

const INITIAL_STATE: ConversationInventoryState = {
  conversationsCallState: idleCallState(),
  openedConversationCallState: idleCallState(),
  sessionDirectConversations: [],
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
  withComputed((store) => {
    /**
     * Everything the member can open: what the two list calls returned, plus
     * the direct conversations opened this session (which no list endpoint
     * can return — see {@link ConversationInventoryState.sessionDirectConversations}).
     */
    const all = computed<readonly ConversationOutput[]>(() => {
      const loaded: readonly ConversationOutput[] = store.conversationsCallState().data ?? [];
      const known: ReadonlySet<string> = new Set(
        loaded.map((conversation: ConversationOutput): string => conversation.id),
      );

      return [
        ...loaded,
        ...store
          .sessionDirectConversations()
          .filter((conversation: ConversationOutput): boolean => !known.has(conversation.id)),
      ];
    });

    return {
      /**
       * Computed conversations
       *
       * @type {Signal<readonly ConversationOutput[]>}
       */
      conversations: all,

      /**
       * Computed channels
       *
       * @description
       * Named channels, in API order (most recently active first).
       *
       * @type {Signal<readonly ConversationOutput[]>}
       */
      channels: computed<readonly ConversationOutput[]>(() =>
        all().filter((conversation: ConversationOutput): boolean => conversation.isChannel),
      ),

      /**
       * Computed directConversations
       *
       * @description
       * 1-to-1 threads only. Matched on `subjectType` rather than "not a
       * channel", which would also sweep in record-bound subject threads.
       *
       * @type {Signal<readonly ConversationOutput[]>}
       */
      directConversations: computed<readonly ConversationOutput[]>(() =>
        all().filter(
          (conversation: ConversationOutput): boolean => conversation.subjectType === 'direct',
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
        all().filter((conversation: ConversationOutput): boolean => conversation.isFavorite),
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
        all().reduce(
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
    };
  }),
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

          // THREE calls, not one: `/api/conversations` deliberately excludes
          // channels AND direct conversations (a backend privacy invariant), so
          // each has its own endpoint. `forkJoin` because the sidebar is one
          // list — a partial render would flicker sections in and out.
          return forkJoin({
            channels: service.listChannels(organizationId, { itemsPerPage: 100 }),
            directs: service.listDirectConversations(organizationId, { itemsPerPage: 100 }),
            conversations: service.listConversations(organizationId, { itemsPerPage: 100 }),
          }).pipe(
            tapResponse({
              next: (result: {
                readonly channels: HydraCollection<ChannelOutput>;
                readonly directs: HydraCollection<ConversationOutput>;
                readonly conversations: HydraCollection<ConversationOutput>;
              }) =>
                patchState(store, {
                  conversationsCallState: successCallState([
                    ...result.channels.member.map(toConversation),
                    ...result.directs.member,
                    ...result.conversations.member,
                  ]),
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

    /**
     * Swaps one conversation in BOTH slices — the loaded list and the
     * session-only direct conversations. A DM lives in the second one, so an
     * update written only to the first would silently do nothing.
     */
    const replaceEverywhere = (updated: ConversationOutput): void => {
      patchState(store, {
        conversationsCallState: successCallState(
          replaceConversation(store.conversationsCallState().data ?? [], updated),
        ),
        sessionDirectConversations: replaceConversation(
          store.sessionDirectConversations(),
          updated,
        ),
      });
    };

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
       * The answer is kept in `sessionDirectConversations` because no endpoint
       * can list DMs back: without this the row would disappear from the
       * sidebar as soon as the dialog closed. It still does not survive a
       * reload — that needs a backend list endpoint.
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
                  const known: readonly ConversationOutput[] = store
                    .sessionDirectConversations()
                    .filter(
                      (candidate: ConversationOutput): boolean => candidate.id !== conversation.id,
                    );

                  patchState(store, {
                    openedConversationCallState: successCallState(conversation.id),
                    sessionDirectConversations: [...known, conversation],
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
            const known: ConversationOutput | undefined = store
              .conversations()
              .find(
                (conversation: ConversationOutput): boolean => conversation.id === conversationId,
              );

            if (known && known.unreadCount > 0) {
              replaceEverywhere({ ...known, unreadCount: 0 });
            }

            return service.markRead(conversationId).pipe(
              tapResponse({
                next: replaceEverywhere,
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

            replaceEverywhere({ ...conversation, isFavorite: favorite });

            return service.setFavorite(conversation.id, favorite).pipe(
              tapResponse({
                next: (updated: ConversationOutput | void) => {
                  if (updated) replaceEverywhere(updated);
                },
                error: () => replaceEverywhere(conversation),
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
