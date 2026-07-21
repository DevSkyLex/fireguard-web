import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, catchError, forkJoin, map, of, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { MessagingService } from '@features/organization/features/messaging/data-access';
import type {
  ChannelParticipant,
  ConversationActivityBucket,
  ConversationLinkOutput,
  MessageAttachment,
  MessageOutput,
  PresenceOutput,
} from '@features/organization/features/messaging/models';

/**
 * What the details panel holds for one conversation.
 *
 * @since 1.0.0
 */
interface ConversationDetailsState {
  readonly conversationId: string | null;
  readonly detailsCallState: CallState<ConversationDetails>;

  /**
   * Members the presence endpoint reported online, as ids.
   *
   * Not a `CallState`: presence is ambient. A failed read means "we do not
   * know", which renders exactly like "nobody is online" and is not worth a
   * spinner or an error row in a 330px column.
   */
  readonly onlineMemberIds: readonly string[];

  /**
   * The Links tab's own call, kept out of {@link ConversationDetails} because
   * it is paged: the tab appends page after page while the rest of the panel
   * is fetched once. Its failure degrades the tab alone, per the panel's
   * per-section rule.
   */
  readonly linksCallState: CallState<readonly ConversationLinkOutput[]>;
  readonly linksPage: number;
  readonly linksTotal: number;
}

/**
 * The collections the panel reads, fetched together.
 *
 * @since 1.0.0
 */
interface ConversationDetails {
  readonly pinned: readonly MessageOutput[];
  readonly attachments: readonly MessageAttachment[];
  readonly participants: readonly ChannelParticipant[];

  /**
   * Daily message counts backing the Info tab's heatmap, oldest first. Falls
   * back to an empty list on failure rather than failing the panel: a missing
   * heatmap hides one widget, a failed forkJoin would blank the members too.
   */
  readonly activity: readonly ConversationActivityBucket[];
}

/**
 * How many trailing days the heatmap asks for — the panel renders 26 cells.
 */
const ACTIVITY_BUCKETS: number = 26;

const EMPTY_DETAILS: ConversationDetails = {
  pinned: [],
  attachments: [],
  participants: [],
  activity: [],
};

const INITIAL_STATE: ConversationDetailsState = {
  conversationId: null,
  detailsCallState: idleCallState(),
  onlineMemberIds: [],
  linksCallState: idleCallState(),
  linksPage: 1,
  linksTotal: 0,
};

