import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
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
import type {
  InspectionListOptions,
  InspectionOutput,
} from '@features/organization/features/inspections/models';

/**
 * Interface ComplianceInspectionsQuery
 * @interface ComplianceInspectionsQuery
 *
 * @description
 * Parameters accepted by {@link ComplianceInspectionsTableStore.load}.
 */
export interface ComplianceInspectionsQuery {
  readonly organizationId: string;
  readonly options?: InspectionListOptions;
}

/**
 * Store ComplianceInspectionsTableStore
 * @const ComplianceInspectionsTableStore
 *
 * @description
 * Component-scoped store for the Compliance page's Inspections tab: one
 * query against the existing `GET /organizations/{organizationId}/inspections`
 * endpoint (owned by the `inspections` sibling feature). Kept separate from
 * `InspectionStore` on purpose — this tab is read-only and must not pull in
 * that store's CRUD/lifecycle surface.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ComplianceInspectionsTableStore = signalStore(
  //#region State
  withQueryState<HydraCollection<InspectionOutput>>(),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(InspectionService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads one page of the organization's inspections; `null` is ignored so
     * callers can gate the request on a still-resolving organization id or a
     * missing permission.
     *
     * @param {ComplianceInspectionsQuery | null} request - The query to run.
     *
     * @returns {void}
     */
    load: rxMethod<ComplianceInspectionsQuery | null>(
      pipe(
        switchMap((request: ComplianceInspectionsQuery | null) => {
          if (request === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.list(request.organizationId, request.options).pipe(
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
 * Type ComplianceInspectionsTableStoreType
 *
 * @description
 * Injectable instance type of {@link ComplianceInspectionsTableStore}.
 */
export type ComplianceInspectionsTableStoreType = InstanceType<
  typeof ComplianceInspectionsTableStore
>;
