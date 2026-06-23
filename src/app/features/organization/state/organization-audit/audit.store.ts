import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
} from '@core/request-state';
import { AuditEventService } from '@features/organization/data-access';
import type { AuditEventListOptions, AuditEventOutput } from '@features/organization/models';
import { auditStoreEvents } from './events';
import type { AuditState } from './models';

const INITIAL_AUDIT_STATE: AuditState = {
  totalAuditEvents: 0,
  activeFilters: null,
  listCallState: idleCallState(),
} as const;

export const AuditStore = signalStore(
  withEntities({ entity: type<AuditEventOutput>(), collection: 'auditEvent' }),
  withState<AuditState>(INITIAL_AUDIT_STATE),
  withComputed((store) => ({
    auditEvents: computed<ReadonlyArray<AuditEventOutput>>(() => store.auditEventEntities()),
    isLoading: computed<boolean>(() => store.listCallState().status === 'pending'),
    isEmpty: computed<boolean>(
      () => store.auditEventIds().length === 0 && store.listCallState().status !== 'pending',
    ),
    listError: computed<StoreError | null>(() => store.listCallState().error),
  })),
  withMethods(
    (
      store,
      dispatcher = inject<Dispatcher>(Dispatcher),
      auditEventService = inject<AuditEventService>(AuditEventService),
    ) => ({
      load: rxMethod<AuditEventListOptions | void>(
        pipe(
          tap((options) => {
            patchState(store, {
              activeFilters: options ?? store.activeFilters(),
              listCallState: pendingCallState(),
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
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    listCallState: errorCallState(storeError),
                  });
                  dispatcher.dispatch(
                    auditStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load audit events'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      clear(): void {
        patchState(store, removeAllEntities({ collection: 'auditEvent' }), INITIAL_AUDIT_STATE);
      },

      setFilters(filters: AuditEventListOptions | null): void {
        patchState(store, { activeFilters: filters });
      },
    }),
  ),
);

export type AuditStore = InstanceType<typeof AuditStore>;
