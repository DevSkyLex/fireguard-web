import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withMethods } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, map, pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  withQueryState,
  setPendingQuery,
  setSuccessQuery,
  setErrorQuery,
  toStoreError,
} from '@core/request-state';
import { AuditEventService } from '@features/organization/data-access';
import type { AuditEventOutput } from '@features/organization/models';

/**
 * Constant RECENT_ACTIVITY_LIMIT
 * @const RECENT_ACTIVITY_LIMIT
 *
 * @description
 * Row budget of the dashboard feed — enough to read the pulse without
 * turning the card into the audit log page.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const RECENT_ACTIVITY_LIMIT: number = 8;

/**
 * Store RecentActivityStore
 * @const RecentActivityStore
 *
 * @description
 * Component-scoped NgRx SignalStore for the **Recent activity** dashboard
 * feed, backed by the audit ledger (`GET /api/audit-events`, newest first).
 *
 * The ledger is **platform-wide**: the endpoint has no organization filter —
 * organization events carry their organization id only in unfilterable
 * `metadata`, and `tenantId` is not populated for them — so this feed shows
 * the caller's ledger view, exactly like the audit log page. Gated by the
 * global `audit.read` permission through the page-wired params signal.
 *
 * @example
 * ```typescript
 * @Component({ providers: [RecentActivityStore] })
 * export class OrganizationDashboard {
 *   private readonly activityStore = inject<RecentActivityStoreType>(RecentActivityStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const RecentActivityStore = signalStore(
  //#region State
  withQueryState<readonly AuditEventOutput[]>(),
  //#endregion

  //#region Methods

  /**
   * Feature withMethods
   *
   * @description
   * Adds the `load` reactive method fetching the newest ledger page.
   *
   * @since 1.0.0
   */
  withMethods((store, auditEventService = inject<AuditEventService>(AuditEventService)) => ({
    /**
     * Method load
     *
     * @description
     * NgRx `rxMethod` that fetches the most recent audit events whenever the
     * gate signal emits `true`. A falsy gate — the member lacks `audit.read`
     * — is silently ignored so the endpoint is never hit without access.
     *
     * @since 1.0.0
     */
    load: rxMethod<boolean>(
      pipe(
        switchMap((canRead: boolean) => {
          if (!canRead) return EMPTY;

          patchState(store, setPendingQuery());

          return auditEventService.list({ itemsPerPage: RECENT_ACTIVITY_LIMIT }).pipe(
            map(
              (collection: HydraCollection<AuditEventOutput>): readonly AuditEventOutput[] =>
                collection.member,
            ),
            tapResponse({
              next: (events) => patchState(store, setSuccessQuery(events)),
              error: (err) => patchState(store, setErrorQuery(toStoreError(err))),
            }),
          );
        }),
      ),
    ),
  })),
  //#endregion
);

/**
 * Type RecentActivityStoreType
 * @type RecentActivityStoreType
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type RecentActivityStoreType = InstanceType<typeof RecentActivityStore>;
