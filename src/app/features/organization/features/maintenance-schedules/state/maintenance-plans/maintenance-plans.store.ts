import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, filter, finalize, mergeMap, pipe, switchMap } from 'rxjs';
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
import type {
  MaintenancePlanCommandCallStateKey,
  MaintenancePlansState,
} from './models/state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Empty page-scoped operation state; accepted writes are never cancelled by a scope change.
 */
const INITIAL_STATE: MaintenancePlansState = {
  organizationId: '',
  scopeGeneration: 0,
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
    ) => {
      /**
       * Constant pendingWrites
       *
       * @description
       * Keeps accepted commands pending for their organization across later page visits.
       *
       * @type {Map<string, Set<MaintenancePlanCommandCallStateKey>>}
       */
      const pendingWrites = new Map<string, Set<MaintenancePlanCommandCallStateKey>>();

      /**
       * Function isCurrentScope
       *
       * @description
       * Results belong to the organization visit that accepted the request.
       *
       * @param {string} organizationId - Request's organization.
       * @param {number} scopeGeneration - Request's page visit.
       *
       * @returns {boolean} Whether the originating visit is still displayed.
       */
      const isCurrentScope = (organizationId: string, scopeGeneration: number): boolean =>
        store.organizationId() === organizationId && store.scopeGeneration() === scopeGeneration;

      /**
       * Function acceptWrite
       *
       * @description
       * Admits one command of each kind for the displayed organization without cancelling other
       * organizations' accepted work.
       *
       * @param {string} organizationId - Command's organization.
       * @param {MaintenancePlanCommandCallStateKey} action - Command state.
       *
       * @returns {number | null} Originating visit, or null for an inadmissible command.
       */
      const acceptWrite = (
        organizationId: string,
        action: MaintenancePlanCommandCallStateKey,
      ): number | null => {
        if (
          store.organizationId() !== organizationId ||
          pendingWrites.get(organizationId)?.has(action)
        )
          return null;
        const actions =
          pendingWrites.get(organizationId) ?? new Set<MaintenancePlanCommandCallStateKey>();
        actions.add(action);
        pendingWrites.set(organizationId, actions);
        patchState(store, { [action]: pendingCallState() });
        return store.scopeGeneration();
      };

      /**
       * Function settleWrite
       *
       * @description
       * Releases command admission and clears pending feedback restored for a later visit.
       *
       * @param {string} organizationId - Command's organization.
       * @param {number} scopeGeneration - Command's originating visit.
       * @param {MaintenancePlanCommandCallStateKey} action - Command state.
       *
       * @returns {void} Preserves current-visit success and errors.
       */
      const settleWrite = (
        organizationId: string,
        scopeGeneration: number,
        action: MaintenancePlanCommandCallStateKey,
      ): void => {
        const actions = pendingWrites.get(organizationId);
        actions?.delete(action);
        if (!actions?.size) pendingWrites.delete(organizationId);
        if (
          store.organizationId() === organizationId &&
          (!isCurrentScope(organizationId, scopeGeneration) || store[action]().status === 'pending')
        )
          patchState(store, { [action]: idleCallState() });
      };

      return {
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
              scopeGeneration: store.scopeGeneration() + 1,
              createCallState: pendingWrites.get(organizationId)?.has('createCallState')
                ? pendingCallState()
                : idleCallState(),
              updateCallState: pendingWrites.get(organizationId)?.has('updateCallState')
                ? pendingCallState()
                : idleCallState(),
              generationCallState: pendingWrites.get(organizationId)?.has('generationCallState')
                ? pendingCallState()
                : idleCallState(),
              migrationCallState: pendingWrites.get(organizationId)?.has('migrationCallState')
                ? pendingCallState()
                : idleCallState(),
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
            filter(({ organizationId }) => store.organizationId() === organizationId),
            switchMap(({ organizationId, options }) => {
              const scopeGeneration = store.scopeGeneration();
              patchState(store, { listCallState: pendingCallState() });
              return service.list(organizationId, options).pipe(
                tapResponse({
                  next: (response) => {
                    if (!isCurrentScope(organizationId, scopeGeneration)) return;
                    if (response.member.some((plan) => plan.organizationId !== organizationId)) {
                      patchState(store, { listCallState: idleCallState() });
                      return;
                    }
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'plan' }),
                      {
                        totalPlans: response.totalItems,
                        listCallState: successCallState(null),
                        selectedPlan:
                          response.member.find((plan) => plan.id === store.selectedPlan()?.id) ??
                          store.selectedPlan(),
                      },
                    );
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
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
            filter((organizationId) => store.organizationId() === organizationId),
            switchMap((organizationId) => {
              const scopeGeneration = store.scopeGeneration();
              patchState(store, {
                engineCallState: pendingCallState(store.engineCallState().data),
              });
              return service.engine(organizationId).pipe(
                tapResponse({
                  next: (result) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
                      patchState(store, { engineCallState: successCallState(result) });
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
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
            filter(({ organizationId }) => store.organizationId() === organizationId),
            switchMap(({ organizationId, search, page }) => {
              const scopeGeneration = store.scopeGeneration();
              patchState(store, {
                equipmentCallState: pendingCallState(store.equipmentCallState().data),
              });
              return equipmentService.list(organizationId, { search, page, itemsPerPage: 30 }).pipe(
                tapResponse({
                  next: (result) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
                      patchState(store, {
                        equipmentCallState: successCallState(result.member),
                        totalEquipment: result.totalItems,
                      });
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
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
            mergeMap(({ organizationId, input }) => {
              const scopeGeneration = acceptWrite(organizationId, 'createCallState');
              if (scopeGeneration === null) return EMPTY;
              return service.create(organizationId, input).pipe(
                tapResponse({
                  next: (plan) => {
                    if (
                      !isCurrentScope(organizationId, scopeGeneration) ||
                      plan.organizationId !== organizationId
                    )
                      return;
                    patchState(store, {
                      createCallState: successCallState(plan),
                      selectedPlan: plan,
                    });
                    dispatcher.dispatch(
                      maintenancePlansStoreEvents.planPrepared({ organizationId, plan }),
                    );
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
                      patchState(store, { createCallState: errorCallState(toStoreError(error)) });
                  },
                }),
                finalize(() => settleWrite(organizationId, scopeGeneration, 'createCallState')),
              );
            }),
          ),
        ),
        /**
         * Method preview
         * @method preview
         *
         * @description
         * Selects a saved plan and fetches its backend dates; a stale preview cannot replace
         * another selection.
         *
         * @access public
         * @since unreleased
         *
         * @type {RxMethod<MaintenancePlanOutput | null>}
         */
        preview: rxMethod<MaintenancePlanOutput | null>(
          pipe(
            filter((plan) => !plan || store.organizationId() === plan.organizationId),
            switchMap((plan) => {
              const scopeGeneration = store.scopeGeneration();
              patchState(store, {
                selectedPlan: plan,
                previewCallState: plan ? pendingCallState() : idleCallState(),
              });
              if (!plan) return EMPTY;
              return service.preview(plan.organizationId, plan.id).pipe(
                tapResponse({
                  next: (result) => {
                    if (
                      isCurrentScope(plan.organizationId, scopeGeneration) &&
                      store.selectedPlan()?.id === plan.id
                    )
                      patchState(store, { previewCallState: successCallState(result) });
                  },
                  error: (error: unknown) => {
                    if (
                      isCurrentScope(plan.organizationId, scopeGeneration) &&
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
            mergeMap(({ organizationId, planId, input }) => {
              const scopeGeneration = acceptWrite(organizationId, 'updateCallState');
              if (scopeGeneration === null) return EMPTY;
              return service.update(organizationId, planId, input).pipe(
                tapResponse({
                  next: (plan) => {
                    if (
                      !isCurrentScope(organizationId, scopeGeneration) ||
                      plan.organizationId !== organizationId ||
                      plan.id !== planId
                    )
                      return;
                    patchState(store, setEntity(plan, { collection: 'plan' }), {
                      updateCallState: successCallState(plan),
                      selectedPlan:
                        store.selectedPlan()?.id === planId ? plan : store.selectedPlan(),
                    });
                    dispatcher.dispatch(
                      maintenancePlansStoreEvents.planChanged({ organizationId }),
                    );
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
                      patchState(store, { updateCallState: errorCallState(toStoreError(error)) });
                  },
                }),
                finalize(() => settleWrite(organizationId, scopeGeneration, 'updateCallState')),
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
            mergeMap(({ organizationId, planId, retry }) => {
              const scopeGeneration = acceptWrite(organizationId, 'generationCallState');
              if (scopeGeneration === null) return EMPTY;
              return service.generate(organizationId, planId, retry).pipe(
                tapResponse({
                  next: (result) => {
                    if (!isCurrentScope(organizationId, scopeGeneration)) return;
                    patchState(store, { generationCallState: successCallState(result) });
                    dispatcher.dispatch(
                      maintenancePlansStoreEvents.planChanged({ organizationId }),
                    );
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
                      patchState(store, {
                        generationCallState: errorCallState(toStoreError(error)),
                      });
                  },
                }),
                finalize(() => settleWrite(organizationId, scopeGeneration, 'generationCallState')),
              );
            }),
          ),
        ),
        /**
         * Method migrate
         * @method migrate
         *
         * @description
         * Prepares legacy plans or explicitly activates their authority, preserving inline
         * conflicts.
         *
         * @access public
         * @since unreleased
         *
         * @type {RxMethod<{ organizationId: string; activate: boolean }>}
         */
        migrate: rxMethod<{ organizationId: string; activate: boolean }>(
          pipe(
            mergeMap(({ organizationId, activate }) => {
              const scopeGeneration = acceptWrite(organizationId, 'migrationCallState');
              if (scopeGeneration === null) return EMPTY;
              return (
                activate
                  ? service.activateEngine(organizationId)
                  : service.prepareLegacy(organizationId)
              ).pipe(
                tapResponse({
                  next: (result) => {
                    if (!isCurrentScope(organizationId, scopeGeneration)) return;
                    patchState(store, {
                      migrationCallState: successCallState(result),
                      engineCallState: successCallState(result),
                    });
                    dispatcher.dispatch(
                      maintenancePlansStoreEvents.planChanged({ organizationId }),
                    );
                  },
                  error: (error: unknown) => {
                    if (isCurrentScope(organizationId, scopeGeneration))
                      patchState(store, {
                        migrationCallState: errorCallState(toStoreError(error)),
                      });
                  },
                }),
                finalize(() => settleWrite(organizationId, scopeGeneration, 'migrationCallState')),
              );
            }),
          ),
        ),
        /**
         * Method resetCreate
         * @method resetCreate
         *
         * @description
         * Clears preparation feedback when reopening the form while preserving accepted work as
         * pending.
         *
         * @access public
         * @since unreleased
         *
         * @returns {void} Clears the completed create action.
         */
        resetCreate(): void {
          patchState(store, {
            createCallState: pendingWrites.get(store.organizationId())?.has('createCallState')
              ? pendingCallState()
              : idleCallState(),
          });
        },
      };
    },
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
