import { computed, inject } from '@angular/core';
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
  EquipmentFacilitySummaryOutput,
  EquipmentStatus,
} from '@features/organization/features/equipments/models';
import { resolveEquipmentStatusTag } from '@features/organization/features/facilities/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InterventionService } from '@features/organization/features/interventions';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import type { FacilityEquipmentStatusRow, FacilityOverviewState } from './models';

/**
 * Constant PREVIEW_ITEMS_PER_PAGE
 *
 * @description
 * Page size used for the compact inspection preview. Its partial-data
 * caption identifies metrics based on a sample; equipment uses exact counts.
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
 * Constant EQUIPMENT_STATUS_ROW_ORDER
 *
 * @description
 * Display order of the equipment status breakdown rows — operational first
 * as the reassuring majority case, then in-stock, under maintenance and
 * decommissioned last. `Object.keys` on a per-status tally follows
 * declaration order instead, which is not this order.
 */
const EQUIPMENT_STATUS_ROW_ORDER: ReadonlyArray<EquipmentStatus> = [
  'operational',
  'in_stock',
  'under_maintenance',
  'decommissioned',
];

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Initial {@link FacilityOverviewState} with empty previews and idle calls.
 */
const INITIAL_STATE: FacilityOverviewState = {
  inspections: [],
  equipmentIncludeDescendants: true,
  interventions: [],
  inspectionsTotal: 0,
  inspectionsCallState: idleCallState(),
  equipmentCallState: idleCallState(),
  interventionsCallState: idleCallState(),
};

