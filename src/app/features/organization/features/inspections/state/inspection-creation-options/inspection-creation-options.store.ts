import { isPlatformBrowser } from '@angular/common';
import { computed, effect, inject, PLATFORM_ID, untracked } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Dispatcher } from '@ngrx/signals/events';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import {
  errorCallState,
  idleCallState,
  isCallError,
  isCallPending,
  pendingCallState,
  successCallState,
  toStoreError,
  toStoreFailureEventPayload,
  type StoreError,
} from '@core/request-state';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { ChecklistService } from '@features/organization/features/checklists/data-access';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { EQUIPMENT_TYPE_OPTIONS } from '@features/organization/features/equipments';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type { EquipmentSelectOption } from '@features/organization/features/inspections/models';
import { inspectionCreationOptionsStoreEvents } from './events';
import type { InspectionCreationOptionsState } from './models';

//#region Initial State
/**
 * Constant INITIAL_INSPECTION_CREATION_OPTIONS_STATE
 *
 * @description
 * Initial state for the InspectionCreationOptionsStore: no options loaded,
 * load idle.
 *
 * @since 1.0.0
 */
const INITIAL_INSPECTION_CREATION_OPTIONS_STATE: InspectionCreationOptionsState = {
  organizationId: null,
  equipmentPage: 1,
  equipmentTotal: 0,
  equipmentSearch: '',
  checklists: [],
  checklistPage: 1,
  checklistTotal: 0,
  checklistSearch: '',
  checklistCallState: idleCallState(),
  equipmentOptions: [],
  loadCallState: idleCallState(),
};
//#endregion

/**
 * Constant CREATION_OPTION_PAGE_SIZE
 *
 * @description
 * Equipment records per server page in the creation selector. Further pages
 * remain available through the server total; this is not an organization cap.
 *
 * @since 1.0.0
 *
 * @type {number}
 */
const CREATION_OPTION_PAGE_SIZE: number = 100;

/**
 * Constant CHECKLIST_OPTION_PAGE_SIZE
 *
 * @description
 * Active checklist records per server page, matching the API's maximum of 100.
 * The server total keeps every further page accessible.
 *
 * @since unreleased
 *
 * @type {number}
 */
const CHECKLIST_OPTION_PAGE_SIZE: number = 100;

/**
 * Constant InspectionCreationOptionsStore
 *
 * @description
 * Component-scoped NgRx SignalStore that loads the organization's equipment
 * into the `EquipmentSelectOption` list `InspectionCreateForm`'s combobox
 * offers — serial number first, localized type, then location and facility;
 * the raw type key and the id never reach the template.
 * `CreateInspectionInput.equipmentId` is required and this feature owns no
 * equipment data of its own, so the create page provides this store and
 * reads `EquipmentService` through its cross-feature `data-access` barrel —
 * the same pattern `InterventionPlanningOptionsStore` already established
 * for the equivalent site/member pickers.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @const InspectionCreationOptionsStore
 */
