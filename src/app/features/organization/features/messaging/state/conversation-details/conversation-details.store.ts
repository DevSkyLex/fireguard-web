import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, forkJoin, map, of, pipe, switchMap } from 'rxjs';
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
  MessageAttachment,
  MessageOutput,
} from '@features/organization/features/messaging/models';

/**
 * What the details panel holds for one conversation.
 *
 * @since 1.0.0
 */
interface ConversationDetailsState {
  readonly conversationId: string | null;
  readonly detailsCallState: CallState<ConversationDetails>;
}

/**
 * The three collections the panel reads, fetched together.
 *
 * @since 1.0.0
 */
interface ConversationDetails {
  readonly pinned: readonly MessageOutput[];
  readonly attachments: readonly MessageAttachment[];
  readonly participants: readonly ChannelParticipant[];
}

const EMPTY_DETAILS: ConversationDetails = { pinned: [], attachments: [], participants: [] };

const INITIAL_STATE: ConversationDetailsState = {
  conversationId: null,
  detailsCallState: idleCallState(),
};

/**
 * Store ConversationDetailsStore
 * @const ConversationDetailsStore
 *
 * @description
 * Backs the conversation details panel: pinned messages, files and channel
 * participants for whichever conversation the URL currently opens.
 *
 * Keyed off the URL rather than off the messaging page's workspace store: the
 * panel is instantiated by the shell's panel host, in the layout's injector,
 * where a page-provided store is not reachable. The URL is the one source of
 * truth both surfaces already share.
 *
 * The three calls are fetched as one unit — the panel shows them as one
 * object, and three independent spinners in a 330px column would read as
 * breakage rather than progress.
 *
 * @version 1.0.0
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
    const load = rxMethod<{ readonly conversationId: string | null; readonly isChannel: boolean }>(
      pipe(
        switchMap((target) => {
          patchState(store, { conversationId: target.conversationId });

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
