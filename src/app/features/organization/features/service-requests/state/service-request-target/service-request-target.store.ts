import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, type, withComputed, withMethods, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import type { RequestOptions } from '@core/api';
import {
  idleCallState,
  pendingCallState,
  successCallState,
  errorCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentOutput,
  EquipmentOpenWorkOutput,
} from '@features/organization/features/equipments/models';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { toFacilityOption } from '@features/organization/features/facilities/utils';
/**
 * Interface ServiceRequestTargetQuery
 * @interface
 *
 * @description
 * Authorized target picker scope, remote search and pagination.
 *
 * @since unreleased
 */
export interface ServiceRequestTargetQuery {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization authority shared by the owning route and server transport.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property siteId
   * @readonly
   *
   * @description
   * Root-site target or scope; qualification choices stay inside this site.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly siteId?: string;
  /**
   * Property page
   * @readonly
   *
   * @description
   * Current server page, starting at one.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly page?: number;
  /**
   * Property search
   * @readonly
   *
   * @description
   * Committed server search term.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly search?: string;
}
/**
 * Interface ServiceRequestTargetState
 * @interface
 *
 * @description
 * Independent candidate, retained-target and authorized open-work read states.
 *
 * @since unreleased
 */
interface ServiceRequestTargetState {
  /**
   * Property equipmentQuery
   * @readonly
   *
   * @description
   * Current equipment picker authority, site subtree and server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestTargetQuery | null}
   */
  readonly equipmentQuery: ServiceRequestTargetQuery | null;
  /**
   * Property equipmentCallState
   * @readonly
   *
   * @description
   * Authorized candidate read state without a second copied collection.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState}
   */
  readonly equipmentCallState: CallState;
  /**
   * Property equipmentTotal
   * @readonly
   *
   * @description
   * Server candidate count including disabled historical entries.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly equipmentTotal: number;
  /**
   * Property selectedEquipmentCallState
   * @readonly
   *
   * @description
   * Retained equipment identity hydrated independently of search pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<EquipmentOutput>}
   */
  readonly selectedEquipmentCallState: CallState<EquipmentOutput>;
  /**
   * Property siteQuery
   * @readonly
   *
   * @description
   * Current root-site picker authority and server page.
   *
   * @access public
   * @since unreleased
   *
   * @type {ServiceRequestTargetQuery | null}
   */
  readonly siteQuery: ServiceRequestTargetQuery | null;
  /**
   * Property siteCallState
   * @readonly
   *
   * @description
   * Root-site candidate read state.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState}
   */
  readonly siteCallState: CallState;
  /**
   * Property siteTotal
   * @readonly
   *
   * @description
   * Authoritative root-site count for picker pagination.
   *
   * @access public
   * @since unreleased
   *
   * @type {number}
   */
  readonly siteTotal: number;
  /**
   * Property selectedSiteCallState
   * @readonly
   *
   * @description
   * Retained site identity hydrated independently of search pages.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<FacilityOutput>}
   */
  readonly selectedSiteCallState: CallState<FacilityOutput>;
  /**
   * Property openWorkCallState
   * @readonly
   *
   * @description
   * Authorized open-work state; denied and failed reads remain distinct from no work.
   *
   * @access public
   * @since unreleased
   *
   * @type {CallState<readonly EquipmentOpenWorkOutput[]>}
   */
  readonly openWorkCallState: CallState<readonly EquipmentOpenWorkOutput[]>;
}
/**
 * Constant initialState
 *
 * @description
 * Idle request state never claims that the server confirmed an empty collection.
 *
 * @since unreleased
 */
const initialState: ServiceRequestTargetState = {
  equipmentQuery: null,
  equipmentCallState: idleCallState(),
  equipmentTotal: 0,
  selectedEquipmentCallState: idleCallState(),
  siteQuery: null,
  siteCallState: idleCallState(),
  siteTotal: 0,
  selectedSiteCallState: idleCallState(),
  openWorkCallState: idleCallState(),
};
/**
 * Constant ServiceRequestTargetStore
 *
 * @description
 * Reads Equipment and Facility public projections without taking over their lifecycle or
 * persistence.
 *
 * @since unreleased
 */
export const ServiceRequestTargetStore = signalStore(
  withState<ServiceRequestTargetState>(initialState),
  withEntities({ entity: type<EquipmentOutput>(), collection: 'equipment' }),
  withEntities({ entity: type<FacilityOutput>(), collection: 'site' }),
  withComputed((store) => ({
    equipmentPageCount: computed(() => Math.max(1, Math.ceil(store.equipmentTotal() / 30))),
    sitePageCount: computed(() => Math.max(1, Math.ceil(store.siteTotal() / 30))),
    siteOptions: computed(() => store.siteEntities().map(toFacilityOption)),
    selectedSiteOption: computed(() => {
      const site = store.selectedSiteCallState().data;
      return site ? toFacilityOption(site) : null;
    }),
  })),
  withMethods(
    (store, equipment = inject(EquipmentService), facilities = inject(FacilityService)) => ({
      loadEquipment: rxMethod<ServiceRequestTargetQuery | null>(
        pipe(
          switchMap((query) => {
            patchState(store, removeAllEntities({ collection: 'equipment' }), {
              equipmentQuery: query,
              equipmentTotal: 0,
              equipmentCallState: query ? pendingCallState() : idleCallState(),
            });
            if (!query) return EMPTY;
            const options: RequestOptions = {
              page: query.page ?? 1,
              itemsPerPage: 30,
              search: query.search,
              params: query.siteId ? { includeDescendants: true } : {},
            };
            return (
              query.siteId
                ? equipment.listByFacility(query.organizationId, query.siteId, options)
                : equipment.list(query.organizationId, options)
            ).pipe(
              tapResponse({
                next: (collection) =>
                  patchState(
                    store,
                    setAllEntities([...collection.member], { collection: 'equipment' }),
                    {
                      equipmentTotal: collection.totalItems,
                      equipmentCallState: successCallState(null),
                    },
                  ),
                error: (error: unknown) =>
                  patchState(store, { equipmentCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      loadSites: rxMethod<ServiceRequestTargetQuery | null>(
        pipe(
          switchMap((query) => {
            patchState(store, removeAllEntities({ collection: 'site' }), {
              siteQuery: query,
              siteTotal: 0,
              siteCallState: query ? pendingCallState() : idleCallState(),
            });
            if (!query) return EMPTY;
            return facilities
              .list(query.organizationId, {
                page: query.page ?? 1,
                itemsPerPage: 30,
                search: query.search,
                params: { rootsOnly: true },
              })
              .pipe(
                tapResponse({
                  next: (collection) =>
                    patchState(
                      store,
                      setAllEntities([...collection.member], { collection: 'site' }),
                      {
                        siteTotal: collection.totalItems,
                        siteCallState: successCallState(null),
                      },
                    ),
                  error: (error: unknown) =>
                    patchState(store, { siteCallState: errorCallState(toStoreError(error)) }),
                }),
              );
          }),
        ),
      ),
      readEquipment: rxMethod<{
        readonly organizationId: string;
        readonly equipmentId: string;
      } | null>(
        pipe(
          switchMap((query) => {
            patchState(store, {
              selectedEquipmentCallState: query ? pendingCallState() : idleCallState(),
            });
            if (!query) return EMPTY;
            return equipment.get(query.organizationId, query.equipmentId).pipe(
              tapResponse({
                next: (record) =>
                  patchState(store, { selectedEquipmentCallState: successCallState(record) }),
                error: (error: unknown) =>
                  patchState(store, {
                    selectedEquipmentCallState: errorCallState(toStoreError(error)),
                  }),
              }),
            );
          }),
        ),
      ),
      readSite: rxMethod<{ readonly organizationId: string; readonly siteId: string } | null>(
        pipe(
          switchMap((query) => {
            patchState(store, {
              selectedSiteCallState: query ? pendingCallState() : idleCallState(),
            });
            if (!query) return EMPTY;
            return facilities.get(query.organizationId, query.siteId).pipe(
              tapResponse({
                next: (record) =>
                  patchState(store, { selectedSiteCallState: successCallState(record) }),
                error: (error: unknown) =>
                  patchState(store, { selectedSiteCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
      loadOpenWork: rxMethod<{
        readonly organizationId: string;
        readonly equipmentId: string;
      } | null>(
        pipe(
          switchMap((query) => {
            patchState(store, { openWorkCallState: query ? pendingCallState() : idleCallState() });
            if (!query) return EMPTY;
            return equipment.openWork(query.organizationId, query.equipmentId).pipe(
              tapResponse({
                next: (collection) =>
                  patchState(store, { openWorkCallState: successCallState(collection.member) }),
                error: (error: unknown) =>
                  patchState(store, { openWorkCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
    }),
  ),
);
/**
 * Type ServiceRequestTargetStoreType
 *
 * @description
 * Target store instance contract consumed by internal request widgets.
 *
 * @since unreleased
 *
 * @type {ServiceRequestTargetStoreType}
 */
export type ServiceRequestTargetStoreType = InstanceType<typeof ServiceRequestTargetStore>;
