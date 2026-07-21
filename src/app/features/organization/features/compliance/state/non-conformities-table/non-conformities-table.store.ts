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
  NonConformityOutput,
  OrganizationNonConformityListOptions,
} from '@features/organization/features/inspections/models';

/**
 * Interface ComplianceNonConformitiesQuery
 * @interface ComplianceNonConformitiesQuery
 *
 * @description
 * Parameters accepted by {@link ComplianceNonConformitiesTableStore.load}.
 */
export interface ComplianceNonConformitiesQuery {
  readonly organizationId: string;
  readonly options?: OrganizationNonConformityListOptions;
}

/**
 * Store ComplianceNonConformitiesTableStore
 * @const ComplianceNonConformitiesTableStore
 *
 * @description
 * Component-scoped store for the Compliance page's Non-conformities tab: one
 * query against `GET /organizations/{organizationId}/non-conformities`, the
 * organization-wide non-conformity register owned by the `inspections`
 * sibling feature (`InspectionService.listOrganizationNonConformities`).
 *
 * Requires `organization.inspection.read` — a different permission than the
 * page's own `organization.compliance.read` route guard. A member who only
 * holds `compliance.read` will 403 on this query; the page must gate the tab
 * on that permission rather than let the request fail.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ComplianceNonConformitiesTableStore = signalStore(
  //#region State
  withQueryState<HydraCollection<NonConformityOutput>>(),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(InspectionService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads one page of the organization's non-conformities; `null` is
     * ignored so callers can gate the request on a still-resolving
     * organization id or a missing permission.
     *
     * @param {ComplianceNonConformitiesQuery | null} request - The query to run.
     *
     * @returns {void}
     */
    load: rxMethod<ComplianceNonConformitiesQuery | null>(
      pipe(
        switchMap((request: ComplianceNonConformitiesQuery | null) => {
          if (request === null) return EMPTY;

          patchState(store, setPendingQuery());

          return service
            .listOrganizationNonConformities(request.organizationId, request.options)
            .pipe(
              tapResponse({
                next: (response: HydraCollection<NonConformityOutput>) =>
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
 * Type ComplianceNonConformitiesTableStoreType
 *
 * @description
 * Injectable instance type of {@link ComplianceNonConformitiesTableStore}.
 */
export type ComplianceNonConformitiesTableStoreType = InstanceType<
  typeof ComplianceNonConformitiesTableStore
>;
