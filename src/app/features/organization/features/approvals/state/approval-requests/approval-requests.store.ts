import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection, RequestOptions } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallSuccess,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { ApprovalRequestService } from '@features/organization/features/approvals/data-access';
import type {
  ApprovalActionTypeOutput,
  ApprovalRequestListQuery,
  ApprovalRequestOutput,
  DecideApprovalRequestInput,
} from '@features/organization/features/approvals/models';
import { approvalRequestsStoreEvents } from './events';
import type { ApprovalRequestsState } from './models';
import { decideErrorMessage } from './utils/decide-error-message/decide-error-message.utils';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seeds the auxiliary state managed in {@link ApprovalRequestsState}. Entity
 * state is initialised by `withEntities`.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: ApprovalRequestsState = {
  listCallState: idleCallState(),
  totalRequests: 0,
  decideCallState: idleCallState(),
  actionTypesCallState: idleCallState(),
};

/**
 * Interface DecideParams
 * @description Parameters shared by {@link ApprovalRequestsStore.approve} and {@link ApprovalRequestsStore.reject}.
 */
interface DecideParams {
  readonly organizationId: string;
  readonly requestId: string;
  readonly note?: string;
}

/**
 * Store ApprovalRequestsStore
 * @const ApprovalRequestsStore
 *
 * @description
 * Component-scoped NgRx SignalStore for one organization's four-eyes
 * approvals inbox: the paginated, filterable request list, deciding
 * (approve/reject) on one request, and the action-type catalog. Provided at
 * the page level — a fresh instance per route visit, like
 * `MaintenanceSchedulesStore`.
 *
 * Entity state is `withEntities<ApprovalRequestOutput>({ collection: 'request' })`,
 * so a successful decision replaces exactly the decided row (`setEntity`)
 * from the server's full recomputed response — never a refetch of the whole
 * list. A decide failure leaves the row untouched; the page is responsible
 * for calling {@link refresh} to re-read the row after a 409, since the
 * server may have moved it out from under the reader (already decided, or
 * cancelled because its subject changed).
 *
 * @example
 * ```typescript
 * @Component({ providers: [ApprovalRequestsStore] })
 * export class ApprovalsPage {
 *   protected readonly store = inject(ApprovalRequestsStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ApprovalRequestsStore = signalStore(
  withEntities({ entity: type<ApprovalRequestOutput>(), collection: 'request' }),

  withState<ApprovalRequestsState>(INITIAL_STATE),

  withComputed((store) => ({
    /** All cached requests from the entity collection, in insertion order. */
    requests: computed<ReadonlyArray<ApprovalRequestOutput>>(() => store.requestEntities()),

    /** True while the list is loading. */
    isLoading: computed<boolean>(() => store.listCallState().status === 'pending'),

    /** True when the collection is empty and no list request is in flight. */
    isEmpty: computed<boolean>(
      () => store.requestIds().length === 0 && store.listCallState().status !== 'pending',
    ),

    /** True when the last list request failed. */
    hasListError: computed<boolean>(() => store.listCallState().status === 'error'),

    /** True while a decision (approve or reject) is in flight. */
    isDeciding: computed<boolean>(() => store.decideCallState().status === 'pending'),

    /** Specific, actionable copy for the last decision failure, or `null`. */
    decideErrorText: computed<string | null>(() => {
      const error: StoreError | null = store.decideCallState().error;
      return error ? decideErrorMessage(error) : null;
    }),

    /** The action-type catalog, once loaded. */
    actionTypes: computed<ReadonlyArray<ApprovalActionTypeOutput>>(() => {
      const state = store.actionTypesCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
  })),

  withMethods(
    (
      store,
      approvalRequestService: ApprovalRequestService = inject(ApprovalRequestService),
      dispatcher: Dispatcher = inject(Dispatcher),
    ) => ({
      /**
       * Method load
       * @method load
       *
       * @description
       * Fetches one page of requests. `switchMap` cancels any in-flight
       * request, so a fast filter change never races an older response.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<{ organizationId: string; options?: RequestOptions; query?: ApprovalRequestListQuery }>}
       */
      load: rxMethod<{
        organizationId: string;
        options?: RequestOptions;
        query?: ApprovalRequestListQuery;
      }>(
        pipe(
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap(({ organizationId, options, query }) =>
            approvalRequestService.list(organizationId, options, query).pipe(
              tapResponse({
                next: (response: HydraCollection<ApprovalRequestOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'request' }),
                    {
                      totalRequests: response.totalItems,
                      listCallState: successCallState(null),
                    },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    approvalRequestsStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load approval requests'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method refresh
       * @method refresh
       *
       * @description
       * Re-reads one request and replaces its cached row — called after a
       * 409 decide failure, since the server has moved the request out from
       * under the reader (already decided by someone else, or cancelled
       * because its subject changed).
       *
       * @since 1.0.0
       *
       * @param {string} organizationId - The owning organization.
       * @param {string} requestId - The request to re-read.
       *
       * @returns {void}
       */
      refresh(organizationId: string, requestId: string): void {
        approvalRequestService.get(organizationId, requestId).subscribe((request) => {
          patchState(store, setEntity(request, { collection: 'request' }));
        });
      },

      /**
       * Method approve
       * @method approve
       *
       * @description
       * Approves a pending request — a successful call means the gated
       * action has already executed synchronously server-side.
       * `exhaustMap` prevents a concurrent submission.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<DecideParams>}
       */
      approve: rxMethod<DecideParams>(
        pipe(
          tap((): void => {
            patchState(store, { decideCallState: pendingCallState() });
          }),
          exhaustMap(({ organizationId, requestId, note }) => {
            const input: DecideApprovalRequestInput | undefined = note
              ? { decisionNote: note }
              : undefined;

            return approvalRequestService.approve(organizationId, requestId, input).pipe(
              tapResponse({
                next: (request: ApprovalRequestOutput): void => {
                  patchState(store, setEntity(request, { collection: 'request' }), {
                    decideCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  patchState(store, { decideCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method reject
       * @method reject
       *
       * @description
       * Rejects a pending request; the deferred action is never executed.
       * `exhaustMap` prevents a concurrent submission.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<DecideParams>}
       */
      reject: rxMethod<DecideParams>(
        pipe(
          tap((): void => {
            patchState(store, { decideCallState: pendingCallState() });
          }),
          exhaustMap(({ organizationId, requestId, note }) => {
            const input: DecideApprovalRequestInput | undefined = note
              ? { decisionNote: note }
              : undefined;

            return approvalRequestService.reject(organizationId, requestId, input).pipe(
              tapResponse({
                next: (request: ApprovalRequestOutput): void => {
                  patchState(store, setEntity(request, { collection: 'request' }), {
                    decideCallState: successCallState(null),
                  });
                },
                error: (error: unknown): void => {
                  patchState(store, { decideCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method loadActionTypes
       * @method loadActionTypes
       *
       * @description
       * Fetches the regulated action-type catalog, once — the page's status
       * filter chips and action-type select both read it.
       *
       * @since 1.0.0
       *
       * @type {RxMethod<void>}
       */
      loadActionTypes: rxMethod<void>(
        pipe(
          tap((): void => {
            patchState(store, { actionTypesCallState: pendingCallState() });
          }),
          switchMap(() =>
            approvalRequestService.listActionTypes().pipe(
              tapResponse({
                next: (response: HydraCollection<ApprovalActionTypeOutput>): void => {
                  patchState(store, { actionTypesCallState: successCallState(response.member) });
                },
                error: (error: unknown): void => {
                  patchState(store, {
                    actionTypesCallState: errorCallState(toStoreError(error)),
                  });
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method resetDecideOperation
       * @description Resets the decide operation back to idle, for the dialog's close/reopen.
       * @access public
       * @since 1.0.0
       * @returns {void}
       */
      resetDecideOperation(): void {
        patchState(store, { decideCallState: idleCallState() });
      },
    }),
  ),
);

/**
 * Type ApprovalRequestsStoreType
 * @type ApprovalRequestsStoreType
 *
 * @description Instance type of the {@link ApprovalRequestsStore} signal store.
 * @since 1.0.0
 */
export type ApprovalRequestsStoreType = InstanceType<typeof ApprovalRequestsStore>;
