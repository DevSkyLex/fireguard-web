import { isPlatformBrowser } from '@angular/common';
import { computed, inject, PLATFORM_ID } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { entityConfig, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap } from 'rxjs';
import {
  errorCallState,
  idleCallState,
  pendingCallState,
  successCallState,
  toStoreError,
  type CallState,
} from '@core/request-state';
import { EquipmentTypeService } from '@features/organization/features/equipments/data-access';
import type { EquipmentTypeOutput } from '@features/organization/features/equipments/models';
import { equipmentTypeOption } from '@features/organization/features/equipments/utils';

/**
 * Constant TYPE_CONFIG
 *
 * @description
 * Server catalog identity is its stable value, rather than an equipment UUID.
 */
const TYPE_CONFIG = entityConfig({
  entity: {} as EquipmentTypeOutput,
  collection: 'equipmentType',
  selectId: (entry) => entry.value,
});

/**
 * Constant EquipmentTypeCatalogStore
 *
 * @description
 * Organization-scoped catalog source shared by equipment, site and onboarding pickers.
 * Each page provides its own instance; organization changes clear previously visible entries.
 */
export const EquipmentTypeCatalogStore = signalStore(
  withEntities(TYPE_CONFIG),
  withState({ organizationId: null as string | null, loadCallState: idleCallState() as CallState }),
  withComputed((store) => ({
    options: computed(() => store.equipmentTypeEntities().map(equipmentTypeOption)),
    activeOptions: computed(() =>
      store
        .equipmentTypeEntities()
        .filter((entry) => !entry.archived)
        .map(equipmentTypeOption),
    ),
  })),
  withMethods(
    (store, service = inject(EquipmentTypeService), platformId = inject(PLATFORM_ID)) => ({
      /**
       * Method load
       *
       * @description
       * Loads catalog entries without leaking an earlier organization's choices.
       */
      load: rxMethod<string | null>(
        pipe(
          switchMap((organizationId) => {
            if (organizationId === null) {
              patchState(store, setAllEntities([] as EquipmentTypeOutput[], TYPE_CONFIG), {
                organizationId: null,
                loadCallState: idleCallState(),
              });
              return EMPTY;
            }
            if (!isPlatformBrowser(platformId)) return EMPTY;
            if (store.organizationId() !== organizationId)
              patchState(store, setAllEntities([] as EquipmentTypeOutput[], TYPE_CONFIG));
            patchState(store, { organizationId, loadCallState: pendingCallState() });
            return service.listAll(organizationId).pipe(
              tapResponse({
                next: (entries) =>
                  patchState(store, setAllEntities([...entries], TYPE_CONFIG), {
                    loadCallState: successCallState(null),
                  }),
                error: (error: unknown) =>
                  patchState(store, { loadCallState: errorCallState(toStoreError(error)) }),
              }),
            );
          }),
        ),
      ),
    }),
  ),
  withMethods((store) => ({
    /**
     * Method clear
     *
     * @description
     * Cancels pending reads and removes catalog data when organization or access changes.
     */
    clear(): void {
      store.load(null);
    },
    /**
     * Method seed
     *
     * @description
     * Cancels pending reads before hydrating an actor-authorized organization snapshot.
     */
    seed(organizationId: string, entries: readonly EquipmentTypeOutput[]): void {
      store.load(null);
      patchState(store, setAllEntities([...entries], TYPE_CONFIG), {
        organizationId,
        loadCallState: successCallState(null),
      });
    },
  })),
);

/**
 * Type EquipmentTypeCatalogStoreType
 *
 * @description
 * Injectable instance of the catalog store.
 *
 * @type {EquipmentTypeCatalogStoreType}
 */
export type EquipmentTypeCatalogStoreType = InstanceType<typeof EquipmentTypeCatalogStore>;
