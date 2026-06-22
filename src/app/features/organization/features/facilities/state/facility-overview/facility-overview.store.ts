import { computed } from '@angular/core';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/models/api';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/state/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentOutput,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import type { FacilityEquipmentStatusRow, FacilityOverviewState } from './models';

/**
 * Constant PREVIEW_ITEMS_PER_PAGE
 *
 * @description
 * Page size used for the compact overview previews. Large enough to
 * compute meaningful aggregates without paginating the overview UI.
 */
const PREVIEW_ITEMS_PER_PAGE: number = 200;

/**
 * Constant RECENT_INSPECTIONS_LIMIT
 *
 * @description
 * Maximum number of inspections surfaced in the recent-inspections card.
 */
const RECENT_INSPECTIONS_LIMIT: number = 6;

/**
 * Constant MILLISECONDS_PER_DAY
 *
 * @description
 * Number of milliseconds in a calendar day, used for day-delta math.
 */
const MILLISECONDS_PER_DAY: number = 86_400_000;

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Initial {@link FacilityOverviewState} with empty previews and idle calls.
 */
const INITIAL_STATE: FacilityOverviewState = {
  inspections: [],
  equipment: [],
  inspectionsCallState: idleCallState(),
  equipmentCallState: idleCallState(),
};

/**
 * Store FacilityOverviewStore
 * @class FacilityOverviewStore
 *
 * @description
 * Component-scoped NgRx Signals store powering the facility detail overview
 * tab. Loads compact inspection and equipment previews for the active
 * facility and exposes derived KPI metrics (compliance, overdue, next
 * inspection, equipment counts) plus summary view models consumed by the
 * overview sub-components.
 *
 * All loading is browser-triggered by the page; the store performs no work
 * on the server during SSR.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const FacilityOverviewStore = signalStore(
  withState<FacilityOverviewState>(INITIAL_STATE),
  withComputed((store) => ({
    /**
     * Whether the inspection preview request is in flight.
     */
    isLoadingInspections: computed<boolean>(
      () => store.inspectionsCallState().status === 'pending',
    ),

    /**
     * Whether the equipment preview request is in flight.
     */
    isLoadingEquipment: computed<boolean>(() => store.equipmentCallState().status === 'pending'),

    /**
     * Inspection pass rate as a whole percentage, or `null` when there is
     * no inspection data.
     */
    complianceRate: computed<number | null>(() => {
      const inspections: ReadonlyArray<InspectionOutput> = store.inspections();
      if (inspections.length === 0) {
        return null;
      }

      const passedCount: number = inspections.filter(
        (inspection) => inspection.result === 'pass',
      ).length;
      return Math.round((passedCount / inspections.length) * 100);
    }),

    /**
     * Number of inspections past their due date and not yet closed.
     */
    overdueInspectionsCount: computed<number>(() => {
      const nowTimestamp: number = Date.now();
      return store.inspections().filter((inspection) => {
        const performedTimestamp: number = Date.parse(inspection.performedAt);
        return (
          inspection.status !== 'closed' &&
          Number.isFinite(performedTimestamp) &&
          performedTimestamp < nowTimestamp
        );
      }).length;
    }),

    /**
     * ISO timestamp of the soonest upcoming inspection, or `null`.
     */
    nextInspectionAt: computed<string | null>(() => {
      const nowTimestamp: number = Date.now();
      const futureTimestamps: number[] = store
        .inspections()
        .map((inspection) => Date.parse(inspection.performedAt))
        .filter((timestamp) => Number.isFinite(timestamp) && timestamp >= nowTimestamp)
        .toSorted((left, right) => left - right);

      return futureTimestamps.length > 0 ? new Date(futureTimestamps[0]).toISOString() : null;
    }),

    /**
     * Recent inspections, ascending by performed date, capped for preview.
     */
    recentInspections: computed<ReadonlyArray<InspectionOutput>>(() =>
      store
        .inspections()
        .toSorted((left, right) => Date.parse(left.performedAt) - Date.parse(right.performedAt))
        .slice(0, RECENT_INSPECTIONS_LIMIT),
    ),

    /**
     * Total number of equipment items assigned to the facility.
     */
    equipmentCount: computed<number>(() => store.equipment().length),

    /**
     * Equipment items that require attention (maintenance or decommissioned).
     */
    equipmentNeedingAttentionCount: computed<number>(
      () =>
        store
          .equipment()
          .filter(
            (equipment) =>
              equipment.status === 'under_maintenance' || equipment.status === 'decommissioned',
          ).length,
    ),

    /**
     * Per-status equipment breakdown rows used by the progress-bar summary.
     */
    equipmentStatusRows: computed<ReadonlyArray<FacilityEquipmentStatusRow>>(() => {
      const equipment: ReadonlyArray<EquipmentOutput> = store.equipment();
      const total: number = equipment.length;

      const byStatus: Record<EquipmentStatus, number> = {
        in_stock: 0,
        operational: 0,
        decommissioned: 0,
        under_maintenance: 0,
      };

      for (const item of equipment) {
        byStatus[item.status] += 1;
      }

      return [
        {
          label: 'Commissioned',
          count: byStatus.operational,
          total,
          ratio: total > 0 ? byStatus.operational / total : 0,
          colorClass: 'bg-green-600',
        },
        {
          label: 'In stock',
          count: byStatus.in_stock,
          total,
          ratio: total > 0 ? byStatus.in_stock / total : 0,
          colorClass: 'bg-blue-600',
        },
        {
          label: 'Under maintenance',
          count: byStatus.under_maintenance,
          total,
          ratio: total > 0 ? byStatus.under_maintenance / total : 0,
          colorClass: 'bg-amber-500',
        },
        {
          label: 'Decommissioned',
          count: byStatus.decommissioned,
          total,
          ratio: total > 0 ? byStatus.decommissioned / total : 0,
          colorClass: 'bg-red-500',
        },
      ];
    }),
  })),
  withComputed((store) => ({
    /**
     * Compliance rate formatted for display, or an em dash placeholder.
     */
    complianceDisplay: computed<string>(() => {
      const rate: number | null = store.complianceRate();
      return rate === null ? '—' : `${rate}%`;
    }),

    /**
     * Whole-day countdown until the next inspection, or `null`.
     */
    nextInspectionInDays: computed<number | null>(() => {
      const nextAt: string | null = store.nextInspectionAt();
      if (nextAt === null) {
        return null;
      }

      const deltaDays: number = Math.ceil((Date.parse(nextAt) - Date.now()) / MILLISECONDS_PER_DAY);
      return Math.max(0, deltaDays);
    }),

    /**
     * Equipment KPI subtitle (e.g. "3 to monitor").
     */
    equipmentDescription: computed<string>(
      () => `${store.equipmentNeedingAttentionCount()} to monitor`,
    ),
  })),
  withMethods((store) => {
    const inspectionService: InspectionService = inject<InspectionService>(InspectionService);
    const equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService);

    const loadInspections = rxMethod<{ organizationId: string; facilityId: string }>(
      pipe(
        tap(() => patchState(store, { inspectionsCallState: pendingCallState() })),
        switchMap(({ organizationId, facilityId }) =>
          inspectionService
            .list(organizationId, { itemsPerPage: PREVIEW_ITEMS_PER_PAGE, facilityId })
            .pipe(
              tapResponse({
                next: (response: HydraCollection<InspectionOutput>) =>
                  patchState(store, {
                    inspections: [...response.member],
                    inspectionsCallState: successCallState(null),
                  }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    inspections: [],
                    inspectionsCallState: errorCallState(storeError),
                  });
                },
              }),
            ),
        ),
      ),
    );

    const loadEquipment = rxMethod<{ organizationId: string; facilityId: string }>(
      pipe(
        tap(() => patchState(store, { equipmentCallState: pendingCallState() })),
        switchMap(({ organizationId, facilityId }) =>
          equipmentService
            .list(organizationId, { itemsPerPage: PREVIEW_ITEMS_PER_PAGE, params: { facilityId } })
            .pipe(
              tapResponse({
                next: (response: HydraCollection<EquipmentOutput>) =>
                  patchState(store, {
                    equipment: [...response.member],
                    equipmentCallState: successCallState(null),
                  }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    equipment: [],
                    equipmentCallState: errorCallState(storeError),
                  });
                },
              }),
            ),
        ),
      ),
    );

    return {
      loadInspections,
      loadEquipment,
      /**
       * Loads both inspection and equipment previews for a facility.
       *
       * @param {{ organizationId: string; facilityId: string }} params
       * @returns {void}
       */
      load(params: { organizationId: string; facilityId: string }): void {
        loadInspections(params);
        loadEquipment(params);
      },
    };
  }),
);

/**
 * Type FacilityOverviewStore
 *
 * @description
 * Instance type of the {@link FacilityOverviewStore} signal store.
 */
export type FacilityOverviewStore = InstanceType<typeof FacilityOverviewStore>;
