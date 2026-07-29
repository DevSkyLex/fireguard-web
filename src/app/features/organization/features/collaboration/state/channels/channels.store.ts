import { computed } from '@angular/core';
import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { setAllEntities, updateEntity, removeEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { ChannelService } from '@features/organization/features/collaboration/data-access';
import type {
  ChannelOutput,
  CreateChannelInput,
  ListChannelsQuery,
  SetChannelParentInput,
  UpdateChannelInput,
} from '@features/organization/features/collaboration/models';
import { messageThreadStoreEvents } from '../message-thread/events';
import { channelsStoreEvents } from './events';
import type { ChannelsState } from './models';

const INITIAL_STATE: ChannelsState = {
  organizationId: null,
  includeArchived: null,
  total: 0,
  page: 1,
  listCallState: idleCallState(),
  detailCallState: idleCallState(),
  mutationCallState: idleCallState(),
  hierarchyCallState: idleCallState(),
};

/**
 * Constant ChannelsStore
 * @const ChannelsStore
 *
 * @description
 * Channel list and administration for one organization.
 *
 * Component-scoped: the sidebar and a channel-management page each want their
 * own paging and filters, and neither should disturb the other.
 *
 * Two contract hazards are handled here rather than left to callers:
 * rows are keyed off the scalar `id` because `@id` is a Skolem genid
 * regenerated on every response; and no write response is ever merged whole,
 * because the API returns fabricated derived fields on writes
 * (`unreadCount: 0`, `isFavorite: false`) that would overwrite good data.
 *
 * @since 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ChannelsStore = signalStore(
  withEntities({ entity: type<ChannelOutput>(), collection: 'channel' }),
  withState<ChannelsState>(INITIAL_STATE),

  withComputed((store) => ({
    isLoading: computed((): boolean => isCallPending(store.listCallState())),
    isMutating: computed((): boolean => isCallPending(store.mutationCallState())),
    isReorganizing: computed((): boolean => isCallPending(store.hierarchyCallState())),
    loadError: computed(() => store.listCallState().error),
    mutationError: computed(() => store.mutationCallState().error),

    /**
     * Root channels, in list order. Nesting is derived from the `parent` IRI
     * every row already carries, so building the tree costs no extra request.
     */
    rootChannels: computed((): readonly ChannelOutput[] =>
      store.channelEntities().filter((channel: ChannelOutput): boolean => !channel.parent),
    ),

    /** Unread total across the loaded channels, for the navigation badge. */
    unreadTotal: computed((): number =>
      store
        .channelEntities()
        .reduce((total: number, channel: ChannelOutput): number => total + channel.unreadCount, 0),
    ),
  })),

  withMethods((store, service = inject(ChannelService), dispatcher = inject(Dispatcher)) => ({
    /**
     * Loads one page of channels.
     */
    load: rxMethod<ListChannelsQuery>(
      pipe(
        tap((query: ListChannelsQuery) =>
          patchState(store, {
            organizationId: query.organization,
            includeArchived: query.isArchived ?? null,
            page: query.page ?? 1,
            listCallState: pendingCallState(),
          }),
        ),
        switchMap((query: ListChannelsQuery) =>
          service.list(query).pipe(
            tapResponse({
              next: (collection: HydraCollection<ChannelOutput>): void => {
                patchState(
                  store,
                  setAllEntities([...collection.member], { collection: 'channel' }),
                  { total: collection.totalItems, listCallState: successCallState(null) },
                );
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { listCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  channelsStoreEvents.loadFailed(
                    toStoreFailureEventPayload(storeError, 'Channels could not be loaded.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Reads one channel. This is the only endpoint that reports a real
     * `unreadCount` — the list provider hard-codes it to zero.
     */
    loadOne: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { detailCallState: pendingCallState() })),
        switchMap((channelId: string) =>
          service.get(channelId).pipe(
            tapResponse({
              next: (channel: ChannelOutput): void => {
                patchState(
                  store,
                  updateEntity({ id: channel.id, changes: channel }, { collection: 'channel' }),
                  { detailCallState: successCallState(channel) },
                );
              },
              error: (error: unknown): void =>
                patchState(store, { detailCallState: errorCallState(toStoreError(error)) }),
            }),
          ),
        ),
      ),
    ),

    /**
     * Creates a channel.
     *
     * The response is trusted here because the row is new: there is no better
     * local data for its derived fields to clobber.
     */
    create: rxMethod<CreateChannelInput>(
      pipe(
        tap(() => patchState(store, { mutationCallState: pendingCallState() })),
        switchMap((input: CreateChannelInput) =>
          service.create(input).pipe(
            tapResponse({
              next: (channel: ChannelOutput): void => {
                patchState(store, { mutationCallState: successCallState(null) });
                dispatcher.dispatch(channelsStoreEvents.created(channel));
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { mutationCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  channelsStoreEvents.mutationFailed(
                    toStoreFailureEventPayload(storeError, 'The channel could not be created.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Renames and/or archives a channel.
     *
     * Only the fields the caller asked to change are written back. Merging the
     * whole response would reset `unreadCount` to zero and `isFavorite` to
     * false, both of which the write endpoint fabricates.
     */
    update: rxMethod<{ readonly channelId: string; readonly input: UpdateChannelInput }>(
      pipe(
        tap(() => patchState(store, { mutationCallState: pendingCallState() })),
        switchMap(({ channelId, input }) =>
          service.update(channelId, input).pipe(
            tapResponse({
              next: (): void => {
                patchState(
                  store,
                  updateEntity({ id: channelId, changes: input }, { collection: 'channel' }),
                  { mutationCallState: successCallState(null) },
                );

                if (input.isArchived === true) {
                  dispatcher.dispatch(channelsStoreEvents.archived(channelId));
                }
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { mutationCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  channelsStoreEvents.mutationFailed(
                    toStoreFailureEventPayload(storeError, 'The channel could not be updated.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Deletes a channel. The `204` carries no body, so the row is dropped
     * locally — there is nothing to merge.
     */
    remove: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { mutationCallState: pendingCallState() })),
        switchMap((channelId: string) =>
          service.remove(channelId).pipe(
            tapResponse({
              next: (): void => {
                patchState(store, removeEntity(channelId, { collection: 'channel' }), {
                  mutationCallState: successCallState(null),
                  total: Math.max(0, store.total() - 1),
                });
                dispatcher.dispatch(channelsStoreEvents.deleted(channelId));
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { mutationCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  channelsStoreEvents.mutationFailed(
                    toStoreFailureEventPayload(storeError, 'The channel could not be deleted.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Nests a channel under another, or detaches it.
     *
     * Failures land on their own call state: a `409` here means the move would
     * create a cycle or exceed the allowed depth, which is worth telling the
     * member rather than reporting as a generic error.
     */
    setParent: rxMethod<{ readonly channelId: string; readonly input: SetChannelParentInput }>(
      pipe(
        tap(() => patchState(store, { hierarchyCallState: pendingCallState() })),
        switchMap(({ channelId, input }) =>
          service.setParent(channelId, input).pipe(
            tapResponse({
              next: (channel: ChannelOutput): void => {
                patchState(
                  store,
                  updateEntity(
                    { id: channelId, changes: { parent: channel.parent } },
                    { collection: 'channel' },
                  ),
                  { hierarchyCallState: successCallState(null) },
                );
              },
              error: (error: unknown): void => {
                const storeError = toStoreError(error);
                patchState(store, { hierarchyCallState: errorCallState(storeError) });
                dispatcher.dispatch(
                  channelsStoreEvents.hierarchyRejected(
                    toStoreFailureEventPayload(storeError, 'The channel could not be moved.'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    /**
     * Whether a channel is loaded and readable, used by callers before they
     * act on an id.
     */
    hasChannel(channelId: string): boolean {
      return Boolean(store.channelEntityMap()[channelId]);
    },

    /** Whether the last list request succeeded. */
    isLoaded(): boolean {
      return isCallSuccess(store.listCallState());
    },
  })),

  withHooks((store, events = inject(Events)) => ({
    onInit(): void {
      // Clear a channel's unread badge the moment its conversation is read,
      // without a refetch. A channel id is its conversation id, so the event's
      // payload keys straight into the collection.
      events
        .on(messageThreadStoreEvents.conversationRead)
        .pipe(takeUntilDestroyed())
        .subscribe(({ payload }): void => {
          if (store.channelEntityMap()[payload] === undefined) return;

          patchState(
            store,
            updateEntity({ id: payload, changes: { unreadCount: 0 } }, { collection: 'channel' }),
          );
        });
    },
  })),
);

/**
 * Type ChannelsStoreType
 *
 * @description
 * Injection type of {@link ChannelsStore}.
 *
 * @since 1.0.0
 */
export type ChannelsStoreType = InstanceType<typeof ChannelsStore>;
