import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, map, pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallSuccess,
  pendingCallState,
  successCallState,
  successFeedback,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { MaintenanceScheduleService } from '@features/organization/features/maintenance-schedules/data-access';
import type {
  GenerateMaintenanceCampaignInput,
  MaintenanceCampaignOutput,
  MaintenanceScheduleListOptions,
  MaintenanceScheduleOutput,
} from '@features/organization/features/maintenance-schedules/models';
import { maintenanceSchedulesStoreEvents } from './events';
import type { MaintenanceSchedulesState } from './models';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seeds the auxiliary state managed in {@link MaintenanceSchedulesState}.
 * Entity state is initialised by `withEntities`.
 *
 * @since 1.0.0
 *
 * @constant INITIAL_STATE
 */
const INITIAL_STATE: MaintenanceSchedulesState = {
  organization: null,
  scopeGeneration: 0,
  campaignResultOrganization: null,
  listCallState: idleCallState(),
  totalSchedules: 0,
  overrideCallState: idleCallState(),
  campaignCallState: idleCallState(),
};

/**
 * Constant MaintenanceSchedulesStore
 *
 * Store MaintenanceSchedulesStore
 * @description
 * Component-scoped NgRx SignalStore for one organization's maintenance
 * schedules: the paginated, filterable list, the per-schedule interval
 * override, and inspection-campaign generation. Provided at the page level —
 * a fresh instance per route visit, like `EquipmentStore`.
 *
 * Entity state is managed by `withEntities<MaintenanceScheduleOutput>({
 * collection: 'schedule' })`, so a successful override replaces exactly the
 * patched row (`setEntity`) from the server's full recomputed response —
 * never a refetch of the whole list.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const MaintenanceSchedulesStore
 *
 * @example
 * ```typescript
 * @Component({ providers: [MaintenanceSchedulesStore] })
 * export class MaintenanceSchedulesPage {
 *   protected readonly store = inject(MaintenanceSchedulesStore);
 * }
 * ```
 */
