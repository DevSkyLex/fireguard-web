import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  withEntities,
  setAllEntities,
  setEntity,
  removeEntity,
  removeAllEntities,
} from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, switchMap, pipe, finalize } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
} from '@core/request-state';
import { OrganizationAccessService } from '@features/organization/data-access';
import type {
  OrganizationAccessPolicyInput,
  OrganizationAccessPolicyOutput,
  OrganizationDomainOutput,
  OrganizationJoinRequestOutput,
} from '@features/organization/models';
import { organizationAccessErrorMessage } from '@features/organization/utils';
import { organizationAccessAdminEvents } from './organization-access-admin.events';

/**
 * Store OrganizationAccessAdminStore
 * @const OrganizationAccessAdminStore
 * @description Page-scoped admission settings and request commands. Writes exhaust duplicate submissions, replace obsolete command feedback and invalidate older reads. Scope revisions prevent responses from a previous organization visit from replacing current entities.
 * @since 1.0.0
 */
export const OrganizationAccessAdminStore = signalStore(
  withEntities({ entity: type<OrganizationDomainOutput>(), collection: 'domain' }),
  withEntities({ entity: type<OrganizationJoinRequestOutput>(), collection: 'request' }),
  withState({
    organizationId: null as string | null,
    scopeRevision: 0,
    policyRevision: 0,
    policyFormRevision: 0,
    requestsRevision: 0,
    policyCallState: idleCallState<Omit<OrganizationAccessPolicyOutput, 'domains'>>(),
    saveCallState: idleCallState<void>(),
    addCallState: idleCallState<void>(),
    verifyCallState: idleCallState<void>(),
    removeCallState: idleCallState<void>(),
    requestsCallState: idleCallState<number>(),
    assignableRoles: [] as { id: string; label: string }[],
    approveCallState: idleCallState<void>(),
    rejectCallState: idleCallState<void>(),
  }),
  withComputed((store) => ({
    policy: computed<OrganizationAccessPolicyOutput | null>(() => {
      const data = store.policyCallState().data;
      return data ? { ...data, domains: store.domainEntities() } : null;
    }),
    pending: computed<boolean>(() =>
      [
        store.saveCallState(),
        store.addCallState(),
        store.verifyCallState(),
        store.removeCallState(),
      ].some((s) => s.status === 'pending'),
    ),
    reviewing: computed<boolean>(
      () =>
        store.approveCallState().status === 'pending' ||
        store.rejectCallState().status === 'pending',
    ),
    error: computed<string | null>(() =>
      organizationAccessErrorMessage(
        store.policyCallState().error ??
          store.saveCallState().error ??
          store.addCallState().error ??
          store.verifyCallState().error ??
          store.removeCallState().error,
      ),
    ),
    requestError: computed<string | null>(() =>
      organizationAccessErrorMessage(
        store.requestsCallState().error ??
          store.approveCallState().error ??
          store.rejectCallState().error,
      ),
    ),
  })),
  withMethods(
    (store, service = inject(OrganizationAccessService), dispatcher = inject(Dispatcher)) => {
      /**
       * Function invalidatePolicyQuery
       * @description Discards reads preceding a write while retaining the last loaded policy and domains.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const invalidatePolicyQuery = (): void => {
        const query = store.policyCallState();
        patchState(store, {
          policyRevision: store.policyRevision() + 1,
          policyCallState:
            query.status === 'pending'
              ? query.data === null
                ? idleCallState()
                : successCallState(query.data)
              : query,
        });
      };

      /**
       * Function invalidateRequestsQuery
       * @description Prevents a pre-decision refresh from restoring requests already approved or rejected.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const invalidateRequestsQuery = (): void => {
        const query = store.requestsCallState();
        patchState(store, {
          requestsRevision: store.requestsRevision() + 1,
          requestsCallState:
            query.status === 'pending'
              ? query.data === null
                ? idleCallState()
                : successCallState(query.data)
              : query,
        });
      };

      /**
       * Function resetPolicyFeedback
       * @description Clears feedback from settled mutually exclusive domain and policy commands before the next action.
       * @access private
       * @since 1.0.0
       * @returns {void}
       */
      const resetPolicyFeedback = (): void => {
        patchState(store, {
          saveCallState: idleCallState(),
          addCallState: idleCallState(),
          verifyCallState: idleCallState(),
          removeCallState: idleCallState(),
        });
      };
      return {
        /**
         * Method loadPolicy
         * @method loadPolicy
         * @description Executes loadPolicy through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {string} params - Operation parameters.
         * @returns {void}
         */
        loadPolicy: rxMethod<string>(
          pipe(
            switchMap((params) => {
              patchState(store, {
                saveCallState:
                  store.saveCallState().status === 'error'
                    ? idleCallState()
                    : store.saveCallState(),
                addCallState:
                  store.addCallState().status === 'error' ? idleCallState() : store.addCallState(),
                verifyCallState:
                  store.verifyCallState().status === 'error'
                    ? idleCallState()
                    : store.verifyCallState(),
                removeCallState:
                  store.removeCallState().status === 'error'
                    ? idleCallState()
                    : store.removeCallState(),
              });
              if (store.organizationId() !== params) {
                patchState(
                  store,
                  removeAllEntities({ collection: 'domain' }),
                  removeAllEntities({ collection: 'request' }),
                  {
                    organizationId: params,
                    scopeRevision: store.scopeRevision() + 1,
                    policyFormRevision: store.policyFormRevision() + 1,
                    policyRevision: store.policyRevision() + 1,
                    requestsRevision: store.requestsRevision() + 1,
                    policyCallState: idleCallState(),
                    requestsCallState: idleCallState(),
                    saveCallState:
                      store.saveCallState().status === 'pending'
                        ? store.saveCallState()
                        : idleCallState(),
                    addCallState:
                      store.addCallState().status === 'pending'
                        ? store.addCallState()
                        : idleCallState(),
                    verifyCallState:
                      store.verifyCallState().status === 'pending'
                        ? store.verifyCallState()
                        : idleCallState(),
                    removeCallState:
                      store.removeCallState().status === 'pending'
                        ? store.removeCallState()
                        : idleCallState(),
                    approveCallState:
                      store.approveCallState().status === 'pending'
                        ? store.approveCallState()
                        : idleCallState(),
                    rejectCallState:
                      store.rejectCallState().status === 'pending'
                        ? store.rejectCallState()
                        : idleCallState(),
                    assignableRoles: [],
                  },
                );
              }
              patchState(store, {
                policyCallState: pendingCallState(store.policyCallState().data),
              });
              const revision = store.policyRevision();
              return service.policy(params).pipe(
                tapResponse({
                  next: (value) => {
                    if (store.organizationId() !== params || store.policyRevision() !== revision)
                      return;
                    const { domains, ...policy } = value;
                    patchState(store, setAllEntities(domains, { collection: 'domain' }), {
                      policyCallState: successCallState(policy),
                    });
                  },
                  error: (err: unknown) => {
                    if (store.organizationId() !== params || store.policyRevision() !== revision)
                      return;
                    patchState(store, {
                      policyCallState: errorCallState(
                        toStoreError(err),
                        store.policyCallState().data,
                      ),
                    });
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method savePolicy
         * @method savePolicy
         * @description Executes savePolicy through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {{ organizationId: string; input: OrganizationAccessPolicyInput }} params - Operation parameters.
         * @returns {void}
         */
        savePolicy: rxMethod<{ organizationId: string; input: OrganizationAccessPolicyInput }>(
          pipe(
            exhaustMap((params) => {
              if (
                store.pending() ||
                (store.organizationId() !== null &&
                  store.organizationId() !== params.organizationId)
              )
                return EMPTY;
              const scopeRevision = store.scopeRevision();
              resetPolicyFeedback();
              invalidatePolicyQuery();
              patchState(store, { saveCallState: pendingCallState(store.saveCallState().data) });
              return service.updatePolicy(params.organizationId, params.input).pipe(
                tapResponse({
                  next: (value) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    invalidatePolicyQuery();
                    const { domains, ...policy } = value;
                    patchState(store, setAllEntities(domains, { collection: 'domain' }), {
                      policyCallState: successCallState(policy),
                      saveCallState: successCallState(undefined),
                      policyFormRevision: store.policyFormRevision() + 1,
                    });
                  },
                  error: (err: unknown) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    patchState(store, {
                      saveCallState: errorCallState(toStoreError(err), store.saveCallState().data),
                    });
                  },
                }),
                finalize(() => {
                  if (
                    scopeRevision !== store.scopeRevision() ||
                    (store.organizationId() !== null &&
                      store.organizationId() !== params.organizationId)
                  )
                    patchState(store, { saveCallState: idleCallState() });
                }),
              );
            }),
          ),
        ),

        /**
         * Method addDomain
         * @method addDomain
         * @description Executes addDomain through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {{ organizationId: string; domain: string }} params - Operation parameters.
         * @returns {void}
         */
        addDomain: rxMethod<{ organizationId: string; domain: string }>(
          pipe(
            exhaustMap((params) => {
              if (
                store.pending() ||
                (store.organizationId() !== null &&
                  store.organizationId() !== params.organizationId)
              )
                return EMPTY;
              const scopeRevision = store.scopeRevision();
              resetPolicyFeedback();
              invalidatePolicyQuery();
              patchState(store, { addCallState: pendingCallState(store.addCallState().data) });
              return service.addDomain(params.organizationId, params.domain).pipe(
                tapResponse({
                  next: (value) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    invalidatePolicyQuery();
                    patchState(store, setEntity(value, { collection: 'domain' }), {
                      addCallState: successCallState(undefined),
                    });
                  },
                  error: (err: unknown) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    patchState(store, {
                      addCallState: errorCallState(toStoreError(err), store.addCallState().data),
                    });
                  },
                }),
                finalize(() => {
                  if (
                    scopeRevision !== store.scopeRevision() ||
                    (store.organizationId() !== null &&
                      store.organizationId() !== params.organizationId)
                  )
                    patchState(store, { addCallState: idleCallState() });
                }),
              );
            }),
          ),
        ),

        /**
         * Method verifyDomain
         * @method verifyDomain
         * @description Executes verifyDomain through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {{ organizationId: string; domainId: string }} params - Operation parameters.
         * @returns {void}
         */
        verifyDomain: rxMethod<{ organizationId: string; domainId: string }>(
          pipe(
            exhaustMap((params) => {
              if (
                store.pending() ||
                (store.organizationId() !== null &&
                  store.organizationId() !== params.organizationId)
              )
                return EMPTY;
              const scopeRevision = store.scopeRevision();
              resetPolicyFeedback();
              invalidatePolicyQuery();
              patchState(store, {
                verifyCallState: pendingCallState(store.verifyCallState().data),
              });
              return service.verifyDomain(params.organizationId, params.domainId).pipe(
                tapResponse({
                  next: (value) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    invalidatePolicyQuery();
                    patchState(store, setEntity(value, { collection: 'domain' }), {
                      verifyCallState: successCallState(undefined),
                    });
                  },
                  error: (err: unknown) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    patchState(store, {
                      verifyCallState: errorCallState(
                        toStoreError(err),
                        store.verifyCallState().data,
                      ),
                    });
                  },
                }),
                finalize(() => {
                  if (
                    scopeRevision !== store.scopeRevision() ||
                    (store.organizationId() !== null &&
                      store.organizationId() !== params.organizationId)
                  )
                    patchState(store, { verifyCallState: idleCallState() });
                }),
              );
            }),
          ),
        ),

        /**
         * Method removeDomain
         * @method removeDomain
         * @description Executes removeDomain through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {{ organizationId: string; domainId: string }} params - Operation parameters.
         * @returns {void}
         */
        removeDomain: rxMethod<{ organizationId: string; domainId: string }>(
          pipe(
            exhaustMap((params) => {
              if (
                store.pending() ||
                (store.organizationId() !== null &&
                  store.organizationId() !== params.organizationId)
              )
                return EMPTY;
              const scopeRevision = store.scopeRevision();
              resetPolicyFeedback();
              invalidatePolicyQuery();
              patchState(store, {
                removeCallState: pendingCallState(store.removeCallState().data),
              });
              return service.removeDomain(params.organizationId, params.domainId).pipe(
                tapResponse({
                  next: () => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    invalidatePolicyQuery();
                    patchState(store, removeEntity(params.domainId, { collection: 'domain' }), {
                      removeCallState: successCallState(undefined),
                    });
                  },
                  error: (err: unknown) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    patchState(store, {
                      removeCallState: errorCallState(
                        toStoreError(err),
                        store.removeCallState().data,
                      ),
                    });
                  },
                }),
                finalize(() => {
                  if (
                    scopeRevision !== store.scopeRevision() ||
                    (store.organizationId() !== null &&
                      store.organizationId() !== params.organizationId)
                  )
                    patchState(store, { removeCallState: idleCallState() });
                }),
              );
            }),
          ),
        ),

        /**
         * Method loadRequests
         * @method loadRequests
         * @description Executes loadRequests through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {string} params - Operation parameters.
         * @returns {void}
         */
        loadRequests: rxMethod<string>(
          pipe(
            switchMap((params) => {
              patchState(store, {
                approveCallState:
                  store.approveCallState().status === 'error'
                    ? idleCallState()
                    : store.approveCallState(),
                rejectCallState:
                  store.rejectCallState().status === 'error'
                    ? idleCallState()
                    : store.rejectCallState(),
              });
              if (store.organizationId() !== params) {
                patchState(
                  store,
                  removeAllEntities({ collection: 'domain' }),
                  removeAllEntities({ collection: 'request' }),
                  {
                    organizationId: params,
                    scopeRevision: store.scopeRevision() + 1,
                    policyFormRevision: store.policyFormRevision() + 1,
                    policyRevision: store.policyRevision() + 1,
                    requestsRevision: store.requestsRevision() + 1,
                    policyCallState: idleCallState(),
                    requestsCallState: idleCallState(),
                    saveCallState:
                      store.saveCallState().status === 'pending'
                        ? store.saveCallState()
                        : idleCallState(),
                    addCallState:
                      store.addCallState().status === 'pending'
                        ? store.addCallState()
                        : idleCallState(),
                    verifyCallState:
                      store.verifyCallState().status === 'pending'
                        ? store.verifyCallState()
                        : idleCallState(),
                    removeCallState:
                      store.removeCallState().status === 'pending'
                        ? store.removeCallState()
                        : idleCallState(),
                    approveCallState:
                      store.approveCallState().status === 'pending'
                        ? store.approveCallState()
                        : idleCallState(),
                    rejectCallState:
                      store.rejectCallState().status === 'pending'
                        ? store.rejectCallState()
                        : idleCallState(),
                    assignableRoles: [],
                  },
                );
              }
              patchState(store, {
                requestsCallState: pendingCallState(store.requestsCallState().data),
              });
              const revision = store.requestsRevision();
              return service.requests(params).pipe(
                tapResponse({
                  next: (value) => {
                    if (store.organizationId() !== params || store.requestsRevision() !== revision)
                      return;
                    patchState(
                      store,
                      setAllEntities([...value.member], { collection: 'request' }),
                      {
                        requestsCallState: successCallState(value.totalItems),
                        assignableRoles: value.assignableRoles,
                      },
                    );
                  },
                  error: (err: unknown) => {
                    if (store.organizationId() !== params || store.requestsRevision() !== revision)
                      return;
                    patchState(store, {
                      requestsCallState: errorCallState(
                        toStoreError(err),
                        store.requestsCallState().data,
                      ),
                    });
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method approve
         * @method approve
         * @description Records the approval in the current scope and emits membership invalidation even if the reviewer has since switched organizations.
         * @access public
         * @since 1.0.0
         * @param {{ organizationId: string; requestId: string; roleIds: string[] }} params - Operation parameters.
         * @returns {void}
         */
        approve: rxMethod<{ organizationId: string; requestId: string; roleIds: string[] }>(
          pipe(
            exhaustMap((params) => {
              if (
                store.reviewing() ||
                (store.organizationId() !== null &&
                  store.organizationId() !== params.organizationId)
              )
                return EMPTY;
              const scopeRevision = store.scopeRevision();
              patchState(store, {
                approveCallState: idleCallState(),
                rejectCallState: idleCallState(),
              });
              invalidateRequestsQuery();
              patchState(store, {
                approveCallState: pendingCallState(store.approveCallState().data),
              });
              return service.approve(params.organizationId, params.requestId, params.roleIds).pipe(
                tapResponse({
                  next: (value) => {
                    if (
                      scopeRevision === store.scopeRevision() &&
                      (store.organizationId() === null ||
                        store.organizationId() === params.organizationId)
                    ) {
                      invalidateRequestsQuery();
                      patchState(store, setEntity(value, { collection: 'request' }), {
                        approveCallState: successCallState(undefined),
                      });
                    }
                    dispatcher.dispatch(
                      organizationAccessAdminEvents.membershipApproved({
                        organizationId: params.organizationId,
                      }),
                    );
                  },
                  error: (err: unknown) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    patchState(store, {
                      approveCallState: errorCallState(
                        toStoreError(err),
                        store.approveCallState().data,
                      ),
                    });
                  },
                }),
                finalize(() => {
                  if (
                    scopeRevision !== store.scopeRevision() ||
                    (store.organizationId() !== null &&
                      store.organizationId() !== params.organizationId)
                  )
                    patchState(store, { approveCallState: idleCallState() });
                }),
              );
            }),
          ),
        ),

        /**
         * Method reject
         * @method reject
         * @description Executes reject through the authorized admission API and records its independent request state.
         * @access public
         * @since 1.0.0
         * @param {{ organizationId: string; requestId: string }} params - Operation parameters.
         * @returns {void}
         */
        reject: rxMethod<{ organizationId: string; requestId: string }>(
          pipe(
            exhaustMap((params) => {
              if (
                store.reviewing() ||
                (store.organizationId() !== null &&
                  store.organizationId() !== params.organizationId)
              )
                return EMPTY;
              const scopeRevision = store.scopeRevision();
              patchState(store, {
                approveCallState: idleCallState(),
                rejectCallState: idleCallState(),
              });
              invalidateRequestsQuery();
              patchState(store, {
                rejectCallState: pendingCallState(store.rejectCallState().data),
              });
              return service.reject(params.organizationId, params.requestId).pipe(
                tapResponse({
                  next: (value) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    invalidateRequestsQuery();
                    patchState(store, setEntity(value, { collection: 'request' }), {
                      rejectCallState: successCallState(undefined),
                    });
                  },
                  error: (err: unknown) => {
                    if (
                      scopeRevision !== store.scopeRevision() ||
                      (store.organizationId() !== null &&
                        store.organizationId() !== params.organizationId)
                    )
                      return;
                    patchState(store, {
                      rejectCallState: errorCallState(
                        toStoreError(err),
                        store.rejectCallState().data,
                      ),
                    });
                  },
                }),
                finalize(() => {
                  if (
                    scopeRevision !== store.scopeRevision() ||
                    (store.organizationId() !== null &&
                      store.organizationId() !== params.organizationId)
                  )
                    patchState(store, { rejectCallState: idleCallState() });
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
);

/**
 * Type OrganizationAccessAdminStoreType
 * @type OrganizationAccessAdminStoreType
 * @description Injectable admission administration store instance.
 * @since 1.0.0
 */
export type OrganizationAccessAdminStoreType = InstanceType<typeof OrganizationAccessAdminStore>;
