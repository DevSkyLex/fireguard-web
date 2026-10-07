import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, switchMap } from 'rxjs';
import type { RequestOptions } from '@core/api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { MaintenancePlanService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  CreateMaintenancePlanInput,
  MaintenancePlanOutput,
  UpdateMaintenancePlanInput,
} from '@features/organization/features/maintenance-schedules/models';
import { maintenancePlansStoreEvents } from './events/events';
import type { MaintenancePlansState } from './models/state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Empty page-scoped operation state; accepted writes are never cancelled by a scope change.
 */
const INITIAL_STATE: MaintenancePlansState = {
  organizationId: '',
  totalPlans: 0,
  listCallState: idleCallState(),
  engineCallState: idleCallState(),
  migrationCallState: idleCallState(),
  createCallState: idleCallState(),
  updateCallState: idleCallState(),
  previewCallState: idleCallState(),
  generationCallState: idleCallState(),
  selectedPlan: null,
  equipmentCallState: idleCallState(),
  totalEquipment: 0,
};

/**
 * Constant MaintenancePlansStore
 *
 * @description
 * Page-scoped equipment operations, server calendar previews and explicit scheduling migration.
 * Old reads and late writes never replace a newly selected organization's data.
 */
export const MaintenancePlansStore = signalStore(
  withEntities({ entity: type<MaintenancePlanOutput>(), collection: 'plan' }),
  withState<MaintenancePlansState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Property commandPending
     *
     * @description
     * Prevents competing plan and migration submissions.
     *
     * @since unreleased
     */
    commandPending: computed(() =>
      [
        store.createCallState(),
        store.updateCallState(),
        store.generationCallState(),
        store.migrationCallState(),
      ].some((state) => state.status === 'pending'),
    ),
  })),
  withMethods(
    (
      store,
      service = inject(MaintenancePlanService),
      equipmentService = inject(EquipmentService),
      dispatcher = inject(Dispatcher),
    ) => ({
      /**
       * Method setScope
       * @method setScope
       *
       * @description
       * Clears the previous organization's view without cancelling its accepted commands.
       *
       * @access public
       * @since unreleased
       *
       * @param {string} organizationId - Newly displayed organization.
       *
       * @returns {void} Clears local data only when scope changes.
       */
      setScope(organizationId: string): void {
        if (organizationId !== store.organizationId()) {
          patchState(store, removeAllEntities({ collection: 'plan' }), {
            ...INITIAL_STATE,
            organizationId,
          });
        }
      },
      /**
       * Method load
       * @method load
       *
       * @description
       * Replaces the server-filtered page; latest query wins.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<{ organizationId: string; options?: RequestOptions }>}
       */
      load: rxMethod<{ organizationId: string; options?: RequestOptions }>(
        pipe(
          switchMap(({ organizationId, options }) => {
            patchState(store, { listCallState: pendingCallState() });
            return service.list(organizationId, options).pipe(
              tapResponse({
                next: (response) => {
                  if (store.organizationId() !== organizationId) return;
                  patchState(store, setAllEntities([...response.member], { collection: 'plan' }), {
                    totalPlans: response.totalItems,
                    listCallState: successCallState(null),
                    selectedPlan:
                      response.member.find((plan) => plan.id === store.selectedPlan()?.id) ??
                      store.selectedPlan(),
                  });
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { listCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method loadEngine
       * @method loadEngine
       *
       * @description
       * Reads the active authority without inferring mode from equipment or plans.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<string>}
       */
      loadEngine: rxMethod<string>(
        pipe(
          switchMap((organizationId) => {
            patchState(store, { engineCallState: pendingCallState(store.engineCallState().data) });
            return service.engine(organizationId).pipe(
              tapResponse({
                next: (result) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { engineCallState: successCallState(result) });
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, {
                      engineCallState: errorCallState(
                        toStoreError(error),
                        store.engineCallState().data,
                      ),
                    });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method loadEquipment
       * @method loadEquipment
       *
       * @description
       * Searches authorized equipment on browser demand, one bounded server page at a time.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<{ organizationId: string; search: string; page: number }>}
       */
      loadEquipment: rxMethod<{ organizationId: string; search: string; page: number }>(
        pipe(
          switchMap(({ organizationId, search, page }) => {
            patchState(store, {
              equipmentCallState: pendingCallState(store.equipmentCallState().data),
            });
            return equipmentService.list(organizationId, { search, page, itemsPerPage: 30 }).pipe(
              tapResponse({
                next: (result) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, {
                      equipmentCallState: successCallState(result.member),
                      totalEquipment: result.totalItems,
                    });
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, {
                      equipmentCallState: errorCallState(
                        toStoreError(error),
                        store.equipmentCallState().data,
                      ),
                    });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method create
       * @method create
       *
       * @description
       * Prepares a plan; concurrent submissions cannot cancel an accepted write.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<{ organizationId: string; input: CreateMaintenancePlanInput }>}
       */
      create: rxMethod<{ organizationId: string; input: CreateMaintenancePlanInput }>(
        pipe(
          exhaustMap(({ organizationId, input }) => {
            patchState(store, { createCallState: pendingCallState() });
            return service.create(organizationId, input).pipe(
              tapResponse({
                next: (plan) => {
                  dispatcher.dispatch(
                    maintenancePlansStoreEvents.planPrepared({ organizationId, plan }),
                  );
                  if (store.organizationId() === organizationId)
                    patchState(store, {
                      createCallState: successCallState(plan),
                      selectedPlan: plan,
                    });
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { createCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method preview
       * @method preview
       *
       * @description
       * Selects a saved plan and fetches its backend dates; a stale preview cannot replace another
       * selection.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<MaintenancePlanOutput | null>}
       */
      preview: rxMethod<MaintenancePlanOutput | null>(
        pipe(
          switchMap((plan) => {
            patchState(store, {
              selectedPlan: plan,
              previewCallState: plan ? pendingCallState() : idleCallState(),
            });
            if (!plan) return EMPTY;
            return service.preview(plan.organizationId, plan.id).pipe(
              tapResponse({
                next: (result) => {
                  if (
                    store.organizationId() === plan.organizationId &&
                    store.selectedPlan()?.id === plan.id
                  )
                    patchState(store, { previewCallState: successCallState(result) });
                },
                error: (error: unknown) => {
                  if (
                    store.organizationId() === plan.organizationId &&
                    store.selectedPlan()?.id === plan.id
                  )
                    patchState(store, { previewCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method update
       * @method update
       *
       * @description
       * Applies explicit configuration or activation after preview review.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<{
       *   organizationId: string;
       *   planId: string;
       *   input: UpdateMaintenancePlanInput;
       * }>}
       */
      update: rxMethod<{
        organizationId: string;
        planId: string;
        input: UpdateMaintenancePlanInput;
      }>(
        pipe(
          exhaustMap(({ organizationId, planId, input }) => {
            patchState(store, { updateCallState: pendingCallState() });
            return service.update(organizationId, planId, input).pipe(
              tapResponse({
                next: (plan) => {
                  if (store.organizationId() === organizationId) {
                    patchState(store, setEntity(plan, { collection: 'plan' }), {
                      updateCallState: successCallState(plan),
                      selectedPlan:
                        store.selectedPlan()?.id === planId ? plan : store.selectedPlan(),
                    });
                  }
                  dispatcher.dispatch(maintenancePlansStoreEvents.planChanged({ organizationId }));
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { updateCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method generate
       * @method generate
       *
       * @description
       * Creates or recovers a single operation's work; only an explicit retry requests another
       * attempt.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<{ organizationId: string; planId: string; retry: boolean }>}
       */
      generate: rxMethod<{ organizationId: string; planId: string; retry: boolean }>(
        pipe(
          exhaustMap(({ organizationId, planId, retry }) => {
            patchState(store, { generationCallState: pendingCallState() });
            return service.generate(organizationId, planId, retry).pipe(
              tapResponse({
                next: (result) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { generationCallState: successCallState(result) });
                  dispatcher.dispatch(maintenancePlansStoreEvents.planChanged({ organizationId }));
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { generationCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method migrate
       * @method migrate
       *
       * @description
       * Prepares legacy plans or explicitly activates their authority, preserving inline conflicts.
       *
       * @access public
       * @since unreleased
       *
       * @type {RxMethod<{ organizationId: string; activate: boolean }>}
       */
      migrate: rxMethod<{ organizationId: string; activate: boolean }>(
        pipe(
          exhaustMap(({ organizationId, activate }) => {
            patchState(store, { migrationCallState: pendingCallState() });
            return (
              activate
                ? service.activateEngine(organizationId)
                : service.prepareLegacy(organizationId)
            ).pipe(
              tapResponse({
                next: (result) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, {
                      migrationCallState: successCallState(result),
                      engineCallState: successCallState(result),
                    });
                  dispatcher.dispatch(maintenancePlansStoreEvents.planChanged({ organizationId }));
                },
                error: (error: unknown) => {
                  if (store.organizationId() === organizationId)
                    patchState(store, { migrationCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      ),
      /**
       * Method resetCreate
       * @method resetCreate
       *
       * @description
       * Starts a fresh preparation attempt after the operator explicitly reopens the form.
       *
       * @access public
       * @since unreleased
       *
       * @returns {void} Clears the completed create action.
       */
      resetCreate(): void {
        if (store.createCallState().status !== 'pending')
          patchState(store, { createCallState: idleCallState() });
      },
    }),
  ),
);

/**
 * Type MaintenancePlansStoreType
 *
 * @description
 * Instance type of the page-scoped operation plan store.
 *
 * @type MaintenancePlansStoreType
 */
export type MaintenancePlansStoreType = InstanceType<typeof MaintenancePlansStore>;
