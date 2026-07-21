import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';

/**
 * Store ComplianceInspectionsReviewCountStore
 * @const ComplianceInspectionsReviewCountStore
 *
 * @description
 * Component-scoped, single-purpose store backing the KPI strip's
 * "Inspections in review" count. `submitted` is the inspection status that
 * reads as "in review": awaiting closure (see the inspection tag registry).
 *
 * Deliberately separate from {@link ComplianceInspectionsTableStore}: the tab
 * table's query reflects whatever filter the member picks, while this KPI
 * must always count every submitted inspection regardless of the tab's
 * current filter — two different query concerns, so two single-query stores
 * rather than one store juggling both (ARCHITECTURE §9.7).
 *
 * `itemsPerPage: 1` is intentional — only `totalItems` is read.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ComplianceInspectionsReviewCountStore = signalStore(
  //#region State
  withQueryState<HydraCollection<InspectionOutput>>(),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed reviewCount
     *
     * @description
     * The submitted-inspection total, or `null` before the query resolves —
     * never `0` for "not loaded yet".
     *
     * @type {Signal<number | null>}
     */
    reviewCount: computed<number | null>(() => store.queryData()?.totalItems ?? null),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(InspectionService)) => ({
    /**
     * Method load
     *
     * @description
     * Counts submitted inspections for an organization; `null` is ignored so
     * callers can gate the request on a still-resolving organization id or a
     * missing permission.
     *
     * @param {string | null} organizationId - The organization to count for.
     *
     * @returns {void}
     */
    load: rxMethod<string | null>(
      pipe(
        switchMap((organizationId: string | null) => {
          if (organizationId === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.list(organizationId, { status: 'submitted', itemsPerPage: 1 }).pipe(
            tapResponse({
              next: (response: HydraCollection<InspectionOutput>) =>
                patchState(store, setSuccessQuery(response)),
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
 * Type ComplianceInspectionsReviewCountStoreType
 *
 * @description
 * Injectable instance type of {@link ComplianceInspectionsReviewCountStore}.
 */
export type ComplianceInspectionsReviewCountStoreType = InstanceType<
  typeof ComplianceInspectionsReviewCountStore
>;
