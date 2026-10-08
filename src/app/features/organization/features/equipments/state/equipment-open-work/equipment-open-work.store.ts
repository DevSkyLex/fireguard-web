import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';
import {
  setErrorQuery,
  setPendingQuery,
  setSuccessQuery,
  toStoreError,
  withQueryState,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOpenWorkOutput } from '@features/organization/features/equipments/models';

/**
 * Constant EquipmentOpenWorkStore
 *
 * @description
 * Secondary authorized open-work lookup; absence of access never means an empty work queue.
 */
export const EquipmentOpenWorkStore = signalStore(
  withQueryState<readonly EquipmentOpenWorkOutput[]>(),
  withMethods((store, service = inject(EquipmentService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads intervention-owned open work for one authorized equipment.
     */
    load: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        switchMap(({ organizationId, equipmentId }) => {
          patchState(store, setPendingQuery());
          return service.openWork(organizationId, equipmentId).pipe(
            tapResponse({
              next: (collection) => patchState(store, setSuccessQuery(collection.member)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
);
