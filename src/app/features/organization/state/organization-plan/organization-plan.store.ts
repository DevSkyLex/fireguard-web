import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import {
  errorCallState,
  idleCallState,
  isCallSuccess,
  pendingCallState,
  StoreError,
  successCallState,
  toStoreError,
} from '@core/state/request-state';
import { OrganizationService, PlanService } from '@features/organization/data-access';
import type { OrganizationOutput, PlanOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../active-organization';
import { OrganizationMemberAccessStore } from '../organization-member-access';
import { OrganizationQuotaStore } from '../organization-quota';
import { organizationPlanStoreEvents } from './events';
import type { OrganizationPlanChangeParams, OrganizationPlanState } from './models';

//#region Initial State
const INITIAL_STATE: OrganizationPlanState = {
  plansCallState: idleCallState(),
  changePlanCallState: idleCallState(),
};
//#endregion

/**
 * Store OrganizationPlanStore
 * @const OrganizationPlanStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the organization subscription page.
 * Owns the self-service plan change and, on success, refreshes the
 * {@link ActiveOrganizationStore} (so the switcher and plan badge reflect the
 * new plan) and reloads the {@link OrganizationMemberAccessStore} (so the
 * feature-gated navigation and route guards pick up the new feature set).
 *
 * Designed to be provided at **component level** (no `providedIn: 'root'`).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationPlanStore = signalStore(
  withState<OrganizationPlanState>(INITIAL_STATE),

  withComputed((store) => ({
    plans: computed<ReadonlyArray<PlanOutput>>(() => {
      const state = store.plansCallState();
      return isCallSuccess(state) ? state.data : [];
    }),
    isLoadingPlans: computed<boolean>(() => store.plansCallState().status === 'pending'),
    plansError: computed<StoreError | null>(() => store.plansCallState().error),
    isChangingPlan: computed<boolean>(() => store.changePlanCallState().status === 'pending'),
    changePlanError: computed<StoreError | null>(() => store.changePlanCallState().error),
    changePlanSucceeded: computed<boolean>(() => store.changePlanCallState().status === 'success'),
  })),

  withMethods(
    (
      store,
      organizationService = inject<OrganizationService>(OrganizationService),
      planService = inject<PlanService>(PlanService),
      activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore),
      organizationMemberAccessStore = inject<OrganizationMemberAccessStore>(
        OrganizationMemberAccessStore,
      ),
      organizationQuotaStore = inject<OrganizationQuotaStore>(OrganizationQuotaStore),
      dispatcher = inject<Dispatcher>(Dispatcher),
    ) => ({
      /**
       * Method loadPlans
       * @method loadPlans
       *
       * @description
       * Loads the subscription plans the authenticated user can select.
       */
      loadPlans: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { plansCallState: pendingCallState() })),
          switchMap(() =>
            planService.listAvailable().pipe(
              tapResponse({
                next: (collection: HydraCollection<PlanOutput>) =>
                  patchState(store, {
                    plansCallState: successCallState(collection.member),
                  }),
                error: (err: unknown) =>
                  patchState(store, { plansCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),

      /**
       * Method changePlan
       * @method changePlan
       *
       * @description
       * Assigns the selected subscription plan to the organization and, on
       * success, refreshes the active organization and reloads the member access
       * payload so the unlocked features propagate to the navigation and guards.
       *
       * @param {OrganizationPlanChangeParams} params - Organization id and target plan id.
       */
      changePlan: rxMethod<OrganizationPlanChangeParams>(
        pipe(
          tap(() => patchState(store, { changePlanCallState: pendingCallState() })),
          switchMap(({ organizationId, planId }) =>
            organizationService.changePlan(organizationId, { planId }).pipe(
              tapResponse({
                next: (organization: OrganizationOutput) => {
                  patchState(store, { changePlanCallState: successCallState(organization) });
                  activeOrganizationStore.setOrganization(organization);
                  organizationMemberAccessStore.reload();
                  organizationQuotaStore.load(organization.id);
                  dispatcher.dispatch(organizationPlanStoreEvents.planChanged(organization));
                },
                error: (err: unknown) =>
                  patchState(store, { changePlanCallState: errorCallState(toStoreError(err)) }),
              }),
            ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Type OrganizationPlanStore
 * @type OrganizationPlanStore
 *
 * @description
 * Instance type of the {@link OrganizationPlanStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationPlanStore = InstanceType<typeof OrganizationPlanStore>;
