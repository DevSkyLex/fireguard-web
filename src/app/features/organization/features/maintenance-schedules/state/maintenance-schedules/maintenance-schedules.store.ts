import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, setEntity, withEntities } from '@ngrx/signals/entities';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';
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
 * @const INITIAL_STATE
 *
 * @description
 * Seeds the auxiliary state managed in {@link MaintenanceSchedulesState}.
 * Entity state is initialised by `withEntities`.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: MaintenanceSchedulesState = {
  listCallState: idleCallState(),
  totalSchedules: 0,
  overrideCallState: idleCallState(),
  campaignCallState: idleCallState(),
};

/**
 * Store MaintenanceSchedulesStore
 * @const MaintenanceSchedulesStore
 *
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
 * @example
 * ```typescript
 * @Component({ providers: [MaintenanceSchedulesStore] })
 * export class MaintenanceSchedulesPage {
 *   protected readonly store = inject(MaintenanceSchedulesStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const MaintenanceSchedulesStore = signalStore(
  withEntities({ entity: type<MaintenanceScheduleOutput>(), collection: 'schedule' }),

  withState<MaintenanceSchedulesState>(INITIAL_STATE),

  withComputed((store) => ({
    /** All cached schedules from the entity collection, in insertion order. */
    schedules: computed<ReadonlyArray<MaintenanceScheduleOutput>>(() => store.scheduleEntities()),

    /** True while the list is loading. */
    isLoading: computed<boolean>(() => store.listCallState().status === 'pending'),

    /** True when the collection is empty and no list request is in flight. */
    isEmpty: computed<boolean>(
      () => store.scheduleIds().length === 0 && store.listCallState().status !== 'pending',
    ),

    /** True when the last list request failed. */
    hasListError: computed<boolean>(() => store.listCallState().status === 'error'),

    /** True when the last list request was refused for lack of permission, which a retry cannot fix. */
    isListForbidden: computed<boolean>(() => store.listCallState().error?.code === 403),

    /** True while an interval-override request is in flight. */
    isOverriding: computed<boolean>(() => store.overrideCallState().status === 'pending'),

    /** True while a campaign-generation request is in flight. */
    isGeneratingCampaign: computed<boolean>(() => store.campaignCallState().status === 'pending'),

    /** Error from the last campaign-generation attempt, rendered inline in the campaign dialog. */
    campaignError: computed<StoreError | null>(() => store.campaignCallState().error),

    /** The last successfully generated campaign's result, read once by the page to navigate. */
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
    ) => ({
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
          tap((): void => {
            patchState(store, { listCallState: pendingCallState() });
          }),
          switchMap((options) =>
            maintenanceScheduleService.list(options).pipe(
              tapResponse({
                next: (response: HydraCollection<MaintenanceScheduleOutput>): void => {
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
       * @type {RxMethod<{ scheduleId: string; intervalOverride: string | null }>}
       */
      setIntervalOverride: rxMethod<{ scheduleId: string; intervalOverride: string | null }>(
        pipe(
          tap((): void => {
            patchState(store, { overrideCallState: pendingCallState() });
          }),
          exhaustMap(({ scheduleId, intervalOverride }) =>
            maintenanceScheduleService.setIntervalOverride(scheduleId, intervalOverride).pipe(
              tapResponse({
                next: (schedule: MaintenanceScheduleOutput): void => {
                  patchState(store, setEntity(schedule, { collection: 'schedule' }), {
                    overrideCallState: successCallState(schedule),
                  });
                },
                error: (error: unknown): void => {
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
            ),
          ),
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
          tap((): void => {
            patchState(store, { campaignCallState: pendingCallState() });
          }),
          exhaustMap((input) =>
            maintenanceScheduleService.generateCampaign(input).pipe(
              tapResponse({
                next: (result: MaintenanceCampaignOutput): void => {
                  patchState(store, { campaignCallState: successCallState(result) });
                  dispatcher.dispatch(
                    maintenanceSchedulesStoreEvents.campaignSucceeded(
                      successFeedback(
                        $localize`:@@maintenance.campaign.toast.created:Campaign #${result.number}:number: created with ${result.workItemsCount}:count: work item(s)`,
                      ),
                    ),
                  );
                },
                error: (error: unknown): void => {
                  patchState(store, { campaignCallState: errorCallState(toStoreError(error)) });
                },
              }),
            ),
          ),
        ),
      ),

      /**
       * Method resetOverrideOperation
       * @description Resets the override operation back to idle, for the dialog's close/reopen.
       * @access public
       * @since 1.0.0
       * @returns {void}
       */
      resetOverrideOperation(): void {
        patchState(store, { overrideCallState: idleCallState() });
      },

      /**
       * Method resetCampaignOperation
       * @description Resets the campaign operation back to idle, for the dialog's close/reopen.
       * @access public
       * @since 1.0.0
       * @returns {void}
       */
      resetCampaignOperation(): void {
        patchState(store, { campaignCallState: idleCallState() });
      },
    }),
  ),
);

/**
 * Type MaintenanceSchedulesStoreType
 * @type MaintenanceSchedulesStoreType
 *
 * @description
 * Instance type of the {@link MaintenanceSchedulesStore} signal store.
 *
 * @since 1.0.0
 */
export type MaintenanceSchedulesStoreType = InstanceType<typeof MaintenanceSchedulesStore>;
