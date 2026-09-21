import { computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withMethods,
  withHooks,
  withState,
} from '@ngrx/signals';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Dispatcher, Events } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { defer, exhaustMap, of, pipe, Subject, switchMap, takeUntil, tap } from 'rxjs';
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
import { authStoreEvents } from '@features/auth';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization/active-organization.store';
import { organizationInvitationAcceptStoreEvents } from '../organization-invitation-accept/events';
import { organizationMembershipEvents } from '../organization-membership/events';
import { organizationSettingsStoreEvents } from '../organization-settings/events';
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
  departureConfirmed: false,
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
    ) => {
      const cancelled = new Subject<void>();
      const listCancelled = new Subject<void>();
      const departed = new Set<string>();
      return {
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
                takeUntil(cancelled),
                takeUntil(listCancelled),
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
            exhaustMap((organizationId: string) => {
              listCancelled.next();
              patchState(store, {
                leaveCallState: pendingCallState(),
                departureConfirmed: departed.has(organizationId),
              });
              return defer(() =>
                departed.has(organizationId) ? of(undefined) : memberService.leave(organizationId),
              ).pipe(
                tap(() => {
                  if (!departed.has(organizationId)) {
                    departed.add(organizationId);
                    patchState(store, { departureConfirmed: true });
                    dispatcher.dispatch(
                      myOrganizationsStoreEvents.leaveSucceeded({ organizationId }),
                    );
                  }
                }),
                switchMap(() => organizationService.list()),
                takeUntil(cancelled),
                tapResponse({
                  next: (response: HydraCollection<OrganizationOutput>): void => {
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'organization' }),
                      {
                        listCallState: successCallState(null),
                        leaveCallState: successCallState(response.totalItems),
                      },
                    );
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    const failure = departed.has(organizationId)
                      ? {
                          ...storeError,
                          message: $localize`:@@account.organizations.refreshAfterLeaveError:You have left the organization. Refresh your remaining access to continue.`,
                        }
                      : storeError;
                    patchState(store, { leaveCallState: errorCallState(failure) });
                    if (!departed.has(organizationId)) {
                      dispatcher.dispatch(
                        myOrganizationsStoreEvents.leaveFailed(
                          toStoreFailureEventPayload(failure, 'Failed to leave organization'),
                        ),
                      );
                    }
                  },
                }),
              );
            }),
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
          patchState(store, { leaveCallState: idleCallState(), departureConfirmed: false });
        },
        /**
         * Method clear
         * @method clear
         * @description Cancels responses and clears memberships when the account session ends.
         * @access public
         * @since 1.0.0
         * @returns {void}
         */
        clear(): void {
          cancelled.next();
          listCancelled.next();
          departed.clear();
          patchState(
            store,
            setAllEntities([] as OrganizationOutput[], { collection: 'organization' }),
            INITIAL_MY_ORGANIZATIONS_STATE,
          );
        },
      };
    },
  ),
  withHooks((store) => {
    const events = inject(Events);
    const destroyRef = inject(DestroyRef);
    return {
      /** Refreshes a previously requested membership list after accepting an invitation. */
      onInit(): void {
        events
          .on(authStoreEvents.sessionEnded)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe(() => store.clear());
        events
          .on(
            organizationInvitationAcceptStoreEvents.acceptSucceeded,
            organizationMembershipEvents.joined,
            organizationSettingsStoreEvents.organizationUpdated,
            organizationSettingsStoreEvents.membershipLeft,
          )
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe(() => {
            if (store.listCallState().status !== 'idle') store.loadOrganizations();
          });
      },
    };
  }),
);

/**
 * Type MyOrganizationsStore
 * @type MyOrganizationsStore
 * @description Instance type of the {@link MyOrganizationsStore} signal store.
 * @version 1.0.0
 */
export type MyOrganizationsStore = InstanceType<typeof MyOrganizationsStore>;
