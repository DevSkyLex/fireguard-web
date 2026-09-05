import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import type { OrganizationAssetsPaneState } from './models';

/** Page size for the compact right-pane lists — each resource has its own server page and total. */
const PANE_ITEMS_PER_PAGE = 50;

/**
 * Constant INITIAL_STATE
 *
 * @description
 * Seed state: nothing loaded.
 *
 * @since 1.0.0
 */
const INITIAL_STATE: OrganizationAssetsPaneState = {
  equipmentPage: 1,
  equipmentTotal: 0,
  equipmentScope: '',
  inspectionPage: 1,
  inspectionTotal: 0,
  inspectionScope: '',
  equipmentListCallState: idleCallState(),
  inspectionListCallState: idleCallState(),
};

/**
 * Store OrganizationAssetsPaneStore
 * @const OrganizationAssetsPaneStore
 *
 * @description
 * Component-scoped NgRx SignalStore backing the assets explorer's right
 * pane. It reuses `EquipmentService`/`InspectionService` from their owning
 * subfeatures' public `data-access` barrels rather than duplicating
 * transport: a `facilityId` scopes both lists to one site, its absence
 * scopes them to the whole organization (the "everything" axis). Each load
 * uses `switchMap`, so switching the axis or the selected facility cancels
 * whatever was still in flight.
 *
 * @example
 * ```typescript
 * @Component({ providers: [OrganizationAssetsPaneStore] })
 * export class OrganizationAssetsPage {
 *   protected readonly pane = inject(OrganizationAssetsPaneStore);
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const OrganizationAssetsPaneStore = signalStore(
  //#region State
  withState<OrganizationAssetsPaneState>(INITIAL_STATE),
  //#endregion

  //#region Computed
  withComputed((store) => ({
    equipmentPageCount: computed(() =>
      Math.max(1, Math.ceil(store.equipmentTotal() / PANE_ITEMS_PER_PAGE)),
    ),
    inspectionPageCount: computed(() =>
      Math.max(1, Math.ceil(store.inspectionTotal() / PANE_ITEMS_PER_PAGE)),
    ),
    /** The equipment currently in view. */
    equipment: computed<readonly EquipmentOutput[]>(
      () => store.equipmentListCallState().data ?? [],
    ),

    /** Whether the equipment list is resolving. */
    isLoadingEquipment: computed<boolean>(() => isCallPending(store.equipmentListCallState())),

    /** Whether the equipment list failed to load. */
    hasEquipmentError: computed<boolean>(() => isCallError(store.equipmentListCallState())),

    /** The inspections currently in view. */
    inspections: computed<readonly InspectionOutput[]>(
      () => store.inspectionListCallState().data ?? [],
    ),

    /** Whether the inspections list is resolving. */
    isLoadingInspections: computed<boolean>(() => isCallPending(store.inspectionListCallState())),

    /** Whether the inspections list failed to load. */
    hasInspectionsError: computed<boolean>(() => isCallError(store.inspectionListCallState())),
  })),
  //#endregion

  //#region Methods
  withMethods(
    (
      store,
      equipmentService = inject<EquipmentService>(EquipmentService),
      inspectionService = inject<InspectionService>(InspectionService),
    ) => ({
      /**
       * Method loadEquipment
       *
       * @description
       * Loads the equipment in scope: facility-scoped when `facilityId` is
       * given, organization-wide otherwise.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {rxMethod<{ organizationId: string; facilityId?: string }>}
       */
      loadEquipment: rxMethod<{
        readonly organizationId: string;
        readonly facilityId?: string;
        readonly page?: number;
      }>(
        pipe(
          switchMap(({ organizationId, facilityId, page = 1 }) => {
            patchState(store, {
              equipmentPage: page,
              equipmentScope: `${organizationId}:${facilityId ?? ''}`,
              equipmentListCallState: pendingCallState(
                store.equipmentScope() === `${organizationId}:${facilityId ?? ''}`
                  ? store.equipmentListCallState().data
                  : null,
              ),
            });

            const request = facilityId
              ? equipmentService.listByFacility(organizationId, facilityId, {
                  page,
                  itemsPerPage: PANE_ITEMS_PER_PAGE,
                })
              : equipmentService.list(organizationId, { page, itemsPerPage: PANE_ITEMS_PER_PAGE });

            return request.pipe(
              tapResponse({
                next: (collection: HydraCollection<EquipmentOutput>): void => {
                  patchState(store, {
                    equipmentTotal: collection.totalItems,
                    equipmentListCallState: successCallState(collection.member),
                  });
                },
                error: (error: unknown): void => {
                  patchState(store, {
                    equipmentListCallState: errorCallState(
                      toStoreError(error),
                      store.equipmentListCallState().data,
                    ),
                  });
                },
              }),
            );
          }),
        ),
      ),

      /**
       * Method loadInspections
       *
       * @description
       * Loads the inspections in scope: facility-scoped when `facilityId` is
       * given, organization-wide otherwise.
       *
       * @access public
       * @since 1.0.0
       *
       * @type {rxMethod<{ organizationId: string; facilityId?: string }>}
       */
      loadInspections: rxMethod<{
        readonly organizationId: string;
        readonly facilityId?: string;
        readonly page?: number;
      }>(
        pipe(
          switchMap(({ organizationId, facilityId, page = 1 }) => {
            patchState(store, {
              inspectionPage: page,
              inspectionScope: `${organizationId}:${facilityId ?? ''}`,
              inspectionListCallState: pendingCallState(
                store.inspectionScope() === `${organizationId}:${facilityId ?? ''}`
                  ? store.inspectionListCallState().data
                  : null,
              ),
            });

            const request = facilityId
              ? inspectionService.listByFacility(organizationId, facilityId, {
                  page,
                  itemsPerPage: PANE_ITEMS_PER_PAGE,
                })
              : inspectionService.list(organizationId, { page, itemsPerPage: PANE_ITEMS_PER_PAGE });

            return request.pipe(
              tapResponse({
                next: (collection: HydraCollection<InspectionOutput>): void => {
                  patchState(store, {
                    inspectionTotal: collection.totalItems,
                    inspectionListCallState: successCallState(collection.member),
                  });
                },
                error: (error: unknown): void => {
                  patchState(store, {
                    inspectionListCallState: errorCallState(
                      toStoreError(error),
                      store.inspectionListCallState().data,
                    ),
                  });
                },
              }),
            );
          }),
        ),
      ),
    }),
  ),
  //#endregion
);

/**
 * Type OrganizationAssetsPaneStoreType
 *
 * @description
 * Instance type of the {@link OrganizationAssetsPaneStore} signal store.
 *
 * @version 1.0.0
 */
export type OrganizationAssetsPaneStoreType = InstanceType<typeof OrganizationAssetsPaneStore>;
