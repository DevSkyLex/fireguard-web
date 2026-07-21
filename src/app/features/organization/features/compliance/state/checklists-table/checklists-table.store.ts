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
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type {
  ChecklistListOptions,
  ChecklistOutput,
} from '@features/organization/features/checklists/models';

/**
 * Interface ComplianceChecklistsQuery
 * @interface ComplianceChecklistsQuery
 *
 * @description
 * Parameters accepted by {@link ComplianceChecklistsTableStore.load}.
 */
export interface ComplianceChecklistsQuery {
  readonly organizationId: string;
  readonly options?: ChecklistListOptions;
}

/**
 * Store ComplianceChecklistsTableStore
 * @const ComplianceChecklistsTableStore
 *
 * @description
 * Component-scoped store for the Compliance page's Checklists tab: one query
 * against the existing `GET /organizations/{organizationId}/checklists`
 * endpoint (owned by the `checklists` sibling feature). Also feeds the KPI
 * strip's "Checklist templates" count via `queryData()?.totalItems`, so the
 * page loads this store eagerly regardless of the active tab.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ComplianceChecklistsTableStore = signalStore(
  //#region State
  withQueryState<HydraCollection<ChecklistOutput>>(),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(ChecklistService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads one page of the organization's checklists; `null` is ignored so
     * callers can gate the request on a still-resolving organization id or a
     * missing permission.
     *
     * @param {ComplianceChecklistsQuery | null} request - The query to run.
     *
     * @returns {void}
     */
    load: rxMethod<ComplianceChecklistsQuery | null>(
      pipe(
        switchMap((request: ComplianceChecklistsQuery | null) => {
          if (request === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service.list(request.organizationId, request.options).pipe(
            tapResponse({
              next: (response: HydraCollection<ChecklistOutput>) =>
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
 * Type ComplianceChecklistsTableStoreType
 *
 * @description
 * Injectable instance type of {@link ComplianceChecklistsTableStore}.
 */
export type ComplianceChecklistsTableStoreType = InstanceType<
  typeof ComplianceChecklistsTableStore
>;
