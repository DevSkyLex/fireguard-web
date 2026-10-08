import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, merge, pipe, switchMap, type Observable } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { ParkService } from '@features/organization/data-access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentFacilitySummaryOutput,
  EquipmentOutput,
} from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { toFacilityOption } from '@features/organization/features/facilities/utils';

/**
 * Interface OrganizationParkQuery
 * @interface
 *
 * @description
 * Immutable authority shared by all three action counts and their destinations.
 *
 * @since unreleased
 */
export interface OrganizationParkQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization used as the authority for every scoped request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property family
   * @readonly
   *
   * @description
   * Server catalog family; omitted for the complete equipment park.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly family?: string;
  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Optional internal customer narrowing the root site context.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly customerId?: string;
  /**
   * Property facilityId
   * @readonly
   *
   * @description
   * Optional root site whose published descendants belong to the query.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly facilityId?: string;
  /**
   * Property equipmentEnabled
   * @readonly
   *
   * @description
   * Whether the caller grants equipment reads for both equipment queues.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly equipmentEnabled: boolean;
  /**
   * Property anomaliesEnabled
   * @readonly
   *
   * @description
   * Whether both inspection and equipment read permissions are granted.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly anomaliesEnabled: boolean;
}
/**
 * Interface ParkSiteQuery
 * @interface
 *
 * @description
 * Root-site chooser uses the same customer context and server search/pagination.
 *
 * @since unreleased
 */
export interface ParkSiteQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Owning organization used as the authority for every scoped request.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Optional internal customer narrowing the root site context.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly customerId?: string;
  /**
   * Property search
   * @readonly
   *
   * @description
   * Server search over root-site names and paths.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly search?: string;
  /**
   * Property page
   * @readonly
   *
   * @description
   * One-based candidate page returned by the server.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly page?: number;
}
/**
 * Interface OrganizationParkState
 * @interface
 *
 * @description
 * Independent request states preserve partial availability without fabricated zero counts.
 *
 * @since unreleased
 */
interface OrganizationParkState {
  /**
   * Property scope
   * @readonly
   *
   * @description
   * Immutable query fingerprint preventing old customer or site results from being reused.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly scope: string;
  /**
   * Property unavailableCallState
   * @readonly
   *
   * @description
   * Exact count of equipment currently declared under maintenance.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<number>}
   */
  readonly unavailableCallState: CallState<number>;
  /**
   * Property controlsCallState
   * @readonly
   *
   * @description
   * Exact count of equipment in the due-soon or overdue server union.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<number>}
   */
  readonly controlsCallState: CallState<number>;
  /**
   * Property anomaliesCallState
   * @readonly
   *
   * @description
   * Lifecycle of the unresolved anomaly projection; errors do not become zero.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<number>}
   */
  readonly anomaliesCallState: CallState<number>;
  /**
   * Property sitesCallState
   * @readonly
   *
   * @description
   * Typed paginated root-site candidates for the customer selector.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<HydraCollection<FacilityOutput>>}
   */
  readonly sitesCallState: CallState<HydraCollection<FacilityOutput>>;
  /**
   * Property siteCallState
   * @readonly
   *
   * @description
   * Separately hydrated retained root-site selection.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<FacilityOutput>}
   */
  readonly siteCallState: CallState<FacilityOutput>;
  /**
   * Property siteQuery
   * @readonly
   *
   * @description
   * Committed root-site search and pagination scope.
   *
   * @access public
   * @since unreleased
   *
   * @type {ParkSiteQuery | null}
   */
  readonly siteQuery: ParkSiteQuery | null;
}
/**
 * Constant initialState
 *
 * @description
 * Unknown quantities remain null until an authorized server projection completes.
 *
 * @since unreleased
 */
const initialState: OrganizationParkState = {
  scope: '',
  unavailableCallState: idleCallState(),
  controlsCallState: idleCallState(),
  anomaliesCallState: idleCallState(),
  sitesCallState: idleCallState(),
  siteCallState: idleCallState(),
  siteQuery: null,
};

