import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, mergeMap, forkJoin, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { AutomationService } from '@features/organization/features/automations/data-access';
import type {
  AutomationAttemptOutput,
  AutomationPolicyOutput,
} from '@features/organization/features/automations/models';

/**
 * Constant AutomationExecutionsStore
 * @const AutomationExecutionsStore
 * @description Page-scoped history with explicit read/retry states and organization fencing.
 * @since 1.0.0
 */
export const AutomationExecutionsStore = signalStore(
  withEntities({ entity: type<AutomationAttemptOutput>(), collection: 'attempt' }),
  withState({
    organizationId: null as string | null,
    page: 1,
    total: 0,
    policy: null as AutomationPolicyOutput | null,
    listCallState: idleCallState(),
    retryCallState: idleCallState(),
  }),
  withComputed((store) => ({
    isLoading: computed(() => isCallPending(store.listCallState())),
    isRetrying: computed(() => isCallPending(store.retryCallState())),
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 20))),
  })),
  withMethods((store, api = inject(AutomationService)) => {
    let scopeRevision = 0;
    const load = rxMethod<{ organizationId: string | null; page: number }>(
      pipe(
        switchMap(({ organizationId, page }) => {
          const changed = organizationId !== store.organizationId();
          if (changed) ++scopeRevision;
          patchState(store, removeAllEntities({ collection: 'attempt' }), {
            organizationId,
            page,
            total: 0,
            listCallState: organizationId ? pendingCallState() : idleCallState(),
            ...(changed ? { policy: null, retryCallState: idleCallState() } : {}),
          });
          if (!organizationId) return EMPTY;
          return forkJoin({
            policy: api.policy(organizationId),
            list: api.list(organizationId, page),
          }).pipe(
            tapResponse({
              next: ({ policy, list }) =>
                patchState(store, setAllEntities([...list.member], { collection: 'attempt' }), {
                  policy,
                  total: list.totalItems ?? 0,
                  listCallState: successCallState(null),
                }),
              error: (error: unknown) =>
                patchState(store, { listCallState: errorCallState(toStoreError(error)) }),
            }),
          );
        }),
      ),
    );
    return {
      load,
      /**
       * Method refresh
       * @description Refreshes visible progress and clears a previously acknowledged retry error.
       * @access public
       * @since 1.0.0
       * @param {number} page - Requested history page.
       * @returns {void}
       */
      refresh(page: number): void {
        if (store.isRetrying()) return;
        patchState(store, { retryCallState: idleCallState() });
        load({ organizationId: store.organizationId(), page });
      },
      retry: rxMethod<AutomationAttemptOutput>(
        pipe(
          mergeMap((attempt) => {
            const organizationId = store.organizationId();
            if (
              !organizationId ||
              attempt.organizationId !== organizationId ||
              !attempt.canRetry ||
              !store.policy()?.canManage ||
              store.isLoading() ||
              store.isRetrying()
            )
              return EMPTY;
            const revision = scopeRevision;
            patchState(store, { retryCallState: pendingCallState() });
            return api.retry(organizationId, attempt).pipe(
              tapResponse({
                next: () => {
                  if (scopeRevision !== revision) return;
                  patchState(store, { retryCallState: successCallState(null) });
                  load({ organizationId, page: 1 });
                },
                error: (error: unknown) => {
                  if (scopeRevision !== revision) return;
                  patchState(store, { retryCallState: errorCallState(toStoreError(error)) });
                  load({ organizationId, page: store.page() });
                },
              }),
            );
          }),
        ),
      ),
    };
  }),
);

/**
 * Type AutomationExecutionsStoreType
 * @type {InstanceType<typeof AutomationExecutionsStore>}
 * @description Injectable execution history state.
 * @since 1.0.0
 */
export type AutomationExecutionsStoreType = InstanceType<typeof AutomationExecutionsStore>;