export const MaintenanceSchedulesStore = signalStore(
  withEntities({ entity: type<MaintenanceScheduleOutput>(), collection: 'schedule' }),

  withState<MaintenanceSchedulesState>(INITIAL_STATE),

  withComputed((store) => ({
    /**
     * @description
     * All cached schedules from the entity collection, in insertion order.
     */
    schedules: computed<ReadonlyArray<MaintenanceScheduleOutput>>(() => store.scheduleEntities()),

    /**
     * @description
     * True while the list is loading.
     */
    isLoading: computed<boolean>(() => store.listCallState().status === 'pending'),

    /**
     * @description
     * True when the collection is empty and no list request is in flight.
     */
    isEmpty: computed<boolean>(
      () => store.scheduleIds().length === 0 && store.listCallState().status !== 'pending',
    ),

    /**
     * @description
     * True when the last list request failed.
     */
    hasListError: computed<boolean>(() => store.listCallState().status === 'error'),

    /**
     * @description
     * True when the last list request was refused for lack of permission, which a retry cannot fix.
     */
    isListForbidden: computed<boolean>(() => store.listCallState().error?.code === 403),

    /**
     * @description
     * True while an interval-override request is in flight.
     */
    isOverriding: computed<boolean>(() => store.overrideCallState().status === 'pending'),

    /**
     * @description
     * True while a campaign-generation request is in flight.
     */
    isGeneratingCampaign: computed<boolean>(() => store.campaignCallState().status === 'pending'),

    /**
     * @description
     * Error from the last campaign-generation attempt, rendered inline in the campaign dialog.
     */
    campaignError: computed<StoreError | null>(() => store.campaignCallState().error),

    /**
     * @description
     * The last successfully generated campaign's result, read once by the page to navigate.
     */
    campaignResult: computed<MaintenanceCampaignOutput | null>(() => {
      const state = store.campaignCallState();
      return isCallSuccess(state) ? state.data : null;
    }),
  })),

  withMethods(
    (
      store,
      maintenanceScheduleService: MaintenanceScheduleService = inject(MaintenanceScheduleService),
      dispatcher: Dispatcher = inject(Dispatcher),
    ) => {
      /**
       * Function setOrganization
       *
       * @description
       * Clears the previous organization's rows and action results before a new query starts.
       *
       * @param {string} organization - Canonical organization IRI.
       *
       * @returns {void}
       */
      const setOrganization = (organization: string): void => {
        if (store.organization() === organization) return;
        patchState(store, removeAllEntities({ collection: 'schedule' }), {
          ...INITIAL_STATE,
          organization,
          scopeGeneration: store.scopeGeneration() + 1,
        });
      };
      return {
        setOrganization,
        /**
         * Method load
         * @method load
         *
         * @description
         * Fetches one page of schedules. `switchMap` cancels any in-flight
         * request, so a fast filter change never races an older response.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<MaintenanceScheduleListOptions>}
         */
        load: rxMethod<MaintenanceScheduleListOptions>(
          pipe(
            tap((options): void => {
              setOrganization(options.organization);
              patchState(store, { listCallState: pendingCallState() });
            }),
            map((options) => ({ options, scopeGeneration: store.scopeGeneration() })),
            switchMap(({ options, scopeGeneration }) =>
              maintenanceScheduleService.list(options).pipe(
                tapResponse({
                  next: (response: HydraCollection<MaintenanceScheduleOutput>): void => {
                    if (
                      store.organization() !== options.organization ||
                      store.scopeGeneration() !== scopeGeneration
                    )
                      return;
                    patchState(
                      store,
                      setAllEntities([...response.member], { collection: 'schedule' }),
                      {
                        totalSchedules: response.totalItems,
                        listCallState: successCallState(null),
                      },
                    );
                  },
                  error: (error: unknown): void => {
                    if (
                      store.organization() !== options.organization ||
                      store.scopeGeneration() !== scopeGeneration
                    )
                      return;
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, { listCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      maintenanceSchedulesStoreEvents.listFailed(
                        toStoreFailureEventPayload(
                          storeError,
                          'Failed to load maintenance schedules',
                        ),
                      ),
                    );
                  },
                }),
              ),
            ),
          ),
        ),

        /**
         * Method setIntervalOverride
         * @method setIntervalOverride
         *
         * @description
         * Sets or clears one schedule's interval override. `exhaustMap`
         * prevents a concurrent submission. On success the response — the full
         * recomputed schedule — replaces the entity directly; no refetch.
         *
         * @since 1.0.0
         *
         * @type {RxMethod<{
         *   organization: string;
         *   scheduleId: string;
         *   intervalOverride: string | null;
         * }>}
         */
        setIntervalOverride: rxMethod<{
          organization: string;
          scheduleId: string;
          intervalOverride: string | null;
        }>(
          pipe(
            exhaustMap(({ organization, scheduleId, intervalOverride }) => {
              if (store.organization() === null) setOrganization(organization);
              if (store.organization() !== organization) return EMPTY;
              const scopeGeneration = store.scopeGeneration();
              const cached = store.scheduleEntityMap()[scheduleId];
              if (cached && cached.organization !== organization) return EMPTY;
              patchState(store, { overrideCallState: pendingCallState() });
              return maintenanceScheduleService
                .setIntervalOverride(scheduleId, intervalOverride)
                .pipe(
                  tapResponse({
                    next: (schedule: MaintenanceScheduleOutput): void => {
                      if (
                        store.organization() !== organization ||
                        store.scopeGeneration() !== scopeGeneration ||
                        schedule.organization !== organization
                      )
                        return;
                      patchState(store, setEntity(schedule, { collection: 'schedule' }), {
                        overrideCallState: successCallState(schedule),
                      });
                    },
                    error: (error: unknown): void => {
                      if (
                        store.organization() !== organization ||
                        store.scopeGeneration() !== scopeGeneration
                      )
                        return;
                      const storeError: StoreError = toStoreError(error);
                      patchState(store, { overrideCallState: errorCallState(storeError) });
                      dispatcher.dispatch(
                        maintenanceSchedulesStoreEvents.overrideFailed(
                          toStoreFailureEventPayload(
                            storeError,
                            'Failed to update the interval override',
                          ),
                        ),
                      );
                    },
                  }),
                );
            }),
          ),
        ),

        /**
         * Method generateCampaign
         * @method generateCampaign
         *
         * @description
         * Generates an inspection campaign from the schedules matching the
         * given scope. `exhaustMap` prevents a concurrent submission. Every
         * failure — including the documented 422 no-match outcome — stays in
         * `campaignError` for the dialog to render inline; nothing is
         * dispatched as a toast (`events.ts`).
         *
         * @since 1.0.0
         *
         * @type {RxMethod<GenerateMaintenanceCampaignInput>}
         */
        generateCampaign: rxMethod<GenerateMaintenanceCampaignInput>(
          pipe(
            exhaustMap((input) => {
              if (store.organization() === null) setOrganization(input.organization);
              if (store.organization() !== input.organization) return EMPTY;
              const scopeGeneration = store.scopeGeneration();
              patchState(store, {
                campaignCallState: pendingCallState(),
                campaignResultOrganization: null,
              });
              return maintenanceScheduleService.generateCampaign(input).pipe(
                tapResponse({
                  next: (result: MaintenanceCampaignOutput): void => {
                    if (
                      store.organization() !== input.organization ||
                      store.scopeGeneration() !== scopeGeneration
                    )
                      return;
                    patchState(store, {
                      campaignCallState: successCallState(result),
                      campaignResultOrganization: input.organization,
                    });
                    dispatcher.dispatch(
                      maintenanceSchedulesStoreEvents.campaignSucceeded(
                        successFeedback(
                          $localize`:@@maintenance.campaign.toast.created:Campaign #${result.number}:number: created with ${result.workItemsCount}:count: work item(s)`,
                        ),
                      ),
                    );
                  },
                  error: (error: unknown): void => {
                    if (
                      store.organization() !== input.organization ||
                      store.scopeGeneration() !== scopeGeneration
                    )
                      return;
                    patchState(store, { campaignCallState: errorCallState(toStoreError(error)) });
                  },
                }),
              );
            }),
          ),
        ),

        /**
         * Method resetOverrideOperation
         *
         * @description
         * Resets the override operation back to idle, for the dialog's close/reopen.
         *
         * @access public
         * @since 1.0.0
         *
         * @returns {void}
         */
        resetOverrideOperation(): void {
          patchState(store, { overrideCallState: idleCallState() });
        },

        /**
         * Method resetCampaignOperation
         *
         * @description
         * Resets the campaign operation back to idle, for the dialog's close/reopen.
         *
         * @access public
         * @since 1.0.0
         *
         * @returns {void}
         */
        resetCampaignOperation(): void {
          patchState(store, {
            campaignCallState: idleCallState(),
            campaignResultOrganization: null,
          });
        },
      };
    },
  ),
);

/**
 * Type MaintenanceSchedulesStoreType
 *
 * @description
 * Instance type of the {@link MaintenanceSchedulesStore} signal store.
 *
 * @since 1.0.0
 *
 * @type MaintenanceSchedulesStoreType
 */
export type MaintenanceSchedulesStoreType = InstanceType<typeof MaintenanceSchedulesStore>;