/**
 * Constant OrganizationParkStore
 *
 * @description
 * Read-only park projection with scope-fenced requests and independent queue failures.
 *
 * @since unreleased
 */
export const OrganizationParkStore = signalStore(
  withState<OrganizationParkState>(initialState),
  withComputed((store) => ({
    siteOptions: computed(() => (store.sitesCallState().data?.member ?? []).map(toFacilityOption)),
    selectedSite: computed(() => {
      const site = store.siteCallState().data;
      return site ? toFacilityOption(site) : null;
    }),
    sitePageCount: computed(() =>
      Math.max(1, Math.ceil((store.sitesCallState().data?.totalItems ?? 0) / 20)),
    ),
  })),
  withMethods(
    (
      store,
      equipment = inject(EquipmentService),
      park = inject(ParkService),
      facilities = inject(FacilityService),
    ) => {
      /**
       * Function prepareQueueReads
       *
       * @description
       * Retains completed quantities only while rereading the same immutable park scope.
       *
       * @param {OrganizationParkQuery} query - Authorized queue scope.
       * @param {string} scope - Serialized authority of the new read.
       *
       * @returns {void} Updates the independent request states before subscription.
       */
      const prepareQueueReads = (query: OrganizationParkQuery, scope: string): void => {
        const sameScope = scope === store.scope();
        const unavailable = sameScope ? store.unavailableCallState().data : null;
        const controls = sameScope ? store.controlsCallState().data : null;
        const anomalies = sameScope ? store.anomaliesCallState().data : null;
        patchState(store, {
          scope,
          unavailableCallState: query.equipmentEnabled
            ? pendingCallState(unavailable)
            : idleCallState(),
          controlsCallState: query.equipmentEnabled ? pendingCallState(controls) : idleCallState(),
          anomaliesCallState: query.anomaliesEnabled
            ? pendingCallState(anomalies)
            : idleCallState(),
        });
      };

      /**
       * Function readUnavailable
       *
       * @description
       * Reads and settles the exact operational queue within the same cancellable request group.
       *
       * @param {OrganizationParkQuery} query - Authorized organization and optional site.
       * @param {Record<string, string>} params - Shared family/customer filters.
       *
       * @returns {Observable<EquipmentFacilitySummaryOutput>} Queue result or an empty denied read.
       */
      const readUnavailable = (
        query: OrganizationParkQuery,
        params: Record<string, string>,
      ): Observable<EquipmentFacilitySummaryOutput> => {
        if (!query.equipmentEnabled) return EMPTY;
        const source = query.facilityId
          ? equipment.summaryByFacility(query.organizationId, query.facilityId, true, {
              params,
            })
          : equipment.summary(query.organizationId, { params });
        return source.pipe(
          tapResponse({
            next: (summary) =>
              patchState(store, {
                unavailableCallState: successCallState(summary.byStatus.under_maintenance),
              }),
            error: (error: unknown) =>
              patchState(store, {
                unavailableCallState: errorCallState(
                  toStoreError(error),
                  store.unavailableCallState().data,
                ),
              }),
          }),
        );
      };

      /**
       * Function readControls
       *
       * @description
       * Reads the exact due-control total and keeps site traversal out of organization queries.
       *
       * @param {OrganizationParkQuery} query - Authorized organization and optional site.
       * @param {Record<string, string>} params - Shared family/customer filters.
       *
       * @returns {Observable<HydraCollection<EquipmentOutput>>} Queue result or an empty denied
       *   read.
       */
      const readControls = (
        query: OrganizationParkQuery,
        params: Record<string, string>,
      ): Observable<HydraCollection<EquipmentOutput>> => {
        if (!query.equipmentEnabled) return EMPTY;
        const dueOptions = {
          itemsPerPage: 1,
          page: 1,
          params: {
            ...params,
            maintenanceDueStatus: 'due',
            ...(query.facilityId ? { includeDescendants: true } : {}),
          },
        };
        const source = query.facilityId
          ? equipment.listByFacility(query.organizationId, query.facilityId, dueOptions)
          : equipment.list(query.organizationId, dueOptions);
        return source.pipe(
          tapResponse({
            next: (collection) =>
              patchState(store, {
                controlsCallState: successCallState(collection.totalItems),
              }),
            error: (error: unknown) =>
              patchState(store, {
                controlsCallState: errorCallState(
                  toStoreError(error),
                  store.controlsCallState().data,
                ),
              }),
          }),
        );
      };

      return {
        /**
         * @description
         * Counts each queue across all pages and cancels every obsolete scoped read.
         */
        load: rxMethod<OrganizationParkQuery | null>(
          pipe(
            switchMap((query) => {
              if (!query) {
                patchState(store, {
                  scope: '',
                  unavailableCallState: idleCallState(),
                  controlsCallState: idleCallState(),
                  anomaliesCallState: idleCallState(),
                });
                return EMPTY;
              }
              const scope = JSON.stringify(query);
              const params = {
                ...(query.family ? { family: query.family } : {}),
                ...(query.customerId ? { customerId: query.customerId } : {}),
              };
              prepareQueueReads(query, scope);
              const unavailable = readUnavailable(query, params);
              const controls = readControls(query, params);
              const anomalies = !query.anomaliesEnabled
                ? EMPTY
                : park
                    .anomaliesSummary(query.organizationId, {
                      params: {
                        ...params,
                        ...(query.facilityId ? { facilityId: query.facilityId } : {}),
                      },
                    })
                    .pipe(
                      tapResponse({
                        next: (summary) =>
                          patchState(store, {
                            anomaliesCallState: successCallState(summary.openAnomalies),
                          }),
                        error: (error: unknown) =>
                          patchState(store, {
                            anomaliesCallState: errorCallState(
                              toStoreError(error),
                              store.anomaliesCallState().data,
                            ),
                          }),
                      }),
                    );
              return merge(unavailable, controls, anomalies);
            }),
          ),
        ),
        /**
         * @description
         * Reads only root sites belonging to the current customer.
         */
        loadSites: rxMethod<ParkSiteQuery | null>(
          pipe(
            switchMap((query) => {
              patchState(store, {
                siteQuery: query,
                sitesCallState: query ? pendingCallState() : idleCallState(),
              });
              if (!query) return EMPTY;
              return facilities
                .list(query.organizationId, {
                  rootsOnly: true,
                  includePath: true,
                  page: query.page ?? 1,
                  itemsPerPage: 20,
                  search: query.search,
                  ...(query.customerId ? { params: { customerId: query.customerId } } : {}),
                })
                .pipe(
                  tapResponse({
                    next: (collection) =>
                      patchState(store, { sitesCallState: successCallState(collection) }),
                    error: (error: unknown) =>
                      patchState(store, { sitesCallState: errorCallState(toStoreError(error)) }),
                  }),
                );
            }),
          ),
        ),
        /**
         * @description
         * Retains a selected site's label independently of its candidate page.
         */
        readSite: rxMethod<{ readonly organizationId: string; readonly facilityId: string } | null>(
          pipe(
            switchMap((scope) => {
              patchState(store, { siteCallState: scope ? pendingCallState() : idleCallState() });
              if (!scope) return EMPTY;
              return facilities.get(scope.organizationId, scope.facilityId).pipe(
                tapResponse({
                  next: (site) => patchState(store, { siteCallState: successCallState(site) }),
                  error: (error: unknown) =>
                    patchState(store, { siteCallState: errorCallState(toStoreError(error)) }),
                }),
              );
            }),
          ),
        ),
      };
    },
  ),
);

/**
 * Type OrganizationParkStoreType
 *
 * @description
 * Component-provided store instance used by the park queues widget.
 *
 * @since unreleased
 *
 * @type
 */
export type OrganizationParkStoreType = InstanceType<typeof OrganizationParkStore>;
