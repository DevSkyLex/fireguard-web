import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import type { PaginationOptions } from '@core/services/hydra-api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/state/request-state';
import { UserService } from '@features/account/data-access';
import type { UpdateUserInput, UserInput, UserOutput } from '@features/account/models';
import type { UsersState } from './users-state.interface';
import { usersStoreEvents } from './users.events';

const INITIAL_USERS_STATE: UsersState = {
  totalUsers: 0,
  listCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  deleteCallState: idleCallState(),
  statuses: [],
  statusesCallState: idleCallState(),
} as const;

export const UsersStore = signalStore(
  withEntities({ entity: type<UserOutput>(), collection: 'managedUser' }),
  withState<UsersState>(INITIAL_USERS_STATE),
  withComputed((store) => ({
    users: computed<ReadonlyArray<UserOutput>>(() => store.managedUserEntities()),
    isEmpty: computed<boolean>(
      () => store.managedUserIds().length === 0 && store.listCallState().status !== 'pending',
    ),
    isCreating: computed<boolean>(() => store.createCallState().status === 'pending'),
    isUpdating: computed<boolean>(() => store.updateCallState().status === 'pending'),
    isDeleting: computed<boolean>(() => store.deleteCallState().status === 'pending'),
    isLoadingStatuses: computed<boolean>(() => store.statusesCallState().status === 'pending'),
    createError: computed<StoreError | null>(() =>
      store.createCallState().status === 'error' ? store.createCallState().error : null,
    ),
    updateError: computed<StoreError | null>(() =>
      store.updateCallState().status === 'error' ? store.updateCallState().error : null,
    ),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      userService = inject<UserService>(UserService),
    ) => ({
      load: rxMethod<PaginationOptions | void>(
        pipe(
          tap(() => patchState(store, { listCallState: pendingCallState() })),
          switchMap((options) =>
            userService.list(options ?? undefined).pipe(
              tapResponse({
                next: (response: HydraCollection<UserOutput>) => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'managedUser' }),
                    { totalUsers: response.totalItems, listCallState: successCallState(null) },
                  );
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    usersStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load users'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      create: rxMethod<UserInput>(
        pipe(
          tap(() => patchState(store, { createCallState: pendingCallState() })),
          exhaustMap((input) =>
            userService.create(input).pipe(
              tapResponse({
                next: (user: UserOutput) => {
                  patchState(store, addEntity(user, { collection: 'managedUser' }), {
                    totalUsers: store.totalUsers() + 1,
                    createCallState: successCallState(user),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { createCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    usersStoreEvents.createFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to create user'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      update: rxMethod<{ id: string; input: UpdateUserInput }>(
        pipe(
          tap(() => patchState(store, { updateCallState: pendingCallState() })),
          exhaustMap(({ id, input }) =>
            userService.update(id, input).pipe(
              tapResponse({
                next: (user: UserOutput) => {
                  patchState(store, setEntity(user, { collection: 'managedUser' }), {
                    updateCallState: successCallState(user),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { updateCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    usersStoreEvents.updateFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to update user'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      deleteOne: rxMethod<string>(
        pipe(
          tap(() => patchState(store, { deleteCallState: pendingCallState() })),
          exhaustMap((id) =>
            userService.remove(id).pipe(
              tapResponse({
                next: () => {
                  patchState(store, removeEntity(id, { collection: 'managedUser' }), {
                    totalUsers: Math.max(0, store.totalUsers() - 1),
                    deleteCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { deleteCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    usersStoreEvents.deleteFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to delete user'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      loadStatuses: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { statusesCallState: pendingCallState() })),
          switchMap(() =>
            userService.listStatuses().pipe(
              tapResponse({
                next: (response: HydraCollection<OptionOutput>) => {
                  patchState(store, {
                    statuses: [...response.member],
                    statusesCallState: successCallState(null),
                  });
                },
                error: (error: unknown) => {
                  const storeError = toStoreError(error);
                  patchState(store, { statusesCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    usersStoreEvents.statusesFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load user statuses'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

export type UsersStore = InstanceType<typeof UsersStore>;
