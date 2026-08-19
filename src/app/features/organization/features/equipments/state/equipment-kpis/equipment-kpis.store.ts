import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentKpiOutput } from '@features/organization/features/equipments/models';

/**
 * Store EquipmentKpisStore
 * @const EquipmentKpisStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the equipment overview KPI snapshot
 * (`GET /organizations/{organizationId}/equipment/kpis`) backing the list
 * page's KPI strip. One primary query, so `withQueryState` — no filters, no
 * pagination: the snapshot is org-wide and reloaded only on an organization
 * change, never on the list's own search or filters.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const EquipmentKpisStore = signalStore(
  withQueryState<EquipmentKpiOutput>(),
  withMethods((store, service = inject<EquipmentService>(EquipmentService)) => ({
    /**
     * Method load
     * @method load
     *
     * @description
     * Fetches the KPI snapshot for the given organization. Undefined is
     * silently ignored so a not-yet-resolved route param never issues a
     * malformed request.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {RxMethod<string | undefined>}
     */
    load: rxMethod<string | undefined>(
      pipe(
        switchMap((organizationId) => {
          if (!organizationId) return EMPTY;

          patchState(store, setPendingQuery());

          return service.kpis(organizationId).pipe(
            tapResponse({
              next: (data) => patchState(store, setSuccessQuery(data)),
              error: (err: unknown) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),
  })),
);

/**
 * Type EquipmentKpisStoreType
 * @type EquipmentKpisStoreType
 *
 * @description
 * Injectable instance type exposed by {@link EquipmentKpisStore}.
 *
 * @since 1.0.0
 */
export type EquipmentKpisStoreType = InstanceType<typeof EquipmentKpisStore>;
