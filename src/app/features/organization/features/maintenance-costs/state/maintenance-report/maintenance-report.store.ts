import { isPlatformBrowser } from '@angular/common';
import { effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withHooks, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationPermissionService } from '@features/organization/access';
import { MaintenanceReportService } from '@features/organization/features/maintenance-costs/data-access';
import type {
  MaintenanceFinancialDirectoryQuery,
  MaintenanceFinancialDossierOutput,
  MaintenanceReportQuery,
} from '@features/organization/features/maintenance-costs/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type {
  MaintenanceReportScope,
  MaintenanceReportState,
} from './models/maintenance-report-state.interface';

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Empty private report state; neither SSR nor a replacement session receives previous financial
 * facts.
 */
const INITIAL_STATE: MaintenanceReportState = {
  scope: null,
  scopeVersion: 0,
  reportQuery: null,
  reportCallState: idleCallState(),
  directoryQuery: null,
  directoryCallState: idleCallState(),
  directoryTotal: 0,
};

/**
 * Constant MaintenanceReportStore
 *
 * @description
 * Route-owned financial reports and paginated source identities, guarded at request and reply
 * boundaries.
 */
export const MaintenanceReportStore = signalStore(
  withEntities({ entity: type<MaintenanceFinancialDossierOutput>(), collection: 'dossier' }),
  withState<MaintenanceReportState>(INITIAL_STATE),
  withMethods(
    (
      store,
      api = inject(MaintenanceReportService),
      session = inject(AUTH_SESSION_PORT),
      permissions = inject(OrganizationPermissionService),
      platform = inject(PLATFORM_ID),
    ) => {
      const readable = (): boolean =>
        isPlatformBrowser(platform) &&
        session.isAuthenticated() &&
        permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ);
      const current = (scope: MaintenanceReportScope, generation: number): boolean =>
        readable() &&
        generation === store.scopeVersion() &&
        store.scope()?.organizationId === scope.organizationId &&
        session.sessionRevision() === scope.sessionRevision;
      const readReport = rxMethod<{
        readonly scope: MaintenanceReportScope;
        readonly query: MaintenanceReportQuery;
      } | null>(
        pipe(
          switchMap((request) => {
            if (
              !request ||
              !readable() ||
              request.scope.sessionRevision !== session.sessionRevision() ||
              request.scope.organizationId !== store.scope()?.organizationId
            ) {
              patchState(store, { reportCallState: idleCallState() });
              return EMPTY;
            }
            const { scope, query } = request,
              generation = store.scopeVersion();
            patchState(store, {
              reportQuery: query,
              reportCallState: pendingCallState(),
            });
            return api.readReport(scope.organizationId, query).pipe(
              tapResponse({
                next: (report) => {
                  if (!current(scope, generation)) return;
                  if (
                    report.organizationId !== scope.organizationId ||
                    report.from !== query.from ||
                    report.to !== query.to ||
                    report.groupBy !== query.groupBy
                  ) {
                    patchState(store, {
                      reportCallState: errorCallState(
                        toStoreError({
                          type: 'about:blank',
                          status: 502,
                          title: $localize`:@@maintenanceReport.error.scope:Financial response does not match the requested scope.`,
                        }),
                      ),
                    });
                    return;
                  }
                  patchState(store, { reportCallState: successCallState(report) });
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, {
                      reportCallState: errorCallState(toStoreError(error)),
                    });
                },
              }),
            );
          }),
        ),
      );
      const readDirectory = rxMethod<{
        readonly scope: MaintenanceReportScope;
        readonly query: MaintenanceFinancialDirectoryQuery;
      } | null>(
        pipe(
          switchMap((request) => {
            if (
              !request ||
              !readable() ||
              request.scope.sessionRevision !== session.sessionRevision() ||
              request.scope.organizationId !== store.scope()?.organizationId
            ) {
              patchState(store, removeAllEntities({ collection: 'dossier' }), {
                directoryCallState: idleCallState(),
                directoryTotal: 0,
              });
              return EMPTY;
            }
            const { scope, query } = request,
              generation = store.scopeVersion();
            patchState(store, removeAllEntities({ collection: 'dossier' }), {
              directoryQuery: query,
              directoryTotal: 0,
              directoryCallState: pendingCallState(),
            });
            return api.listDossiers(scope.organizationId, query).pipe(
              tapResponse({
                next: (collection) => {
                  if (current(scope, generation))
                    patchState(
                      store,
                      setAllEntities([...collection.member], { collection: 'dossier' }),
                      {
                        directoryTotal: collection.totalItems,
                        directoryCallState: successCallState(null),
                      },
                    );
                },
                error: (error: unknown) => {
                  if (current(scope, generation))
                    patchState(store, { directoryCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      );
      return {
        /**
         * Method setScope
         * @method setScope
         *
         * @description
         * Cancels private reads and clears all rendered identities before a new organization or
         * account scope.
         *
         * @access public
         *
         * @param {MaintenanceReportScope | null} scope - Authorized browser display scope or
         *   revoked context.
         *
         * @returns {void} No return value.
         */
        setScope(scope: MaintenanceReportScope | null): void {
          if (
            scope?.organizationId === store.scope()?.organizationId &&
            scope?.sessionRevision === store.scope()?.sessionRevision
          )
            return;
          const nextVersion = store.scopeVersion() + 1;
          readReport(null);
          readDirectory(null);
          patchState(store, INITIAL_STATE, removeAllEntities({ collection: 'dossier' }), {
            scope,
            scopeVersion: nextVersion,
          });
        },
        readReport,
        readDirectory,
      };
    },
  ),
  withHooks(
    (
      store,
      session = inject(AUTH_SESSION_PORT),
      permissions = inject(OrganizationPermissionService),
    ) => ({
      onInit(): void {
        effect(() => {
          const scope = store.scope();
          if (
            scope &&
            (!session.isAuthenticated() ||
              session.sessionRevision() !== scope.sessionRevision ||
              !permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_COST_READ))
          )
            untracked(() => store.setScope(null));
        });
      },
    }),
  ),
);

/**
 * Type MaintenanceReportStoreType
 *
 * @description
 * Public route-scoped private reporting store instance.
 *
 * @type MaintenanceReportStoreType
 */
export type MaintenanceReportStoreType = InstanceType<typeof MaintenanceReportStore>;