/**
 * Store ConversationDetailsStore
 * @const ConversationDetailsStore
 *
 * @description
 * Backs the conversation details panel: pinned messages, files, channel
 * participants, the activity heatmap and the paged link list, for whichever
 * conversation the URL currently opens.
 *
 * Keyed off the URL rather than off the messaging page's workspace store: the
 * panel is instantiated by the shell's panel host, in the layout's injector,
 * where a page-provided store is not reachable. The URL is the one source of
 * truth both surfaces already share.
 *
 * The single-shot calls are fetched as one unit — the panel shows them as one
 * object, and three independent spinners in a 330px column would read as
 * breakage rather than progress. The links are the exception: they page.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ConversationDetailsStore = signalStore(
  //#region State
  withState<ConversationDetailsState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed pinnedMessages
     *
     * @type {Signal<readonly MessageOutput[]>}
     */
    pinnedMessages: computed<readonly MessageOutput[]>(
      () => (store.detailsCallState().data ?? EMPTY_DETAILS).pinned,
    ),

    /**
     * Computed attachments
     *
     * @description
     * Every file shared in the conversation, newest first — the panel's Files
     * tab, distinct from the per-message chips in the thread.
     *
     * @type {Signal<readonly MessageAttachment[]>}
     */
    attachments: computed<readonly MessageAttachment[]>(() =>
      (store.detailsCallState().data ?? EMPTY_DETAILS).attachments.toSorted(
        (left: MessageAttachment, right: MessageAttachment): number =>
          right.uploadedAt.localeCompare(left.uploadedAt),
      ),
    ),

    /**
     * Computed participants
     *
     * @type {Signal<readonly ChannelParticipant[]>}
     */
    participants: computed<readonly ChannelParticipant[]>(
      () => (store.detailsCallState().data ?? EMPTY_DETAILS).participants,
    ),

    /**
     * Computed activity
     *
     * @description
     * The conversation's daily message counts, oldest first, ending today.
     * Empty when the read failed — the heatmap then simply does not render.
     *
     * @type {Signal<readonly ConversationActivityBucket[]>}
     */
    activity: computed<readonly ConversationActivityBucket[]>(
      () => (store.detailsCallState().data ?? EMPTY_DETAILS).activity,
    ),

    /**
     * Computed links
     *
     * @description
     * The URLs shared in the conversation, newest first, accumulated across
     * the pages loaded so far.
     *
     * @type {Signal<readonly ConversationLinkOutput[]>}
     */
    links: computed<readonly ConversationLinkOutput[]>(() => store.linksCallState().data ?? []),

    /**
     * Computed isLoadingLinks
     *
     * @type {Signal<boolean>}
     */
    isLoadingLinks: computed<boolean>(() => isCallPending(store.linksCallState())),

    /**
     * Computed hasLinksError
     *
     * @type {Signal<boolean>}
     */
    hasLinksError: computed<boolean>(() => isCallError(store.linksCallState())),

    /**
     * Computed hasMoreLinks
     *
     * @description
     * Whether the backend holds links beyond the pages already loaded.
     *
     * @type {Signal<boolean>}
     */
    hasMoreLinks: computed<boolean>(
      () => (store.linksCallState().data ?? []).length < store.linksTotal(),
    ),

    /**
     * Computed isLoading
     *
     * @type {Signal<boolean>}
     */
    isLoading: computed<boolean>(() => isCallPending(store.detailsCallState())),

    /**
     * Computed hasError
     *
     * @type {Signal<boolean>}
     */
    hasError: computed<boolean>(() => isCallError(store.detailsCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(MessagingService)) => {
    const loadLinksPage = rxMethod<{
      readonly conversationId: string | null;
      readonly page: number;
    }>(
      pipe(
        switchMap((target) => {
          if (target.conversationId === null) {
            patchState(store, { linksCallState: idleCallState(), linksPage: 1, linksTotal: 0 });
            return EMPTY;
          }

          // Page 1 replaces, later pages append: the tab is a growing list, but
          // reopening a conversation must not stack its links onto the previous
          // one's.
          const known: readonly ConversationLinkOutput[] =
            target.page === 1 ? [] : (store.linksCallState().data ?? []);

          patchState(store, { linksCallState: pendingCallState(known) });

          return service.listConversationLinks(target.conversationId, target.page).pipe(
            tapResponse({
              next: (collection: HydraCollection<ConversationLinkOutput>) => {
                const seen: ReadonlySet<string> = new Set(
                  known.map((link: ConversationLinkOutput): string => link.id),
                );

                patchState(store, {
                  linksCallState: successCallState([
                    ...known,
                    ...collection.member.filter(
                      (link: ConversationLinkOutput): boolean => !seen.has(link.id),
                    ),
                  ]),
                  linksPage: target.page,
                  linksTotal: collection.totalItems,
                });
              },
              error: (error: unknown) =>
                patchState(store, {
                  linksCallState: errorCallState(toStoreError(error), known),
                }),
            }),
          );
        }),
      ),
    );

    const load = rxMethod<{ readonly conversationId: string | null; readonly isChannel: boolean }>(
      pipe(
        switchMap((target) => {
          patchState(store, { conversationId: target.conversationId });

          // Presence belongs to the conversation that was open, not to the one
          // arriving: keeping it would paint the new channel's members online
          // until their own read lands.
          patchState(store, { onlineMemberIds: [] });

          // The Links tab loads on the same trigger, but as its own call: it
          // pages, and a link failure must not blank the members.
          loadLinksPage({ conversationId: target.conversationId, page: 1 });

          if (target.conversationId === null) {
            patchState(store, { detailsCallState: idleCallState() });
            return EMPTY;
          }

          patchState(store, { detailsCallState: pendingCallState() });

          return forkJoin({
            pinned: service
              .listPinnedMessages(target.conversationId)
              .pipe(map((collection: HydraCollection<MessageOutput>) => collection.member)),
            attachments: service
              .listAttachments(target.conversationId)
              .pipe(map((collection: HydraCollection<MessageAttachment>) => collection.member)),
            // The heatmap is an enrichment, not a fact the panel is about:
            // failing it here would take the members down with it.
            activity: service.getConversationActivity(target.conversationId, ACTIVITY_BUCKETS).pipe(
              map((collection: HydraCollection<ConversationActivityBucket>) => collection.member),
              catchError(() => of<readonly ConversationActivityBucket[]>([])),
            ),
            // Only channels have a participant collection; asking for a direct
            // conversation's would 404, so it resolves to an empty list here
            // rather than a faked Hydra envelope.
            participants: target.isChannel
              ? service
                  .listParticipants(target.conversationId)
                  .pipe(map((collection: HydraCollection<ChannelParticipant>) => collection.member))
              : of<readonly ChannelParticipant[]>([]),
          }).pipe(
            tapResponse({
              next: (result: ConversationDetails) =>
                patchState(store, { detailsCallState: successCallState(result) }),
              error: (error: unknown) =>
                patchState(store, { detailsCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    );

    return {
      load,

      /**
       * Method loadMoreLinks
       *
       * @description
       * Appends the next page of links. A no-op while a page is in flight or
       * once everything is loaded, so a double click cannot skip a page.
       *
       * @returns {void}
       */
      loadMoreLinks(): void {
        const loaded: number = (store.linksCallState().data ?? []).length;

        if (isCallPending(store.linksCallState()) || loaded >= store.linksTotal()) return;

        loadLinksPage({ conversationId: store.conversationId(), page: store.linksPage() + 1 });
      },

      /**
       * Method loadPresence
       *
       * @description
       * Reads which of the given members are online. The endpoint has no
       * "list everyone online" mode, so the caller passes the ids it cares
       * about — here, the participants that just loaded.
       *
       * Errors are swallowed on purpose: an unknown presence renders as
       * offline, which is the safe reading, and a failed ambient read is not
       * an event the user acts on.
       *
       * @param {{ organization: string; memberIds: readonly string[] }} request - Organization IRI and members to check.
       *
       * @returns {void}
       */
      loadPresence: rxMethod<{
        readonly organization: string;
        readonly memberIds: readonly string[];
      }>(
        pipe(
          switchMap((request) => {
            if (request.memberIds.length === 0) {
              patchState(store, { onlineMemberIds: [] });
              return EMPTY;
            }

            return service.getPresence(request.organization, request.memberIds).pipe(
              tapResponse({
                next: (collection: HydraCollection<PresenceOutput>) =>
                  patchState(store, {
                    onlineMemberIds: collection.member
                      .filter((presence: PresenceOutput): boolean => presence.online)
                      .map((presence: PresenceOutput): string => presence.memberId),
                  }),
                error: (): void => undefined,
              }),
            );
          }),
        ),
      ),

      /**
       * Method reload
       *
       * @description
       * Re-fetches the open conversation's details — the panel's retry path.
       *
       * @param {boolean} isChannel - Whether the open conversation is a channel.
       *
       * @returns {void}
       */
      reload(isChannel: boolean): void {
        load({ conversationId: store.conversationId(), isChannel });
      },
    };
  }),
  //#endregion
);

/**
 * Type ConversationDetailsStoreType
 *
 * @description
 * Injectable instance type of {@link ConversationDetailsStore}.
 */
export type ConversationDetailsStoreType = InstanceType<typeof ConversationDetailsStore>;
