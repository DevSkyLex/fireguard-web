import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { SelectOption } from '@features/organization/features/inspections/models';
import { inspectionCreationOptionsStoreEvents } from './events';
import type { InspectionCreationOptionsState } from './models';

//#region Initial State
/**
 * Constant INITIAL_INSPECTION_CREATION_OPTIONS_STATE
 *
 * @description
 * Initial state for the InspectionCreationOptionsStore: no options loaded,
 * load idle.
 *
 * @since 1.0.0
 */
const INITIAL_INSPECTION_CREATION_OPTIONS_STATE: InspectionCreationOptionsState = {
  equipmentOptions: [],
  loadCallState: idleCallState(),
};
//#endregion

/**
 * Constant CREATION_OPTION_PAGE_SIZE
 *
 * @description
 * Maximum number of equipment fetched for the creation form's combobox.
 * Bounds the response while covering typical organization sizes, matching
 * `InterventionPlanningOptionsStore`'s own limit for the same kind of query.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const CREATION_OPTION_PAGE_SIZE: number = 100;

/**
 * Store InspectionCreationOptionsStore
 * @const InspectionCreationOptionsStore
 *
 * @description
 * Component-scoped NgRx SignalStore that loads the organization's equipment
 * into the `SelectOption` list `InspectionCreateForm`'s combobox offers.
 * `CreateInspectionInput.equipmentId` is required and this feature owns no
 * equipment data of its own, so the create page provides this store and
 * reads `EquipmentService` through its cross-feature `data-access` barrel —
 * the same pattern `InterventionPlanningOptionsStore` already established
 * for the equivalent site/member pickers.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const InspectionCreationOptionsStore = signalStore(
  withState<InspectionCreationOptionsState>(INITIAL_INSPECTION_CREATION_OPTIONS_STATE),
  withComputed((store) => ({
    /** True while the equipment options are loading. */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /** Normalized error of the last load when it failed, otherwise `null`. */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();

      return isCallError(state) ? state.error : null;
    }),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      equipment: EquipmentService = inject<EquipmentService>(EquipmentService),
    ) => ({
      /**
       * Method loadEquipmentOptions
       * @method loadEquipmentOptions
       *
       * @description
       * Loads the organization's equipment and maps it to the `SelectOption`
       * list the creation form's combobox reads. Uses `switchMap` so a
       * repeated call (e.g. reopening the page) cancels any previous
       * in-flight request.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {RxMethod<string>}
       */
      loadEquipmentOptions: rxMethod<string>(
        pipe(
          tap((): void => {
            patchState(store, { equipmentOptions: [], loadCallState: pendingCallState() });
          }),
          switchMap((organizationId: string) =>
            equipment
              .list(organizationId, { page: 1, itemsPerPage: CREATION_OPTION_PAGE_SIZE })
              .pipe(
                tapResponse({
                  next: (response: HydraCollection<EquipmentOutput>): void => {
                    const options: readonly SelectOption[] = response.member.map(
                      (item: EquipmentOutput): SelectOption => ({
                        label: item.serialNumber
                          ? `${item.type} · ${item.serialNumber}`
                          : item.type,
                        value: item.id,
                      }),
                    );

                    patchState(store, {
                      equipmentOptions: options,
                      loadCallState: successCallState(null),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError: StoreError = toStoreError(error);
                    patchState(store, {
                      equipmentOptions: [],
                      loadCallState: errorCallState(storeError),
                    });
                    dispatcher.dispatch(
                      inspectionCreationOptionsStoreEvents.loadFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load equipment options'),
                      ),
                    );
                  },
                }),
              ),
          ),
        ),
      ),
    }),
  ),
);

/**
 * Type InspectionCreationOptionsStore
 * @type InspectionCreationOptionsStore
 *
 * @description
 * Instance type of the {@link InspectionCreationOptionsStore} signal store.
 *
 * @since 1.0.0
 */
export type InspectionCreationOptionsStore = InstanceType<typeof InspectionCreationOptionsStore>;
