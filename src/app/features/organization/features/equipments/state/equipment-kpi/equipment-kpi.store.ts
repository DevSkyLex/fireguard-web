import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';

/**
 * Store EquipmentKpiStore
 * @const EquipmentKpiStore
 *
 * @description
 * Component-scoped store for the equipment page's aggregate counters.
 *
 * Kept apart from `EquipmentStore`: the counters are organization-wide and do
 * not move when the list is paged, sorted or filtered, so folding them into the
 * list store would refetch them on every page change.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const EquipmentKpiStore = signalStore(
  //#region State
  withQueryState<EquipmentKpiOutput>(),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(EquipmentService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the counters. A `null` id is ignored so callers can bind a route
     * signal without guarding it.
     *
     * @param {string | null} organizationId - The organization to load.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.getKpis(organizationId).pipe(
            tapResponse({
              next: (kpis: EquipmentKpiOutput) => patchState(store, setSuccessQuery(kpis)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type EquipmentKpiStoreType
 *
 * @description
 * Injectable instance type of {@link EquipmentKpiStore}.
 */
export type EquipmentKpiStoreType = InstanceType<typeof EquipmentKpiStore>;
