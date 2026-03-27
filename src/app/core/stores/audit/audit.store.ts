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
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { AuditEventService } from '@core/services/api/audit';
import type { HydraCollection } from '@core/models/api';
import type { AuditEventListOptions, AuditEventOutput } from '@core/models/audit';
import {
  createErrorOperation,
  createIdleOperation,
  createLoadingOperation,
  createOperationErrorFromUnknown,
  createSuccessOperation,
  toOperationFailureEventPayload,
  type OperationError,
} from '../operations';
import { auditStoreEvents } from './audit.events';
import type { AuditState } from './audit-state.interface';

const INITIAL_AUDIT_STATE: AuditState = {
  totalAuditEvents: 0,
  activeFilters: null,
  listOperation: createIdleOperation(),
} as const;

export const AuditStore = signalStore(
  withEntities({ entity: type<AuditEventOutput>(), collection: 'auditEvent' }),
  withState<AuditState>(INITIAL_AUDIT_STATE),
  withComputed((store) => ({
    auditEvents: computed<ReadonlyArray<AuditEventOutput>>(() => store.auditEventEntities()),
    isLoading: computed<boolean>(() => store.listOperation().status === 'loading'),
    isEmpty: computed<boolean>(() =>
      store.auditEventIds().length === 0 && store.listOperation().status !== 'loading'),
    listError: computed<OperationError<unknown> | null>(() =>
      store.listOperation().status === 'error' ? store.listOperation().error : null),
  })),
  withMethods((
    store,
    dispatcher = inject<Dispatcher>(Dispatcher),
    auditEventService = inject<AuditEventService>(AuditEventService),
  ) => ({
    load: rxMethod<AuditEventListOptions | void>(
      pipe(
        tap((options) => {
          patchState(store, {
            activeFilters: options ?? store.activeFilters(),
            listOperation: createLoadingOperation(store.listOperation().data),
          });
        }),
        switchMap((options) =>
          auditEventService.list(options ?? store.activeFilters() ?? undefined).pipe(
            tapResponse({
              next: (response: HydraCollection<AuditEventOutput>) => {
                patchState(
                  store,
                  setAllEntities([...response.member], { collection: 'auditEvent' }),
                  {
                    totalAuditEvents: response.totalItems,
                    listOperation: {
                      ...createSuccessOperation(response.member),
                      total: response.totalItems,
                    },
                  },
                );
              },
              error: (error: unknown) => {
                const operationError = createOperationErrorFromUnknown(error);
                patchState(store, {
                  listOperation: createErrorOperation(operationError, store.listOperation().data),
                });
                dispatcher.dispatch(
                  auditStoreEvents.listFailed(
                    toOperationFailureEventPayload(operationError, 'Failed to load audit events'),
                  ),
                );
              },
            }),
          ),
        ),
      ),
    ),

    clear(): void {
      patchState(
        store,
        removeAllEntities({ collection: 'auditEvent' }),
        INITIAL_AUDIT_STATE,
      );
    },

    setFilters(filters: AuditEventListOptions | null): void {
      patchState(store, { activeFilters: filters });
    },
  })),
);

export type AuditStore = InstanceType<typeof AuditStore>;
