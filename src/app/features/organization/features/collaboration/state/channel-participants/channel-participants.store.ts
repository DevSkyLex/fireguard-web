import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { ChannelService } from '@features/organization/features/collaboration/data-access';
import type {
  AddChannelParticipantInput,
  ChannelParticipantOutput,
} from '@features/organization/features/collaboration/models';
import { channelParticipantsStoreEvents } from './events';
import type { ChannelParticipantsState } from './models';

const INITIAL_STATE: ChannelParticipantsState = {
  channelId: null,
  listCallState: idleCallState(),
  mutationCallState: idleCallState(),
};

/**
 * Constant ChannelParticipantsStore
 * @const ChannelParticipantsStore
 *
 * @description
 * One channel's roster, for the participants sheet's own add/remove flow.
 *
 * `ChannelPanelStore` already reads a channel's participants for the info
 * panel, but does not expose add or remove — it is root-provided and reads
 * the routed channel for a read-only surface. This slice exists because that
 * one has no mutation surface to extend without widening a store the panel
 * does not need widened; the roster itself is loaded the same way, a plain
 * `CallState` rather than an entity collection, since nothing here is looked
 * up by id outside the list.
 *
 * Component-scoped: provided by `ChannelConversationPage` alongside
 * `MessageThreadStore`, and reset the same way — the router reuses the page
 * when only `:channelId` changes, so `load` is the caller's job on every
 * channel change rather than something this store infers on its own.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ChannelParticipantsStore = signalStore(
  withState<ChannelParticipantsState>(INITIAL_STATE),

  withComputed((store) => ({
    participants: computed(
      (): readonly ChannelParticipantOutput[] => store.listCallState().data ?? [],
    ),
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isMutating: computed((): boolean => isCallPending(store.mutationCallState())),
    loadError: computed(() => store.listCallState().error),
  })),

  withMethods((store, service = inject(ChannelService), dispatcher = inject(Dispatcher)) => {
    const load = rxMethod<string>(
      pipe(
        tap((channelId: string) =>
          patchState(store, { channelId, listCallState: pendingCallState() }),
        ),
        switchMap((channelId: string) =>
          service.listParticipants(channelId).pipe(
            tapResponse({
              next: (collection: HydraCollection<ChannelParticipantOutput>): void =>
                patchState(store, { listCallState: successCallState([...collection.member]) }),
              error: (error: unknown): void =>
                patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    );

    return {
      load,

      /**
       * Adds a member, then re-reads the roster.
       *
       * A re-add answers `201` built from the request rather than from
       * storage, so its `role`/`addedAt` may not be what is actually stored
       * — refetching is the only way to show the roster as it truly is.
       */
      add: rxMethod<{ readonly channelId: string; readonly input: AddChannelParticipantInput }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          switchMap(({ channelId, input }) =>
            service.addParticipant(channelId, input).pipe(
              tapResponse({
                next: (): void => {
                  patchState(store, { mutationCallState: successCallState(null) });
                  load(channelId);
                },
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { mutationCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    channelParticipantsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, 'The member could not be added.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Removes a member. The `204` carries no body, so the row is dropped
       * from the loaded roster locally rather than refetched.
       */
      remove: rxMethod<{ readonly channelId: string; readonly memberId: string }>(
        pipe(
          tap(() => patchState(store, { mutationCallState: pendingCallState() })),
          switchMap(({ channelId, memberId }) =>
            service.removeParticipant(channelId, memberId).pipe(
              tapResponse({
                next: (): void =>
                  patchState(store, {
                    listCallState: successCallState(
                      store
                        .participants()
                        .filter(
                          (participant: ChannelParticipantOutput): boolean =>
                            participant.memberId !== memberId,
                        ),
                    ),
                    mutationCallState: successCallState(null),
                  }),
                error: (error: unknown): void => {
                  const storeError = toStoreError(error);
                  patchState(store, { mutationCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    channelParticipantsStoreEvents.mutationFailed(
                      toStoreFailureEventPayload(storeError, 'The member could not be removed.'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Empties the roster so another channel can be loaded into it.
       *
       * Required rather than inferred, for the same reason
       * `MessageThreadStore.reset` is: the router reuses the page component
       * across a channel-id change, so this instance can outlive the channel
       * it was built for.
       */
      reset(): void {
        patchState(store, INITIAL_STATE);
      },
    };
  }),
);

/**
 * Type ChannelParticipantsStoreType
 *
 * @description
 * Injection type of {@link ChannelParticipantsStore}.
 *
 * @since 1.0.0
 */
export type ChannelParticipantsStoreType = InstanceType<typeof ChannelParticipantsStore>;
