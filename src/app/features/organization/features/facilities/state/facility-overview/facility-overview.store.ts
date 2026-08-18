import { computed } from '@angular/core';
import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type StoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentOutput,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InterventionService } from '@features/organization/features/interventions';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
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
 * Constant RECENT_INTERVENTIONS_LIMIT
 *
 * @description
 * Page size requested for the "Interventions on this site" preview — the
 * section shows only the most recently touched few, with a "See all" link
 * into the full, pre-filtered list for the rest.
 */
const RECENT_INTERVENTIONS_LIMIT: number = 5;

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
  interventions: [],
  inspectionsCallState: idleCallState(),
  equipmentCallState: idleCallState(),
  interventionsCallState: idleCallState(),
};

/**
 * Store FacilityOverviewStore
 * @class FacilityOverviewStore
 *
 * @description
 * Component-scoped NgRx Signals store powering the facility detail overview
 * tab. Loads compact inspection, equipment and intervention previews for the
 * active facility and exposes derived KPI metrics (compliance, overdue, next
 * inspection, equipment counts) plus summary view models consumed by the
 * overview sub-components.
 *
 * The intervention preview reads `InterventionService.list` straight from
 * the sibling interventions feature's root barrel, filtered by `site` and
 * capped to {@link RECENT_INTERVENTIONS_LIMIT} — the mirror of the pattern
 * `InterventionLinkedResourcesStore` already established in the other
 * direction (`interventions/FEATURE.md` "Cross-Feature Dependencies").
 * Read-only: this store lists interventions touching the facility and owns
 * no intervention state.
 *
 * All loading is browser-triggered by the page; the store performs no work
 * on the server during SSR.
 *
 * @version 1.1.0
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
     * Whether the intervention preview request is in flight.
     */
    isLoadingInterventions: computed<boolean>(
      () => store.interventionsCallState().status === 'pending',
    ),

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
     * Colours mirror the severity this same status renders with elsewhere
     * (`EQUIPMENT_STATUS_TAG_ICON_CLASS`): success for `operational`, warning
     * for `under_maintenance`, danger for `decommissioned`, neutral for
     * `in_stock` — the same literal light/dark rung pair, as a background
     * fill rather than a glyph colour.
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
          label: $localize`:@@facility.equipmentBreakdown.commissioned:Commissioned`,
          count: byStatus.operational,
          total,
          ratio: total > 0 ? byStatus.operational / total : 0,
          colorClass: 'bg-green-500 dark:bg-green-400',
        },
        {
          label: $localize`:@@facility.equipmentBreakdown.inStock:In stock`,
          count: byStatus.in_stock,
          total,
          ratio: total > 0 ? byStatus.in_stock / total : 0,
          colorClass: 'bg-neutral-500 dark:bg-neutral-400',
        },
        {
          label: $localize`:@@facility.equipmentBreakdown.underMaintenance:Under maintenance`,
          count: byStatus.under_maintenance,
          total,
          ratio: total > 0 ? byStatus.under_maintenance / total : 0,
          colorClass: 'bg-amber-500 dark:bg-amber-400',
        },
        {
          label: $localize`:@@facility.equipmentBreakdown.decommissioned:Decommissioned`,
          count: byStatus.decommissioned,
          total,
          ratio: total > 0 ? byStatus.decommissioned / total : 0,
          colorClass: 'bg-red-500 dark:bg-red-400',
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
    equipmentDescription: computed<string>(() => {
      const count: number = store.equipmentNeedingAttentionCount();
      return $localize`:@@facility.metric.equipments.desc:${count}:count: to monitor`;
    }),
  })),
  withMethods((store) => {
    const inspectionService: InspectionService = inject<InspectionService>(InspectionService);
    const equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService);
    const interventionService: InterventionService =
      inject<InterventionService>(InterventionService);

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

    const loadInterventions = rxMethod<{ organizationId: string; facilityId: string }>(
      pipe(
        tap(() => patchState(store, { interventionsCallState: pendingCallState() })),
        switchMap(({ organizationId, facilityId }) =>
          interventionService
            .list(organizationId, {
              site: `/api/facilities/${facilityId}`,
              itemsPerPage: RECENT_INTERVENTIONS_LIMIT,
              order: { updatedAt: 'desc' },
            })
            .pipe(
              tapResponse({
                next: (response: HydraCollection<InterventionOutput>) =>
                  patchState(store, {
                    interventions: [...response.member],
                    interventionsCallState: successCallState(null),
                  }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    interventions: [],
                    interventionsCallState: errorCallState(storeError),
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
      loadInterventions,
      /**
       * Loads the inspection, equipment and intervention previews for a facility.
       *
       * @param {{ organizationId: string; facilityId: string }} params
       * @returns {void}
       */
      load(params: { organizationId: string; facilityId: string }): void {
        loadInspections(params);
        loadEquipment(params);
        loadInterventions(params);
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
