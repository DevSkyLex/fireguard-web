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
import type { EquipmentInspectionSummaryOutput } from '@features/organization/features/equipments/models';

/**
 * Constant EquipmentInspectionSummaryStore
 *
 * @description
 * Reads the exact inspection-owned summary on browser demand, preserving unavailable states.
 */
export const EquipmentInspectionSummaryStore = signalStore(
  withQueryState<EquipmentInspectionSummaryOutput>(),
  withMethods((store, service = inject(EquipmentService)) => ({
    /**
     * Method load
     *
     * @description
     * Reads authorized evidence for the current equipment and cancels stale reads.
     */
    load: rxMethod<{ organizationId: string; equipmentId: string }>(
      pipe(
        switchMap(({ organizationId, equipmentId }) => {
          patchState(store, setPendingQuery());
          return service.inspectionSummary(organizationId, equipmentId).pipe(
            tapResponse({
              next: (summary) => patchState(store, setSuccessQuery(summary)),
              error: (error: unknown) => patchState(store, setErrorQuery(toStoreError(error))),
            }),
          );
        }),
      ),
    ),
  })),
);
