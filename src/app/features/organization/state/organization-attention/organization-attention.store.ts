import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, forkJoin, map, pipe, switchMap } from 'rxjs';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { InterventionService } from '@features/organization/features/interventions';
import { ActiveOrganizationStore } from '@features/organization/state';
import type { OrganizationAttentionCounts } from './models';

/**
 * Constant COUNT_ONLY_PAGE
 *
 * @description
 * Page size used by every attention query. Only `totalItems` from the Hydra
 * envelope is read, so one item is the cheapest request that still yields an
 * organization-wide count.
 *
 * @since 1.0.0
 */
const COUNT_ONLY_PAGE = 1;

/**
 * Store OrganizationAttentionStore
 * @const OrganizationAttentionStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the dashboard attention panel. Reads
 * the three counts that describe work waiting on the operator — awaiting review,
 * changes requested, and overdue — as exact organization-wide totals.
 *
 * The `/interventions` collection filter accepts a single `status`, so `overdue`
 * is two requests (`planned` and `in_progress`, both `dueAtBefore=now`) summed
 * locally; that keeps terminal statuses out without a client-side scan. All four
 * requests run in parallel and resolve as one query.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationAttentionStore] })
 * export class OrganizationDashboard {
 *   protected readonly attention = inject(OrganizationAttentionStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationAttentionStore = signalStore(
  //#region State

  /**
   * Feature withQueryState
   *
   * @description
   * Seeds idle/pending/success/error status, the resolved counts and a
   * normalized error. One query concern, so the feature applies rather than
   * named call-state fields (ARCHITECTURE.md §10.11).
   *
   * @since 1.0.0
   */
  withQueryState<OrganizationAttentionCounts>(),
  //#endregion

  //#region Computed

  /**
   * Feature withComputed
   *
   * @description
   * Derives the panel-facing totals from the resolved counts.
   *
   * @since 1.0.0
   */
  withComputed((store) => ({
    /**
     * Computed awaitingReviewCount
     *
     * @description
     * Interventions in `submitted`, or zero while the query has not resolved.
     *
     * @since 1.0.0
     */
    awaitingReviewCount: computed<number>(() => store.queryData()?.awaitingReview ?? 0),

    /**
     * Computed changesRequestedCount
     *
     * @description
     * Interventions a reviewer returned, or zero while the query has not resolved.
     *
     * @since 1.0.0
     */
    changesRequestedCount: computed<number>(() => store.queryData()?.changesRequested ?? 0),

    /**
     * Computed overdueCount
     *
     * @description
     * Workable interventions past their due date, or zero while the query has not
     * resolved.
     *
     * @since 1.0.0
     */
    overdueCount: computed<number>(() => store.queryData()?.overdue ?? 0),

    /**
     * Computed hasAttention
     *
     * @description
     * Whether any intervention currently needs the operator. Drives the panel's
     * "nothing waiting" state.
     *
     * @since 1.0.0
     */
    hasAttention: computed<boolean>(() => {
      const counts = store.queryData();
      if (!counts) return false;
      return counts.awaitingReview + counts.changesRequested + counts.overdue > 0;
    }),
  })),
  //#endregion

  //#region Methods

  /**
   * Feature withMethods
   *
   * @description
   * Exposes the parallel count load for the active organization.
   *
   * @since 1.0.0
   */
  withMethods((store, interventionService = inject<InterventionService>(InterventionService)) => ({
    /**
     * Method load
     *
     * @description
     * Fetches the four counts in parallel for one organization and resolves them
     * into a single query payload. A missing organization id is a no-op.
     *
     * @access public
     * @since 1.0.0
     *
     * @type {rxMethod<string | undefined>}
     */
    load: rxMethod<string | undefined>(
      pipe(
        switchMap((organizationId) => {
          if (!organizationId) return EMPTY;

          patchState(store, setPendingQuery());

          const now: string = new Date().toISOString();

          return forkJoin({
            awaitingReview: interventionService.list(organizationId, {
              status: 'submitted',
              itemsPerPage: COUNT_ONLY_PAGE,
            }),
            changesRequested: interventionService.list(organizationId, {
              status: 'changes_requested',
              itemsPerPage: COUNT_ONLY_PAGE,
            }),
            overduePlanned: interventionService.list(organizationId, {
              status: 'planned',
              dueAtBefore: now,
              itemsPerPage: COUNT_ONLY_PAGE,
            }),
            overdueInProgress: interventionService.list(organizationId, {
              status: 'in_progress',
              dueAtBefore: now,
              itemsPerPage: COUNT_ONLY_PAGE,
            }),
          }).pipe(
            map(
              (result): OrganizationAttentionCounts => ({
                awaitingReview: result.awaitingReview.totalItems,
                changesRequested: result.changesRequested.totalItems,
                overdue: result.overduePlanned.totalItems + result.overdueInProgress.totalItems,
              }),
            ),
            tapResponse({
              next: (counts) => patchState(store, setSuccessQuery(counts)),
              error: (err: unknown) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion

  //#region Hooks

  withComputed((_store) => {
    const platformId = inject(PLATFORM_ID);
    const activeOrganizationStore = inject<ActiveOrganizationStore>(ActiveOrganizationStore);

    return {
      /**
       * Computed loadParams
       *
       * @description
       * Active organization id on the browser only. The counts are secondary
       * enrichment, so they never run during SSR (ARCHITECTURE.md §12.5).
       *
       * @since 1.0.0
       */
      loadParams: computed<string | undefined>(() => {
        if (!isPlatformBrowser(platformId)) return undefined;
        return activeOrganizationStore.selectedOrganizationId() ?? undefined;
      }),
    };
  }),

  withHooks({
    onInit(store) {
      store.load(store.loadParams);
    },
  }),
  //#endregion
);

/**
 * Type OrganizationAttentionStore
 * @type OrganizationAttentionStore
 *
 * @description
 * Instance type of the {@link OrganizationAttentionStore} signal store, so the
 * const carries both a value and a type meaning at its injection sites.
 *
 * @version 1.0.0
 */
export type OrganizationAttentionStore = InstanceType<typeof OrganizationAttentionStore>;
