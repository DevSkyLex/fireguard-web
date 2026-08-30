import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeEntity, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization/active-organization.store';
import { myOrganizationsStoreEvents } from './events';
import type { MyOrganizationsState } from './models';

//#region Initial State
/**
 * Constant INITIAL_MY_ORGANIZATIONS_STATE
 * @const INITIAL_MY_ORGANIZATIONS_STATE
 * @description Seed state for {@link MyOrganizationsStore}. Entity state is seeded by `withEntities`.
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
const INITIAL_MY_ORGANIZATIONS_STATE: MyOrganizationsState = {
  listCallState: idleCallState(),
  leaveCallState: idleCallState(),
} as const;
//#endregion

/**
 * Store MyOrganizationsStore
 * @const MyOrganizationsStore
 *
 * @description
 * Root-provided store backing `MY_ORGANIZATIONS_PORT` — the caller's own
 * organization memberships and the ability to leave one, read from
 * `/account/organizations`. Deliberately separate from the
 * membership-management-focused {@link OrganizationStore} (component-scoped,
 * built for the switcher/table) and from {@link OrganizationSettingsStore}
 * (page-scoped to `/settings`, gated behind `organization.settings.write`) —
 * this store must be reachable by every signed-in member regardless of
 * permission, per `features/account/FEATURE.md`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MyOrganizationsStore = signalStore(
  { providedIn: 'root' },
  withEntities({ entity: type<OrganizationOutput>(), collection: 'organization' }),
  withState<MyOrganizationsState>(INITIAL_MY_ORGANIZATIONS_STATE),
  withComputed((store) => {
    const activeOrganizationStore: ActiveOrganizationStore =
      inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      /**
       * Property organizations
       * @description The caller's organization memberships, in list order.
       * @since 1.0.0
       * @type {ReadonlyArray<OrganizationOutput>}
       */
      organizations: computed<ReadonlyArray<OrganizationOutput>>(() =>
        store.organizationEntities(),
      ),

      /**
       * Property isLoadingOrganizations
       * @since 1.0.0
       * @type {boolean}
       */
      isLoadingOrganizations: computed<boolean>(() => store.listCallState().status === 'pending'),

      /**
       * Property isLeaving
       * @since 1.0.0
       * @type {boolean}
       */
      isLeaving: computed<boolean>(() => store.leaveCallState().status === 'pending'),

      /**
       * Property leaveError
       * @since 1.0.0
       * @type {StoreError | null}
       */
      leaveError: computed<StoreError | null>(() => store.leaveCallState().error),

      /**
       * Property activeOrganizationId
       * @description Proxied from {@link ActiveOrganizationStore} so a row can identify itself as the open workspace.
       * @since 1.0.0
       * @type {string | null}
       */
      activeOrganizationId: computed<string | null>(() =>
        activeOrganizationStore.selectedOrganizationId(),
      ),
    };
  }),
  withMethods(
    (
      store,
      organizationService: OrganizationService = inject<OrganizationService>(OrganizationService),
      memberService: OrganizationMemberService = inject<OrganizationMemberService>(
        OrganizationMemberService,
      ),
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method loadOrganizations
       * @method loadOrganizations
       * @description Loads the caller's full organization membership list. Cancels any in-flight request.
       * @since 1.0.0
       * @type {RxMethod<void>}
       */
      loadOrganizations: rxMethod<void>(
        pipe(
          tap((): void => patchState(store, { listCallState: pendingCallState() })),
          switchMap(() =>
            organizationService.list().pipe(
              tapResponse({
                next: (response: HydraCollection<OrganizationOutput>): void => {
                  patchState(
                    store,
                    setAllEntities([...response.member], { collection: 'organization' }),
                    { listCallState: successCallState(null) },
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { listCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    myOrganizationsStoreEvents.listFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to load organizations'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method leave
       * @method leave
       *
       * @description
       * Removes the caller's own membership. The backend refuses with 409
       * when the caller owns the organization or is its last administrator
       * (`OrganizationMemberService.leave`'s doc block) — that refusal
       * surfaces as {@link leaveError} rather than being pre-derived here.
       * `exhaustMap` prevents a second leave request while one is in flight.
       *
       * @since 1.0.0
       * @type {RxMethod<string>}
       */
      leave: rxMethod<string>(
        pipe(
          tap((): void => patchState(store, { leaveCallState: pendingCallState() })),
          exhaustMap((organizationId: string) =>
            memberService.leave(organizationId).pipe(
              tapResponse({
                next: (): void => {
                  patchState(store, removeEntity(organizationId, { collection: 'organization' }), {
                    leaveCallState: successCallState(null),
                  });
                  dispatcher.dispatch(
                    myOrganizationsStoreEvents.leaveSucceeded({ organizationId }),
                  );
                },
                error: (error: unknown): void => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, { leaveCallState: errorCallState(storeError) });
                  dispatcher.dispatch(
                    myOrganizationsStoreEvents.leaveFailed(
                      toStoreFailureEventPayload(storeError, 'Failed to leave organization'),
                    ),
                  );
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method resetLeaveOperation
       * @method resetLeaveOperation
       * @description Resets the leave operation back to idle, e.g. once a confirmation dialog closes.
       * @since 1.0.0
       * @returns {void}
       */
      resetLeaveOperation(): void {
        patchState(store, { leaveCallState: idleCallState() });
      },
    }),
  ),
);

/**
 * Type MyOrganizationsStore
 * @type MyOrganizationsStore
 * @description Instance type of the {@link MyOrganizationsStore} signal store.
 * @version 1.0.0
 */
export type MyOrganizationsStore = InstanceType<typeof MyOrganizationsStore>;
