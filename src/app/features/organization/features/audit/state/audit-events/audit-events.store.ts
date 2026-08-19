import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { AuditEventService } from '@features/organization/features/audit/data-access';
import type {
  AuditEventListQuery,
  AuditEventOutput,
} from '@features/organization/features/audit/models';
import type { AuditEventsState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seeds the auxiliary state managed in {@link AuditEventsState}. Entity
 * state is initialised by `withEntities`.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: AuditEventsState = {
  listCallState: idleCallState(),
  totalEvents: 0,
};

/**
 * Store AuditEventsStore
 * @const AuditEventsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for one organization's audit journal: a
 * single, read-only, filterable and server-paginated event list — the
 * backend exposes no mutation and no single-event read on this collection.
 * Entity state is `withEntities<AuditEventOutput>({ collection: 'event' })`,
 * matching every other read-only inbox in this feature group
 * (`ApprovalRequestsStore`, `ImportJobsStore`); `load`'s `switchMap` cancels
 * an in-flight request so a fast filter change never races an older
 * response.
 *
 * @example
 * ```typescript
 * @Component({ providers: [AuditEventsStore] })
 * export class AuditPage {
 *   protected readonly store = inject(AuditEventsStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const AuditEventsStore = signalStore(
  withEntities({ entity: type<AuditEventOutput>(), collection: 'event' }),

  withState<AuditEventsState>(INITIAL_STATE),

  withComputed((store) => ({
    /** All cached events from the entity collection, in server (newest-first) order. */
    events: computed<ReadonlyArray<AuditEventOutput>>(() => store.eventEntities()),

    /** True while the list is loading. */
    isLoading: computed<boolean>(() => isCallPending(store.listCallState())),

    /** True when the collection is empty and no list request is in flight. */
    isEmpty: computed<boolean>(
      () => store.eventIds().length === 0 && !isCallPending(store.listCallState()),
    ),

    /** True when the last list request failed. */
    hasListError: computed<boolean>(() => store.listCallState().status === 'error'),

    /** True when the last list request failed with a 403 — a permission denial, not a generic failure. */
    isForbidden: computed<boolean>(() => store.listCallState().error?.code === 403),
  })),

  withMethods((store, service: AuditEventService = inject(AuditEventService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Fetches one page of audit events. `switchMap` cancels any in-flight
     * request, so a fast filter or page change never races an older
     * response.
     *
     * @since 1.0.0
     *
     * @type {RxMethod<{ organizationId: string; options?: RequestOptions; query?: AuditEventListQuery }>}
     */
    load: rxMethod<{
      organizationId: string;
      options?: RequestOptions;
      query?: AuditEventListQuery;
    }>(
      pipe(
        tap((): void => {
          patchState(store, { listCallState: pendingCallState() });
        }),
        switchMap(({ organizationId, options, query }) =>
          service.list(organizationId, options, query).pipe(
            tapResponse({
              next: (response: HydraCollection<AuditEventOutput>): void => {
                patchState(store, setAllEntities([...response.member], { collection: 'event' }), {
                  totalEvents: response.totalItems,
                  listCallState: successCallState(null),
                });
              },
              error: (error: unknown): void => {
                patchState(store, { listCallState: errorCallState(toStoreError(error)) });
              },
            }),
          ),
        ),
      ),
    ),
  })),
);

/**
 * Type AuditEventsStoreType
 * @type AuditEventsStoreType
 *
 * @description Instance type of the {@link AuditEventsStore} signal store.
 * @since 1.0.0
 */
export type AuditEventsStoreType = InstanceType<typeof AuditEventsStore>;
