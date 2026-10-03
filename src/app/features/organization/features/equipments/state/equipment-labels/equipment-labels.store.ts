import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher, eventGroup } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, of, Subject, switchMap, takeUntil, type Observable } from 'rxjs';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentLabelScope } from '@features/organization/features/equipments/models/equipment-labels';

/**
 * Constant equipmentLabelsStoreEvents
 *
 * @description
 * Delivers generated PDFs to the page's browser download boundary.
 */
export const equipmentLabelsStoreEvents = eventGroup({
  source: 'Equipment Labels Store',
  events: {
    printReady: type<{ organizationId: string; blob: Blob }>(),
  },
});

/**
 * Function scopeKey
 *
 * @description
 * Identifies the exact previewed scope, including explicit selected identities.
 *
 * @param {EquipmentLabelScope} scope - Requested label scope.
 *
 * @returns {string} Stable preview identity.
 */
function scopeKey(scope: EquipmentLabelScope): string {
  return JSON.stringify(scope);
}

/**
 * Constant EquipmentLabelsStore
 *
 * @description
 * Store EquipmentLabelsStore
 * Browser-only count preview and PDF export with independent request states and an explicit scope.
 */
export const EquipmentLabelsStore = signalStore(
  withState({
    organizationId: null as string | null,
    previewKey: '',
    count: 0,
    previewCallState: idleCallState() as CallState,
    printCallState: idleCallState() as CallState,
  }),
  withComputed((store) => ({
    /**
     * Property canPrint
     *
     * @description
     * Enables printing only for a resolved scope within the server's 500-label limit.
     */
    canPrint: computed(
      () =>
        store.previewCallState().status === 'success' &&
        store.count() > 0 &&
        store.count() <= 500 &&
        store.printCallState().status !== 'pending',
    ),
  })),
  withMethods(
    (
      store,
      service = inject(EquipmentService),
      dispatcher = inject(Dispatcher),
      platformId = inject(PLATFORM_ID),
      authSession = inject(AUTH_SESSION_PORT),
    ) => {
      let revision = 0;
      let sessionRevision = authSession.sessionRevision();
      const cancellation = new Subject<void>();
      const clear = (): void => {
        revision += 1;
        cancellation.next();
        patchState(store, {
          organizationId: null,
          previewKey: '',
          count: 0,
          previewCallState: idleCallState(),
          printCallState: idleCallState(),
        });
      };
      const synchronizeSession = (): void => {
        if (sessionRevision !== authSession.sessionRevision() || !authSession.isAuthenticated()) {
          sessionRevision = authSession.sessionRevision();
          clear();
        }
      };
      return {
        synchronizeSession,
        /**
         * Method clear
         * @method clear
         *
         * @description
         * Invalidates pending exports and previews when the owning organization changes.
         *
         * @returns {void}
         */
        clear,
        /**
         * Method preview
         * @method preview
         *
         * @description
         * Reads server totals for inventory/site scopes and counts explicit identities without API
         * work.
         */
        preview: rxMethod<{ organizationId: string; scope: EquipmentLabelScope }>(
          switchMap(({ organizationId, scope }) => {
            synchronizeSession();
            if (!isPlatformBrowser(platformId) || !authSession.isAuthenticated()) return EMPTY;
            cancellation.next();
            const requestRevision = ++revision;
            patchState(store, {
              organizationId,
              previewKey: scopeKey(scope),
              count: 0,
              previewCallState: pendingCallState(),
              printCallState: idleCallState(),
            });
            if (scope.kind === 'facility' && !scope.facilityId) {
              patchState(store, { previewCallState: successCallState(null) });
              return EMPTY;
            }
            const preview: Observable<{ readonly totalItems: number }> =
              scope.kind === 'selection'
                ? of({ totalItems: new Set(scope.ids).size })
                : service.list(organizationId, {
                    page: 1,
                    itemsPerPage: 1,
                    ...(scope.kind === 'facility'
                      ? { params: { facilityId: scope.facilityId } }
                      : {}),
                  });
            return preview.pipe(
              takeUntil(cancellation),
              tapResponse({
                next: (response): void => {
                  if (revision === requestRevision)
                    patchState(store, {
                      count: response.totalItems,
                      previewCallState: successCallState(null),
                    });
                },
                error: (error: unknown): void => {
                  if (revision === requestRevision)
                    patchState(store, { previewCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
        /**
         * Method print
         * @method print
         *
         * @description
         * Exports only the successfully previewed scope; an empty selection never becomes an
         * inventory export.
         */
        print: rxMethod<{ organizationId: string; scope: EquipmentLabelScope }>(
          exhaustMap(({ organizationId, scope }) => {
            synchronizeSession();
            if (
              !store.canPrint() ||
              store.organizationId() !== organizationId ||
              store.previewKey() !== scopeKey(scope)
            )
              return EMPTY;
            if (scope.kind === 'selection' && scope.ids.length === 0) return EMPTY;
            const requestRevision = revision;
            patchState(store, { printCallState: pendingCallState() });
            let options: Parameters<EquipmentService['exportLabels']>[1];
            if (scope.kind === 'facility') {
              options = { facilityId: scope.facilityId };
            } else if (scope.kind === 'selection') {
              options = { ids: [...new Set(scope.ids)] };
            }
            return service.exportLabels(organizationId, options).pipe(
              takeUntil(cancellation),
              tapResponse({
                next: (blob: Blob): void => {
                  if (revision !== requestRevision) return;
                  patchState(store, { printCallState: successCallState(null) });
                  dispatcher.dispatch(
                    equipmentLabelsStoreEvents.printReady({ organizationId, blob }),
                  );
                },
                error: (error: unknown): void => {
                  if (revision === requestRevision)
                    patchState(store, { printCallState: errorCallState(toStoreError(error)) });
                },
              }),
            );
          }),
        ),
      };
    },
  ),
  withHooks((store, authSession = inject(AUTH_SESSION_PORT)) => ({
    onInit(): void {
      effect(() => {
        authSession.sessionRevision();
        authSession.isAuthenticated();
        untracked(() => store.synchronizeSession());
      });
    },
    onDestroy(): void {
      store.clear();
    },
  })),
);

/**
 * Type EquipmentLabelsStore
 *
 * @description
 * Instance of the page-scoped QR printing workflow.
 *
 * @type EquipmentLabelsStore
 */
export type EquipmentLabelsStore = InstanceType<typeof EquipmentLabelsStore>;
