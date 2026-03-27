import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
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
import { UserService } from '@core/services/api/user';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import type { UpdateUserInput, UserInput, UserOutput } from '@core/models/user';
import type { PaginationOptions } from '@core/services/api';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createOperationErrorFromUnknown,
  createSuccessOperation,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import type { UsersState } from './users-state.interface';
import { usersStoreEvents } from './users.events';

const INITIAL_USERS_STATE: UsersState = {
  totalUsers: 0,
  isLoading: false,
  createOperation: createIdleOperation(),
  updateOperation: createIdleOperation(),
  deleteOperation: createIdleOperation(),
  statuses: [],
  statusesOperation: createIdleOperation(),
} as const;

export const UsersStore = signalStore(
  withEntities({ entity: type<UserOutput>(), collection: 'managedUser' }),
  withState<UsersState>(INITIAL_USERS_STATE),
  withComputed((store) => ({
    users: computed<ReadonlyArray<UserOutput>>(() => store.managedUserEntities()),
    isEmpty: computed<boolean>(() => store.managedUserIds().length === 0 && !store.isLoading()),
    isCreating: computed<boolean>(() => store.createOperation().status === 'loading'),
    isUpdating: computed<boolean>(() => store.updateOperation().status === 'loading'),
    isDeleting: computed<boolean>(() => store.deleteOperation().status === 'loading'),
    isLoadingStatuses: computed<boolean>(() => store.statusesOperation().status === 'loading'),
    createError: computed<OperationError<unknown> | null>(() =>
      store.createOperation().status === 'error' ? store.createOperation().error : null),
    updateError: computed<OperationError<unknown> | null>(() =>
      store.updateOperation().status === 'error' ? store.updateOperation().error : null),
  })),
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    userService = inject<UserService>(UserService),
  ) => ({
    load: rxMethod<PaginationOptions | void>(
      pipe(
        tap(() => patchState(store, { isLoading: true })),
        switchMap((options) =>
          userService.list(options ?? undefined).pipe(
            tapResponse({
              next: (response: HydraCollection<UserOutput>) => {
                patchState(
                  store,
                  setAllEntities([...response.member], { collection: 'managedUser' }),
                  { totalUsers: response.totalItems, isLoading: false },
                );
              },
              error: (error: unknown) => {
                patchState(store, { isLoading: false });
                const operationError = createOperationErrorFromUnknown(error);
                dispatcher.dispatch(
                  usersStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load users'),
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
        tap(() => {
          patchState(store, {
            createOperation: createLoadingOperation(store.createOperation().data),
          });
        }),
        exhaustMap((input) =>
          userService.create(input).pipe(
            tapResponse({
              next: (user: UserOutput) => {
                patchState(
                  store,
                  addEntity(user, { collection: 'managedUser' }),
                  {
                    totalUsers: store.totalUsers() + 1,
                    createOperation: createSuccessOperation(user),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError = createOperationErrorFromUnknown(error);
                patchState(store, {
                  createOperation: createErrorOperation(operationError, store.createOperation().data),
                });
                dispatcher.dispatch(
                  usersStoreEvents.createFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to create user'),
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
        tap(() => {
          patchState(store, {
            updateOperation: createLoadingOperation(store.updateOperation().data),
          });
        }),
        exhaustMap(({ id, input }) =>
          userService.update(id, input).pipe(
            tapResponse({
              next: (user: UserOutput) => {
                patchState(
                  store,
                  setEntity(user, { collection: 'managedUser' }),
                  { updateOperation: createSuccessOperation(user) },
                );
              },
              error: (error: unknown) => {
                const operationError = createOperationErrorFromUnknown(error);
                patchState(store, {
                  updateOperation: createErrorOperation(operationError, store.updateOperation().data),
                });
                dispatcher.dispatch(
                  usersStoreEvents.updateFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to update user'),
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
        tap(() => {
          patchState(store, {
            deleteOperation: createLoadingOperation(store.deleteOperation().data),
          });
        }),
        exhaustMap((id) =>
          userService.remove(id).pipe(
            tapResponse({
              next: () => {
                patchState(
                  store,
                  removeEntity(id, { collection: 'managedUser' }),
                  {
                    totalUsers: Math.max(0, store.totalUsers() - 1),
                    deleteOperation: createSuccessOperation(undefined as unknown as void),
                  },
                );
              },
              error: (error: unknown) => {
                const operationError = createOperationErrorFromUnknown(error);
                patchState(store, {
                  deleteOperation: createErrorOperation(operationError, store.deleteOperation().data),
                });
                dispatcher.dispatch(
                  usersStoreEvents.deleteFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to delete user'),
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
        tap(() => {
          patchState(store, {
            statusesOperation: createLoadingOperation(store.statusesOperation().data),
          });
        }),
        switchMap(() =>
          userService.listStatuses().pipe(
            tapResponse({
              next: (response: HydraCollection<OptionOutput>) => {
                patchState(store, {
                  statuses: [...response.member],
                  statusesOperation: {
                    ...createSuccessOperation(response.member),
                    total: response.totalItems,
                  },
                });
              },
              error: (error: unknown) => {
                const operationError = createOperationErrorFromUnknown(error);
                patchState(store, {
                  statusesOperation: createErrorOperation(
                    operationError,
                    store.statusesOperation().data,
                  ),
                });
                dispatcher.dispatch(
                  usersStoreEvents.statusesFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load user statuses'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),
  })),
);

export type UsersStore = InstanceType<typeof UsersStore>;