export const InspectionCreationOptionsStore = signalStore(
  withState<InspectionCreationOptionsState>(INITIAL_INSPECTION_CREATION_OPTIONS_STATE),
  withComputed((store) => ({
    /**
     * Property equipmentPageCount
     *
     * @description
     * Number of server equipment pages for the current search.
     */
    equipmentPageCount: computed(() => Math.max(1, Math.ceil(store.equipmentTotal() / 100))),
    /**
     * Property checklistPageCount
     *
     * @description
     * Number of server active checklist pages for the current search.
     */
    checklistPageCount: computed(() =>
      Math.max(1, Math.ceil(store.checklistTotal() / CHECKLIST_OPTION_PAGE_SIZE)),
    ),
    /**
     * @description
     * True while the equipment options are loading.
     */
    loading: computed<boolean>(() => isCallPending(store.loadCallState())),

    /**
     * @description
     * Normalized error of the last load when it failed, otherwise `null`.
     */
    loadError: computed<StoreError | null>(() => {
      const state = store.loadCallState();

      return isCallError(state) ? state.error : null;
    }),
  })),
  withMethods(
    (
      store,
      dispatcher: Dispatcher = inject<Dispatcher>(Dispatcher),
      equipment: EquipmentService = inject<EquipmentService>(EquipmentService),
      checklists: ChecklistService = inject(ChecklistService),
      platformId: object = inject(PLATFORM_ID),
      authSession = inject(AUTH_SESSION_PORT),
    ) => {
      const cancellation = new Subject<void>();
      let sessionRevision = authSession.sessionRevision();
      const clear = (): void => {
        cancellation.next();
        patchState(store, INITIAL_INSPECTION_CREATION_OPTIONS_STATE);
      };
      const synchronizeSession = (): void => {
        if (sessionRevision !== authSession.sessionRevision() || !authSession.isAuthenticated()) {
          sessionRevision = authSession.sessionRevision();
          clear();
        }
      };
      const scope = (organizationId: string): void => {
        if (store.organizationId() === organizationId) return;
        cancellation.next();
        patchState(store, { ...INITIAL_INSPECTION_CREATION_OPTIONS_STATE, organizationId });
      };
      const loadChecklists = rxMethod<{ organizationId: string; search?: string; page?: number }>(
        switchMap(({ organizationId, search = '', page = 1 }) => {
          synchronizeSession();
          if (!isPlatformBrowser(platformId) || !authSession.isAuthenticated()) return EMPTY;
          scope(organizationId);
          patchState(store, {
            checklistPage: page,
            checklistSearch: search,
            checklistCallState: pendingCallState(),
          });
          return checklists
            .list(organizationId, {
              status: 'active',
              page,
              itemsPerPage: CHECKLIST_OPTION_PAGE_SIZE,
              ...(search ? { search } : {}),
            })
            .pipe(
              takeUntil(cancellation),
              tapResponse({
                next: (response: HydraCollection<ChecklistOutput>): void =>
                  patchState(store, {
                    checklists: response.member,
                    checklistTotal: response.totalItems,
                    checklistCallState: successCallState(null),
                  }),
                error: (error: unknown): void =>
                  patchState(store, { checklistCallState: errorCallState(toStoreError(error)) }),
              }),
            );
        }),
      );
      const searchChecklists = rxMethod<{ organizationId: string; search: string }>(
        switchMap((query) =>
          timer(300).pipe(
            takeUntil(cancellation),
            tap(() => loadChecklists(query)),
          ),
        ),
      );
      const loadEquipmentOptions = rxMethod<
        string | { organizationId: string; search?: string; page?: number }
      >(
        pipe(
          switchMap((input) => {
            synchronizeSession();
            if (!isPlatformBrowser(platformId) || !authSession.isAuthenticated()) return EMPTY;
            const {
              organizationId,
              search = '',
              page = 1,
            } = typeof input === 'string' ? { organizationId: input } : input;
            scope(organizationId);
            patchState(store, {
              equipmentPage: page,
              equipmentSearch: search,
              loadCallState: pendingCallState(),
            });
            return equipment
              .list(organizationId, {
                page,
                itemsPerPage: CREATION_OPTION_PAGE_SIZE,
                ...(search ? { search } : {}),
              })
              .pipe(
                takeUntil(cancellation),
                tapResponse({
                  next: (response: HydraCollection<EquipmentOutput>): void => {
                    const options: readonly EquipmentSelectOption[] = response.member.map(
                      (item): EquipmentSelectOption => {
                        const typeLabel =
                          EQUIPMENT_TYPE_OPTIONS.find((option) => option.value === item.type)
                            ?.label ?? item.type.replaceAll('_', ' ');
                        const secondary = [item.locationLabel, item.facilityName]
                          .filter((part): part is string => !!part)
                          .join(' · ');
                        return {
                          label: item.serialNumber || typeLabel,
                          value: item.id,
                          typeLabel,
                          secondary: secondary || null,
                        };
                      },
                    );
                    patchState(store, {
                      equipmentOptions: options,
                      equipmentTotal: response.totalItems,
                      loadCallState: successCallState(null),
                    });
                  },
                  error: (error: unknown): void => {
                    const storeError = toStoreError(error);
                    patchState(store, { loadCallState: errorCallState(storeError) });
                    dispatcher.dispatch(
                      inspectionCreationOptionsStoreEvents.loadFailed(
                        toStoreFailureEventPayload(storeError, 'Failed to load equipment options'),
                      ),
                    );
                  },
                }),
              );
          }),
        ),
      );
      const searchEquipment = rxMethod<{ organizationId: string; search: string }>(
        switchMap((query) =>
          timer(300).pipe(
            takeUntil(cancellation),
            tap(() => loadEquipmentOptions(query)),
          ),
        ),
      );
      return {
        loadEquipmentOptions,
        loadChecklists,
        searchEquipment,
        searchChecklists,
        synchronizeSession,
        /**
         * Method clear
         * @method clear
         *
         * @description
         * Cancels obsolete option reads when organization context or the owning page changes.
         *
         * @returns {void}
         */
        clear,
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
 * Type InspectionCreationOptionsStore
 *
 * @description
 * Instance type of the {@link InspectionCreationOptionsStore} signal store.
 *
 * @since 1.0.0
 *
 * @type InspectionCreationOptionsStore
 */
export type InspectionCreationOptionsStore = InstanceType<typeof InspectionCreationOptionsStore>;