/**
 * Constant FacilityOverviewStore
 * @class FacilityOverviewStore
 *
 * @description
 * Component-scoped NgRx Signals store powering the facility detail overview
 * tab. Loads compact inspection/intervention previews and exact equipment counts
 * for the active facility and exposes KPI metrics (compliance, overdue, next
 * inspection, equipment counts) plus summary view models consumed by the
 * overview sub-components.
 * The intervention preview reads `InterventionService.list` straight from
 * the sibling interventions feature's root barrel, filtered by `site` and
 * capped to {@link RECENT_INTERVENTIONS_LIMIT} — the mirror of the pattern
 * `InterventionLinkedResourcesStore` already established in the other
 * direction (`interventions/FEATURE.md` "Cross-Feature Dependencies").
 * Read-only: this store lists interventions touching the facility and owns
 * no intervention state.
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
     * @description
     * Whether the inspection preview request is in flight.
     */
    isLoadingInspections: computed<boolean>(
      () => store.inspectionsCallState().status === 'pending',
    ),

    /**
     * @description
     * Whether the equipment summary request is in flight.
     */
    isLoadingEquipment: computed<boolean>(() => store.equipmentCallState().status === 'pending'),

    /**
     * @description
     * Whether the intervention preview request is in flight.
     */
    isLoadingInterventions: computed<boolean>(
      () => store.interventionsCallState().status === 'pending',
    ),

    /**
     * @description
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
     * @description
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
     * @description
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
     * @description
     * Most recent past inspections, newest first, capped for preview.
     * Future-dated and unparseable rows are excluded before the cap applies.
     */
    recentInspections: computed<ReadonlyArray<InspectionOutput>>(() => {
      const nowTimestamp: number = Date.now();
      return store
        .inspections()
        .filter((inspection) => {
          const performedTimestamp: number = Date.parse(inspection.performedAt);
          return Number.isFinite(performedTimestamp) && performedTimestamp <= nowTimestamp;
        })
        .toSorted((left, right) => Date.parse(right.performedAt) - Date.parse(left.performedAt))
        .slice(0, RECENT_INSPECTIONS_LIMIT);
    }),

    /**
     * @description
     * Exact total across the selected direct or descendant scope.
     */
    equipmentCount: computed<number>(() => store.equipmentCallState().data?.totalItems ?? 0),

    /**
     * @description
     * Exact total retained as the overview's public count contract.
     */
    equipmentTotal: computed<number>(() => store.equipmentCallState().data?.totalItems ?? 0),

    /**
     * @description
     * Equipment items that require attention (maintenance or decommissioned).
     */
    equipmentNeedingAttentionCount: computed<number>(
      () => store.equipmentCallState().data?.needingAttentionCount ?? 0,
    ),

    /**
     * @description
     * Per-status equipment breakdown rows used by the progress-bar summary.
     * Label and icon come from the facility-owned
     * {@link resolveEquipmentStatusTag} registry — the same one the plan
     * overlay's equipment pins use — so this row never repeats a status
     * label the registry already owns. Colours mirror the tag's own
     * severity: success for `operational`, warning for
     * `under_maintenance`, danger for `decommissioned`, neutral for
     * `in_stock` — the same literal light/dark rung pair, as a background
     * fill rather than a glyph colour.
     */
    equipmentStatusRows: computed<ReadonlyArray<FacilityEquipmentStatusRow>>(() => {
      const summary: EquipmentFacilitySummaryOutput | null = store.equipmentCallState().data;
      const total: number = summary?.totalItems ?? 0;
      const byStatus: Readonly<Record<EquipmentStatus, number>> = summary?.byStatus ?? {
        in_stock: 0,
        operational: 0,
        decommissioned: 0,
        under_maintenance: 0,
      };

      const colorClassOf: Record<EquipmentStatus, string> = {
        operational: 'bg-success',
        in_stock: 'bg-muted-foreground',
        under_maintenance: 'bg-warning',
        decommissioned: 'bg-destructive',
      };

      const iconColorClassOf: Record<EquipmentStatus, string> = {
        operational: 'text-success',
        in_stock: 'text-muted-foreground',
        under_maintenance: 'text-warning',
        decommissioned: 'text-destructive',
      };

      return EQUIPMENT_STATUS_ROW_ORDER.map((status) => {
        const descriptor = resolveEquipmentStatusTag(status);
        const count: number = byStatus[status];

        return {
          label: descriptor.label,
          icon: descriptor.icon,
          count,
          total,
          ratio: total > 0 ? count / total : 0,
          colorClass: colorClassOf[status],
          iconColorClass: iconColorClassOf[status],
        };
      });
    }),
  })),
  withComputed((store) => ({
    /**
     * @description
     * Whether the loaded inspection preview (capped at
     * {@link PREVIEW_ITEMS_PER_PAGE}) is a partial sample of the facility's
     * inspections — the compliance rate, overdue count and next-inspection
     * metrics are all computed from this same preview, so a partial sample
     * makes them approximate rather than exact.
     */
    isInspectionsPreviewPartial: computed<boolean>(
      () => store.inspectionsTotal() > store.inspections().length,
    ),

    /**
     * @description
     * Compliance rate formatted for display, or an em dash placeholder.
     */
    complianceDisplay: computed<string>(() => {
      const rate: number | null = store.complianceRate();
      return rate === null ? '—' : `${rate}%`;
    }),

    /**
     * @description
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
     * @description
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
                    inspectionsTotal: response.totalItems,
                    inspectionsCallState: successCallState(null),
                  }),
                error: (error: unknown) => {
                  const storeError: StoreError = toStoreError(error);
                  patchState(store, {
                    inspections: [],
                    inspectionsTotal: 0,
                    inspectionsCallState: errorCallState(storeError),
                  });
                },
              }),
            ),
        ),
      ),
    );

    const loadEquipment = rxMethod<{
      organizationId: string;
      facilityId: string;
      includeDescendants?: boolean;
    }>(
      pipe(
        tap(({ includeDescendants = true }) =>
          patchState(store, {
            equipmentIncludeDescendants: includeDescendants,
            equipmentCallState: pendingCallState(),
          }),
        ),
        switchMap(({ organizationId, facilityId, includeDescendants = true }) =>
          equipmentService.summaryByFacility(organizationId, facilityId, includeDescendants).pipe(
            tapResponse({
              next: (response: EquipmentFacilitySummaryOutput) =>
                patchState(store, {
                  equipmentCallState: successCallState(response),
                }),
              error: (error: unknown) => {
                const storeError: StoreError = toStoreError(error);
                patchState(store, {
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
       * @description
       * Loads inspection/intervention previews and the equipment summary for a facility.
       *
       * @param {{ organizationId: string; facilityId: string; includeDescendants?: boolean }} params -
       *   Organization, facility and equipment scope.
       *
       * @returns {void}
       */
      load(params: {
        organizationId: string;
        facilityId: string;
        includeDescendants?: boolean;
      }): void {
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
 *
 * @type {FacilityOverviewStore}
 */
export type FacilityOverviewStore = InstanceType<typeof FacilityOverviewStore>;
