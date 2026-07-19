import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { ComplianceService } from '@features/organization/features/compliance/data-access';
import {
  adaptComplianceTotals,
  type ComplianceRollup,
} from '@features/organization/features/compliance/data-access/adapters/compliance-totals.adapter';
import type {
  ComplianceFacilityRow,
  ComplianceSummaryOutput,
} from '@features/organization/features/compliance/models';

/**
 * Store ComplianceSummaryStore
 * @const ComplianceSummaryStore
 *
 * @description
 * Component-scoped store for the compliance register: one query returning both
 * the organization rollup and the per-facility breakdown.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const ComplianceSummaryStore = signalStore(
  //#region State
  withQueryState<ComplianceSummaryOutput>(),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    /**
     * Computed rollup
     *
     * @description
     * Organization totals, normalized out of the loose `totals` bag.
     *
     * @type {Signal<ComplianceRollup>}
     */
    rollup: computed<ComplianceRollup>(() => adaptComplianceTotals(store.queryData()?.totals)),

    /**
     * Computed facilities
     *
     * @description
     * The per-facility breakdown, worst compliance first so the sites needing
     * attention lead the register.
     *
     * A facility that tracks nothing (`complianceRate === null`) sorts last
     * rather than as 0%: it is not failing, it is unmeasured.
     *
     * @type {Signal<readonly ComplianceFacilityRow[]>}
     */
    facilities: computed<readonly ComplianceFacilityRow[]>(() =>
      (store.queryData()?.facilities ?? []).toSorted(
        (left: ComplianceFacilityRow, right: ComplianceFacilityRow): number => {
          if (left.complianceRate === null) return right.complianceRate === null ? 0 : 1;
          if (right.complianceRate === null) return -1;
          return left.complianceRate - right.complianceRate;
        },
      ),
    ),
  })),
  //#endregion

  //#region Methods
  withMethods((store, service = inject(ComplianceService)) => ({
    /**
     * Method load
     *
     * @description
     * Loads the register for an organization; a `null` id is ignored.
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

          return service.getSummary(organizationId).pipe(
            tapResponse({
              next: (summary: ComplianceSummaryOutput) =>
                patchState(store, setSuccessQuery(summary)),
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
 * Type ComplianceSummaryStoreType
 *
 * @description
 * Injectable instance type of {@link ComplianceSummaryStore}.
 */
export type ComplianceSummaryStoreType = InstanceType<typeof ComplianceSummaryStore>;
