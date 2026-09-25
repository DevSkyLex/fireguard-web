import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { withEntities, setAllEntities, removeAllEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, mergeMap, pipe, switchMap } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  isCallPending,
  toStoreError,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { WebhookService } from '@features/organization/features/webhooks/data-access';
import type {
  WebhookSubscriptionOutput,
  WebhookDeliveryOutput,
  WebhookEventOutput,
  WebhookMutation,
} from '@features/organization/features/webhooks/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { webhookSubscriptionsEvents } from './webhook-subscriptions.events';

/**
 * Constant WebhookSubscriptionsStore
 * @const WebhookSubscriptionsStore
 * @description Route-scoped server pages. Scope revisions fence accepted writes; secrets never enter state.
 * @since 1.0.0
 */
export const WebhookSubscriptionsStore = signalStore(
  withEntities({ entity: type<WebhookSubscriptionOutput>(), collection: 'subscription' }),
  withEntities({ entity: type<WebhookDeliveryOutput>(), collection: 'delivery' }),
  withState({
    organizationId: null as string | null,
    page: 1,
    total: 0,
    selectedId: null as string | null,
    deliveryPage: 1,
    deliveryTotal: 0,
    status: '' as WebhookDeliveryOutput['status'] | '',
    events: [] as WebhookEventOutput[],
    listCallState: idleCallState(),
    deliveryCallState: idleCallState(),
    catalogCallState: idleCallState(),
    mutationCallState: idleCallState(),
  }),
  withComputed((store) => ({
    selected: computed(() =>
      store.selectedId() ? (store.subscriptionEntityMap()[store.selectedId() ?? ''] ?? null) : null,
    ),
    isLoading: computed(() => isCallPending(store.listCallState())),
    isLoadingDeliveries: computed(() => isCallPending(store.deliveryCallState())),
    isLoadingCatalog: computed(() => isCallPending(store.catalogCallState())),
    isMutating: computed(() => isCallPending(store.mutationCallState())),
    pageCount: computed(() => Math.max(1, Math.ceil(store.total() / 20))),
    deliveryPageCount: computed(() => Math.max(1, Math.ceil(store.deliveryTotal() / 20))),
  })),
  withMethods(
    (
      store,
      api = inject(WebhookService),
      permissions = inject(OrganizationPermissionService),
      dispatcher = inject(Dispatcher),
    ) => {
      let scopeRevision = 0;
      const deliveries = rxMethod<{
        id: string | null;
        page: number;
        status: WebhookDeliveryOutput['status'] | '';
      }>(
        pipe(
          switchMap(({ id, page, status }) => {
            patchState(store, removeAllEntities({ collection: 'delivery' }), {
              selectedId: id,
              deliveryPage: page,
              status,
              deliveryTotal: 0,
              deliveryCallState: id ? pendingCallState() : idleCallState(),
            });
            const organizationId = store.organizationId();
            if (!organizationId || !id) return EMPTY;
            return api.deliveries(organizationId, id, page, status).pipe(
              tapResponse({
                next: (result) =>
                  patchState(
                    store,
                    setAllEntities([...result.member], { collection: 'delivery' }),
                    {
                      deliveryTotal: result.totalItems ?? 0,
                      deliveryCallState: successCallState(null),
                    },
                  ),
                error: (error: unknown) =>
                  patchState(store, { deliveryCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      );
      const catalog = rxMethod<string | null>(
        pipe(
          switchMap((organizationId) => {
            patchState(store, {
              catalogCallState: organizationId ? pendingCallState() : idleCallState(),
            });
            if (!organizationId) return EMPTY;
            return api.events().pipe(
              tapResponse({
                next: (result) =>
                  patchState(store, {
                    events: [...result.member],
                    catalogCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { catalogCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      );
      const load = rxMethod<{ organizationId: string | null; page: number; selectedId?: string }>(
        pipe(
          switchMap(({ organizationId, page, selectedId }) => {
            const changed = organizationId !== store.organizationId();
            const previousSelection =
              selectedId ?? (page === store.page() ? store.selectedId() : null);
            if (changed) {
              ++scopeRevision;
              catalog(null);
            }
            deliveries({ id: null, page: 1, status: '' });
            patchState(store, removeAllEntities({ collection: 'subscription' }), {
              organizationId,
              page,
              total: 0,
              listCallState: organizationId ? pendingCallState() : idleCallState(),
              ...(changed ? { events: [], mutationCallState: idleCallState() } : {}),
            });
            if (!organizationId) return EMPTY;
            return api.list(organizationId, page).pipe(
              tapResponse({
                next: (result) => {
                  patchState(
                    store,
                    setAllEntities([...result.member], { collection: 'subscription' }),
                    { total: result.totalItems ?? 0, listCallState: successCallState(null) },
                  );
                  const id = result.member.some((s) => s.id === previousSelection)
                    ? previousSelection
                    : (result.member[0]?.id ?? null);
                  deliveries({ id, page: 1, status: '' });
                },
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
         * Method select
         * @method select
         * @description Loads a subscription's first delivery page.
         * @access public
         * @since 1.0.0
         * @param {string} id - Visible subscription identity.
         * @returns {void}
         */
        select(id: string): void {
          if (store.isMutating() || !store.subscriptionEntityMap()[id]) return;
          patchState(store, { mutationCallState: idleCallState() });
          deliveries({ id, page: 1, status: '' });
        },
        /**
         * Method loadDeliveries
         * @method loadDeliveries
         * @description Reads the selected endpoint's history, retaining authoritative totals.
         * @access public
         * @since 1.0.0
         * @param {number} page - One-based page.
         * @param {WebhookDeliveryOutput['status'] | ''} status - Optional status.
         * @returns {void}
         */
        loadDeliveries(page: number, status: WebhookDeliveryOutput['status'] | ''): void {
          if (store.isMutating()) return;
          deliveries({ id: store.selectedId(), page, status });
        },
        /**
         * Method loadCatalog
         * @method loadCatalog
         * @description Reads selectable events when a management form opens.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        loadCatalog(): void {
          if (store.events().length || store.isLoadingCatalog()) return;
          catalog(store.organizationId());
        },
        /**
         * Method clearMutationFeedback
         * @method clearMutationFeedback
         * @description Clears an acknowledged error without resending a command.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        clearMutationFeedback(): void {
          if (!store.isMutating()) patchState(store, { mutationCallState: idleCallState() });
        },
        mutate: rxMethod<WebhookMutation>(
          pipe(
            mergeMap((action) => {
              const organizationId = store.organizationId();
              if (
                !organizationId ||
                store.isLoading() ||
                store.isMutating() ||
                !permissions.hasPermission(ORGANIZATION_PERMISSION.WEBHOOKS_MANAGE)
              )
                return EMPTY;
              if (action.kind !== 'create' && !store.subscriptionEntityMap()[action.id])
                return EMPTY;
              const revision = scopeRevision;
              patchState(store, { mutationCallState: pendingCallState() });
              return api.mutate(organizationId, action).pipe(
                tapResponse({
                  next: (result) => {
                    if (revision !== scopeRevision) return;
                    patchState(store, { mutationCallState: successCallState(null) });
                    let subscriptionId: string | null = null;
                    if (result && 'id' in result) subscriptionId = result.id;
                    else if (action.kind !== 'create') subscriptionId = action.id;
                    dispatcher.dispatch(
                      webhookSubscriptionsEvents.completed({
                        organizationId,
                        kind: action.kind,
                        subscriptionId,
                        ...(result && 'secret' in result ? { secret: result.secret } : {}),
                      }),
                    );
                    if (action.kind === 'ping' || action.kind === 'redeliver')
                      deliveries({ id: store.selectedId(), page: 1, status: '' });
                    else
                      load({
                        organizationId,
                        page:
                          action.kind === 'create' || action.kind === 'delete' ? 1 : store.page(),
                        ...(subscriptionId ? { selectedId: subscriptionId } : {}),
                      });
                  },
                  error: (error: unknown) => {
                    if (revision !== scopeRevision) return;
                    patchState(store, { mutationCallState: errorCallState(toStoreError(error)) });
                  },
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
 * Type WebhookSubscriptionsStoreType
 * @type WebhookSubscriptionsStoreType
 * @description Injectable route store instance.
 * @since 1.0.0
 */
export type WebhookSubscriptionsStoreType = InstanceType<typeof WebhookSubscriptionsStore>;
